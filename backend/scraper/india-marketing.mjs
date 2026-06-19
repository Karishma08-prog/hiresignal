#!/usr/bin/env node
/**
 * india-marketing.mjs — Batch scrape: senior MARKETING roles in INDIA, last ~30 days.
 *
 * Runs several search phrases across the boards that apply to India marketing
 * leadership (LinkedIn + Naukri via ever-jobs; Indeed via Botasaurus), then
 * merges, dedupes, and filters to marketing-leadership titles in India posted in
 * the window. Outputs one CSV + an on-screen "who is hiring" summary.
 *
 * Run:  node india-marketing.mjs
 */
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const EVER_JOBS_DIR = join(HERE, 'ever-jobs');
const RESULTS_DIR = join(HERE, 'results');
const BOTA_SCRIPT = join(HERE, 'bota_scraper.py');

// ── Search parameters ────────────────────────────────────────────
const COUNTRY = 'INDIA';
const LOCATION = 'India';
const DAYS = 30;
const HOURS_OLD = DAYS * 24;
const RESULTS_PER = 40;            // per board, per search term

// Default proxy is used for the ever-jobs HTTP boards only.
const PROXY = process.env.JOBS_PROXY !== undefined
  ? process.env.JOBS_PROXY
  : '';

// 8 phrases that, with the title filter below, cover all 22 requested titles.
const TERMS = [
  'Head of Marketing',
  'VP Marketing',
  'Chief Marketing Officer',
  'Director of Marketing',
  'Marketing Manager',
  'Head of Growth',
  'Demand Generation',
  'Product Marketing',
];
// All keyless, non-Playwright boards that can carry India or global marketing
// leadership roles. ever-jobs hits them all in parallel per term, so a broad
// list is cheap. Non-India-native boards are kept only for India/remote rows
// (see INDIA_HINT filter below).
const EVER_BOARDS = [
  // India-native / India-strong
  'linkedin', 'naukri', 'jobsdb',
  // Global general / remote (have marketing roles)
  'remotive', 'weworkremotely', 'himalayas', 'arbeitnow', 'workingnomads',
  'themuse', 'builtin', 'landingjobs', 'virtualvocations', 'powertofly',
  'freelancercom', 'realworkfromanywhere', 'remotefirstjobs', 'jobspresso',
  'nodesk', 'fourdayweek', 'startupjobs', 'getonboard',
];
// Indeed (Botasaurus) is slower / sometimes throttled, so only a few broad terms.
const BOTA_BOARDS = ['indeed'];
const BOTA_TERMS = ['Head of Marketing', 'Marketing Manager', 'Chief Marketing Officer'];

// ── Title relevance: matches all 22 requested roles ──────────────
const FUNC = /(marketing|growth|demand gen|demand generation|product marketing|brand|performance marketing|revenue marketing|marketing operations|martech)/i;
const SENIOR = /(head|chief|cmo|\bvp\b|vice president|director|lead|principal|manager|general manager|\bgm\b)/i;
function titleMatches(t) {
  t = t || '';
  if (/\bcmo\b/i.test(t)) return true;
  return FUNC.test(t) && SENIOR.test(t);
}

const INDIA_HINT = /(india|bengaluru|bangalore|mumbai|delhi|gurgaon|gurugram|hyderabad|pune|chennai|noida|kolkata|ahmedabad|jaipur|remote)/i;

// ── helpers ──────────────────────────────────────────────────────
const CSV_HEADER = ['id', 'site', 'title', 'companyName', 'location', 'jobUrl', 'datePosted',
  'jobType', 'isRemote', 'minAmount', 'maxAmount', 'currency', 'interval', 'description'];

function runEverJobs(payload, outCsv) {
  return new Promise((resolve) => {
    const cmd = `node cli-run.cjs search --stdin -f csv -o "${outCsv}"`;
    const child = spawn(cmd, { cwd: EVER_JOBS_DIR, shell: true, stdio: ['pipe', 'ignore', 'ignore'] });
    child.on('error', () => resolve());
    child.on('close', () => resolve());
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

function findPython() {
  const cands = [process.env.JOBS_PYTHON, 'py', 'python', 'python3',
    join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe')].filter(Boolean);
  for (const c of cands) {
    try { execFileSync(c, ['-c', 'import botasaurus'], { stdio: 'ignore', timeout: 20000 }); return c; }
    catch { /* next */ }
  }
  return null;
}

function runBota(py, cfg) {
  return new Promise((resolve) => {
    const cfgPath = join(RESULTS_DIR, `.bota_${Date.now()}.json`);
    writeFileSync(cfgPath, JSON.stringify(cfg), 'utf8');
    const child = spawn(py, [BOTA_SCRIPT, cfgPath], { cwd: HERE, stdio: ['ignore', 'inherit', 'inherit'] });
    const t = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /**/ } }, (cfg.budgetSec + 30) * 1000);
    child.on('error', () => { clearTimeout(t); resolve(); });
    child.on('close', () => { clearTimeout(t); try { unlinkSync(cfgPath); } catch { /**/ } resolve(); });
  });
}

function parseCsv(text) {
  const rows = []; let f = '', row = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\r') { /**/ }
    else if (c === '\n') { row.push(f); rows.push(row); f = ''; row = []; }
    else f += c;
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  return rows;
}
function loadRows(path) {
  if (!existsSync(path)) return [];
  const arr = parseCsv(readFileSync(path, 'utf8'));
  if (arr.length < 2) return [];
  const h = arr[0];
  return arr.slice(1).filter((r) => r.length > 1).map((r) => { const o = {}; h.forEach((k, i) => o[k] = r[i] ?? ''); return o; });
}
function esc(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }

function recentEnough(dateStr) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d)) return true;
  return (Date.now() - d.getTime()) / 86400000 <= DAYS + 3;
}

async function main() {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const finalCsv = join(RESULTS_DIR, `jobs_india_marketing_${stamp}.csv`);
  const partials = [];
  const py = findPython();

  console.log('============================================================');
  console.log('  India — Senior Marketing Roles — last ' + DAYS + ' days');
  console.log('  ever-jobs boards: ' + EVER_BOARDS.join(', ') + (PROXY ? ' (proxy on)' : ''));
  console.log('  Botasaurus boards: ' + (py ? BOTA_BOARDS.join(', ') : 'SKIPPED (no Python/Botasaurus)'));
  console.log('  Search phrases: ' + TERMS.length);
  console.log('============================================================\n');

  for (const term of TERMS) {
    console.log(`> ever-jobs: "${term}" on ${EVER_BOARDS.join(', ')} ...`);
    const out = join(RESULTS_DIR, `.p_ever_${TERMS.indexOf(term)}.csv`);
    await runEverJobs({
      searchTerm: term, country: COUNTRY, location: LOCATION, hoursOld: HOURS_OLD,
      resultsWanted: RESULTS_PER, isRemote: false, siteType: EVER_BOARDS,
      // Fetch full LinkedIn job descriptions (one extra request per job; slower).
      linkedinFetchDescription: true,
      proxies: PROXY ? [PROXY] : undefined,
    }, out);
    if (existsSync(out)) { partials.push(out); console.log(`   -> ${loadRows(out).length} raw rows`); }
  }

  if (py) {
    for (const term of BOTA_TERMS) {
      console.log(`\n> Botasaurus indeed (in.indeed.com): "${term}" ...`);
      const out = join(RESULTS_DIR, `.p_bota_${BOTA_TERMS.indexOf(term)}.csv`);
      await runBota(py, {
        searchTerm: term, country: COUNTRY, location: LOCATION, days: DAYS,
        resultsWanted: RESULTS_PER, sites: BOTA_BOARDS, outputCsv: out,
        headless: true, budgetSec: 90,
      });
      if (existsSync(out)) { partials.push(out); console.log(`   -> ${loadRows(out).length} raw rows`); }
    }
  }

  // Merge → dedupe → filter (title + India + recency)
  const seen = new Set();
  const kept = [];
  let total = 0;
  for (const p of partials) {
    for (const r of loadRows(p)) {
      total++;
      const key = (r.jobUrl || r.id || `${r.title}|${r.companyName}`).trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (!titleMatches(r.title)) continue;
      const indiaBoard = ['linkedin', 'naukri', 'indeed'].includes(r.site);
      if (!indiaBoard && !INDIA_HINT.test(r.location || '')) continue;
      if (!recentEnough(r.datePosted)) continue;
      kept.push(r);
    }
  }

  const lines = [CSV_HEADER.join(',')];
  for (const r of kept) lines.push(CSV_HEADER.map((h) => esc(r[h])).join(','));
  writeFileSync(finalCsv, lines.join('\n'), 'utf8');
  for (const p of partials) { try { unlinkSync(p); } catch { /**/ } }

  // Summary
  const bySite = {}, byCompany = {};
  for (const r of kept) {
    bySite[r.site] = (bySite[r.site] || 0) + 1;
    if (r.companyName) byCompany[r.companyName] = (byCompany[r.companyName] || 0) + 1;
  }
  console.log('\n============================================================');
  console.log(`  MATCHED ${kept.length} marketing-leadership posts (from ${total} raw, ${seen.size} unique)`);
  console.log('============================================================');
  console.log('--- By board ---');
  Object.entries(bySite).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`  ${s}: ${n}`));
  console.log('--- Companies hiring (top 25) ---');
  Object.entries(byCompany).sort((a, b) => b[1] - a[1]).slice(0, 25)
    .forEach(([c, n]) => console.log(`  ${c}: ${n}`));
  console.log(`\nCSV saved to: ${finalCsv}`);
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
