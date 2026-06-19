#!/usr/bin/env node
/**
 * find-jobs.mjs — Interactive job scraper wrapper around the ever-jobs CLI.
 *
 * Asks for ROLE, COUNTRY, and a TIMELINE (jobs posted in the last N days),
 * then runs ever-jobs across several job boards and saves the results to a
 * timestamped CSV (and JSON) in the ./results folder.
 *
 * Usage:  double-click "Find Jobs.bat", or run:  node find-jobs.mjs
 */

import { spawn, execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const EVER_JOBS_DIR = join(HERE, 'ever-jobs');
const RESULTS_DIR = join(HERE, 'results');

// ── Friendly country name -> ever-jobs Country enum code ───────────────────
// Derived from packages/models/src/enums/country.enum.ts (COUNTRY_CONFIG.names).
const COUNTRY_NAMES = {
  argentina: 'ARGENTINA', australia: 'AUSTRALIA', austria: 'AUSTRIA',
  bahrain: 'BAHRAIN', bangladesh: 'BANGLADESH', belgium: 'BELGIUM',
  bulgaria: 'BULGARIA', brazil: 'BRAZIL', canada: 'CANADA', chile: 'CHILE',
  china: 'CHINA', colombia: 'COLOMBIA', 'costa rica': 'COSTARICA',
  croatia: 'CROATIA', cyprus: 'CYPRUS', 'czech republic': 'CZECHREPUBLIC',
  czechia: 'CZECHREPUBLIC', denmark: 'DENMARK', ecuador: 'ECUADOR',
  egypt: 'EGYPT', estonia: 'ESTONIA', finland: 'FINLAND', france: 'FRANCE',
  germany: 'GERMANY', greece: 'GREECE', 'hong kong': 'HONGKONG',
  hungary: 'HUNGARY', india: 'INDIA', indonesia: 'INDONESIA',
  ireland: 'IRELAND', israel: 'ISRAEL', italy: 'ITALY', japan: 'JAPAN',
  kuwait: 'KUWAIT', latvia: 'LATVIA', lithuania: 'LITHUANIA',
  luxembourg: 'LUXEMBOURG', malaysia: 'MALAYSIA', malta: 'MALTA',
  mexico: 'MEXICO', morocco: 'MOROCCO', netherlands: 'NETHERLANDS',
  'new zealand': 'NEWZEALAND', nigeria: 'NIGERIA', norway: 'NORWAY',
  oman: 'OMAN', pakistan: 'PAKISTAN', panama: 'PANAMA', peru: 'PERU',
  philippines: 'PHILIPPINES', poland: 'POLAND', portugal: 'PORTUGAL',
  qatar: 'QATAR', romania: 'ROMANIA', 'saudi arabia': 'SAUDIARABIA',
  singapore: 'SINGAPORE', slovakia: 'SLOVAKIA', slovenia: 'SLOVENIA',
  'south africa': 'SOUTHAFRICA', 'south korea': 'SOUTHKOREA', spain: 'SPAIN',
  sweden: 'SWEDEN', switzerland: 'SWITZERLAND', taiwan: 'TAIWAN',
  thailand: 'THAILAND', turkey: 'TURKEY', 'türkiye': 'TURKEY',
  ukraine: 'UKRAINE', 'united arab emirates': 'UNITEDARABEMIRATES',
  uae: 'UNITEDARABEMIRATES', uk: 'UK', 'united kingdom': 'UK',
  usa: 'USA', us: 'USA', 'united states': 'USA', uruguay: 'URUGUAY',
  venezuela: 'VENEZUELA', vietnam: 'VIETNAM', worldwide: 'WORLDWIDE',
};

// Default boards. The first four are country-aware "majors" (best for "who is
// hiring in country X"); the rest are global boards with public APIs that
// reliably return data even when the majors are rate-limited/blocked.
// Note: Indeed & ZipRecruiter often return HTTP 403 from cloud/VPN IPs but
// usually work from a normal home connection.
const DEFAULT_SITES = [
  'linkedin', 'indeed', 'google',
  'remotive', 'arbeitnow', 'weworkremotely',
];

// Boards handled by the Botasaurus stealth-browser engine (they fingerprint-block
// plain HTTP). The rest go through ever-jobs. bota_scraper.py implements these.
const BOTA_SITES = new Set(['indeed', 'zip_recruiter', 'glassdoor']);
const BOTA_SCRIPT = join(HERE, 'bota_scraper.py');

// Rotating residential proxy (DataImpulse). Used by default to spread requests
// across IPs and avoid rate-limit bans on the sources that work (esp. LinkedIn).
// NOTE: this does NOT unblock Indeed/ZipRecruiter/Glassdoor — those reject the
// request by browser fingerprint / anti-bot, not by IP, so a clean residential
// IP alone is not enough. Override or disable by setting the JOBS_PROXY env var
// (set JOBS_PROXY="" to turn it off).
const PROXY = process.env.JOBS_PROXY !== undefined ? process.env.JOBS_PROXY : '';

function resolveCountry(raw) {
  const norm = raw.trim().toLowerCase();
  if (COUNTRY_NAMES[norm]) return COUNTRY_NAMES[norm];
  // Allow passing the enum code directly, e.g. "GERMANY".
  const upper = raw.trim().toUpperCase();
  if (Object.values(COUNTRY_NAMES).includes(upper)) return upper;
  return null;
}

function sanitize(s) {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'all';
}

async function main() {
  console.log('\n==================================================');
  console.log('  Job Scraper  (powered by ever-jobs)');
  console.log('==================================================\n');

  // Buffer stdin lines into a queue so prompts work for both interactive
  // typing AND bulk/piped input (avoids the readline/promises listener race).
  const rl = createInterface({ input, output });
  const queued = [];
  const waiters = [];
  let closed = false;
  rl.on('line', (line) => {
    if (waiters.length) waiters.shift()(line);
    else queued.push(line);
  });
  rl.on('close', () => {
    closed = true;
    while (waiters.length) waiters.shift()(null);
  });
  const nextLine = () => {
    if (queued.length) return Promise.resolve(queued.shift());
    if (closed) return Promise.resolve(null);
    return new Promise((res) => waiters.push(res));
  };
  const ask = async (q, def) => {
    output.write(def ? `${q} [${def}]: ` : `${q}: `);
    const line = await nextLine();
    const a = (line ?? '').trim();
    return a || def || '';
  };

  // 1) Role
  let role = '';
  while (!role) {
    role = await ask('Role / job title to search for (e.g. "data analyst")');
    if (!role) console.log('  -> Please enter a role.');
  }

  // 2) Country
  let country = null;
  let countryRaw = '';
  while (!country) {
    countryRaw = await ask('Country', 'USA');
    country = resolveCountry(countryRaw);
    if (!country) {
      console.log('  -> Unknown country. Examples: USA, UK, India, Germany, Canada, Australia, UAE...');
    }
  }

  // 3) Timeline (last N days)
  let days = 0;
  while (!(days > 0)) {
    const raw = await ask('Only jobs posted in the last how many DAYS?', '7');
    days = parseInt(raw, 10);
    if (!(days > 0)) console.log('  -> Enter a positive whole number of days.');
  }
  const hoursOld = days * 24;

  // 4) Optional refinements
  // The `country` field only routes Indeed/Glassdoor to the right domain;
  // LinkedIn/Google filter by `location`. So when no city is given we fall
  // back to the country name as the location, keeping results country-specific.
  const locationInput = await ask('City / area to focus on (optional, blank = whole country)', '');
  const location = locationInput || countryRaw;
  const resultsRaw = await ask('Max results PER job board', '25');
  const resultsWanted = parseInt(resultsRaw, 10) || 25;
  const remoteRaw = await ask('Remote jobs only? (y/n)', 'n');
  const isRemote = /^y/i.test(remoteRaw);
  const sitesRaw = await ask(
    `Job boards (space-separated)\n` +
      `    country-aware: linkedin indeed glassdoor google zip_recruiter bayt naukri bdjobs\n` +
      `    global (very reliable): remotive arbeitnow weworkremotely himalayas jobicy remoteok\n   `,
    DEFAULT_SITES.join(' '),
  );
  const siteType = sitesRaw.split(/[\s,]+/).filter(Boolean);

  let useProxy = false;
  if (PROXY) {
    const proxyRaw = await ask('Route requests through the residential proxy? (y/n)', 'y');
    useProxy = /^y/i.test(proxyRaw);
  }

  rl.close();

  // Build the ScraperInputDto JSON for ever-jobs `search --stdin`.
  const payload = {
    searchTerm: role,
    country,
    location: location || undefined,
    hoursOld,
    resultsWanted,
    isRemote,
    siteType,
    // Fetch full LinkedIn job descriptions (extra request per job; slower).
    linkedinFetchDescription: true,
    proxies: useProxy ? [PROXY] : undefined,
  };

  mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const base = `jobs_${sanitize(role)}_${country}_${stamp}`;
  const csvPath = join(RESULTS_DIR, `${base}.csv`);

  console.log('\n--------------------------------------------------');
  console.log(`  Role:     ${role}`);
  console.log(`  Country:  ${country}`);
  console.log(`  Posted:   last ${days} day(s)  (hoursOld=${hoursOld})`);
  if (location) console.log(`  Location: ${location}`);
  console.log(`  Remote:   ${isRemote ? 'yes' : 'no'}`);
  console.log(`  Proxy:    ${useProxy ? 'on (rotating residential)' : 'off'}`);
  console.log(`  Boards:   ${siteType.join(', ')}`);
  console.log(`  Per board:${resultsWanted}`);
  console.log(`  Output:   ${csvPath}`);
  console.log('--------------------------------------------------\n');
  console.log('Searching... (this can take a minute or two)\n');

  // Split the requested boards between the two engines:
  //  - Botasaurus (stealth browser, real IP) for the anti-bot boards.
  //  - ever-jobs (HTTP) for everything else.
  const everSites = siteType.filter((s) => !BOTA_SITES.has(s));
  const botaSites = siteType.filter((s) => BOTA_SITES.has(s));
  const partials = [];

  if (everSites.length) {
    console.log(`[1/2] ever-jobs boards: ${everSites.join(', ')}`);
    const everCsv = csvPath.replace(/\.csv$/, '_ever.csv');
    try {
      await runEverJobs({ ...payload, siteType: everSites }, everCsv);
      partials.push(everCsv);
    } catch (e) {
      console.log('   ever-jobs error:', e.message);
    }
  }

  if (botaSites.length) {
    console.log(`\n[2/2] Botasaurus boards (stealth browser, your real IP): ${botaSites.join(', ')}`);
    const py = findPython();
    if (!py) {
      console.log('   ! No Python with Botasaurus found. Set JOBS_PYTHON to your python.exe.');
      console.log('   ! Skipping indeed / zip_recruiter / glassdoor.');
    } else {
      const botaCsv = csvPath.replace(/\.csv$/, '_bota.csv');
      const cfg = {
        searchTerm: role, country, location, days, resultsWanted,
        sites: botaSites,
        // These sites flag proxy IPs; the real residential IP works best.
        // Opt back into a proxy with JOBS_BOTA_PROXY if you ever need to.
        proxy: process.env.JOBS_BOTA_PROXY || undefined,
        outputCsv: botaCsv, headless: true,
        budgetSec: 45 + botaSites.length * 40,
      };
      try {
        await runBota(py, cfg);
        if (existsSync(botaCsv)) partials.push(botaCsv);
      } catch (e) {
        console.log('   Botasaurus error:', e.message);
      }
    }
  }

  const rows = mergeCsvFiles(partials, csvPath);
  printSummary(rows);
  console.log('\nDone.');
  console.log(`CSV saved to: ${csvPath}`);
}

// ── ever-jobs engine ─────────────────────────────────────────────
function runEverJobs(payload, outCsv) {
  return new Promise((resolve, reject) => {
    // Everything user-supplied travels via stdin JSON; only the generated
    // output path (quoted) is interpolated into the command.
    const cmd = `node cli-run.cjs search --stdin -f csv -o "${outCsv}"`;
    const child = spawn(cmd, { cwd: EVER_JOBS_DIR, shell: true, stdio: ['pipe', 'inherit', 'inherit'] });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ever-jobs CLI exited with code ${code}`)));
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

// ── Botasaurus engine ────────────────────────────────────────────
function findPython() {
  const candidates = [
    process.env.JOBS_PYTHON,
    'py', 'python', 'python3',
    join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      execFileSync(c, ['-c', 'import botasaurus'], { stdio: 'ignore', timeout: 20000 });
      return c;
    } catch { /* try next */ }
  }
  return null;
}

function runBota(py, cfg) {
  return new Promise((resolve) => {
    const cfgPath = join(RESULTS_DIR, '.bota_config.json');
    writeFileSync(cfgPath, JSON.stringify(cfg), 'utf8');
    const child = spawn(py, [BOTA_SCRIPT, cfgPath], { cwd: HERE, stdio: ['ignore', 'inherit', 'inherit'] });
    // Hard safety net on top of the script's own watchdog.
    const killTimer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
    }, (cfg.budgetSec + 45) * 1000);
    child.on('error', (e) => { clearTimeout(killTimer); console.log('   python spawn error:', e.message); resolve(); });
    child.on('close', () => { clearTimeout(killTimer); resolve(); });
  });
}

// ── CSV merge + summary ──────────────────────────────────────────
const CSV_HEADER = [
  'id', 'site', 'title', 'companyName', 'location', 'jobUrl', 'datePosted',
  'jobType', 'isRemote', 'minAmount', 'maxAmount', 'currency', 'interval', 'description',
];

function parseCsv(text) {
  const rows = [];
  let field = '', row = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(field); rows.push(row); field = ''; row = []; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function loadRows(path) {
  if (!existsSync(path)) return [];
  const arr = parseCsv(readFileSync(path, 'utf8'));
  if (arr.length < 2) return [];
  const header = arr[0];
  return arr.slice(1).filter((r) => r.length > 1).map((r) => {
    const o = {};
    header.forEach((h, i) => { o[h] = r[i] ?? ''; });
    return o;
  });
}

function esc(v) {
  v = v == null ? '' : String(v);
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function mergeCsvFiles(paths, outPath) {
  const seen = new Set();
  const out = [];
  for (const p of paths) {
    for (const r of loadRows(p)) {
      const key = (r.jobUrl || r.id || `${r.title}|${r.companyName}`).trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
  }
  const lines = [CSV_HEADER.join(',')];
  for (const r of out) lines.push(CSV_HEADER.map((h) => esc(r[h])).join(','));
  writeFileSync(outPath, lines.join('\n'), 'utf8');
  for (const p of paths) if (p !== outPath) { try { unlinkSync(p); } catch { /* ignore */ } }
  return out;
}

function printSummary(rows) {
  console.log(`\n==================  ${rows.length} jobs found  ==================`);
  const bySite = {}, byCompany = {};
  for (const r of rows) {
    bySite[r.site] = (bySite[r.site] || 0) + 1;
    if (r.companyName) byCompany[r.companyName] = (byCompany[r.companyName] || 0) + 1;
  }
  console.log('--- By board ---');
  Object.entries(bySite).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`  ${s}: ${n}`));
  const top = Object.entries(byCompany).sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (top.length) {
    console.log('--- Top companies hiring ---');
    top.forEach(([c, n]) => console.log(`  ${c}: ${n} position(s)`));
  }
}

main().catch((err) => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
