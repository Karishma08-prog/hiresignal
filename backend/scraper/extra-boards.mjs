#!/usr/bin/env node
/**
 * extra-boards.mjs — Scrape the boards not covered by the first India run:
 *   - Naukri  (Botasaurus stealth browser; HTTP path is 406-blocked)
 *   - Playwright boards via ever-jobs: simplyhired, wellfound, monster, dice,
 *     stepstone, careerbuilder
 * Filters to marketing-leadership titles in India, writes results/extra_boards_*.csv
 */
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const EVER_JOBS_DIR = join(HERE, 'ever-jobs');
const RESULTS_DIR = join(HERE, 'results');
const BOTA_SCRIPT = join(HERE, 'bota_scraper.py');

const DAYS = 30, HOURS_OLD = DAYS * 24, RESULTS_PER = 40;
const TERMS = ['Head of Marketing', 'VP Marketing', 'Chief Marketing Officer',
  'Director of Marketing', 'Marketing Manager', 'Head of Growth',
  'Demand Generation', 'Product Marketing'];
const PLAYWRIGHT_BOARDS = ['simplyhired', 'wellfound', 'monster', 'dice', 'stepstone', 'careerbuilder'];
const NAUKRI_TERMS = TERMS; // naukri URL is keyword-specific, so run each

const FUNC = /(marketing|growth|demand gen|demand generation|product marketing|brand|performance marketing|revenue marketing|marketing operations|martech)/i;
const SENIOR = /(head|chief|cmo|\bvp\b|vice president|director|lead|principal|manager|general manager)/i;
const INDIA = /\b(india|bengaluru|bangalore|mumbai|delhi|new delhi|gurgaon|gurugram|hyderabad|pune|chennai|noida|kolkata|ahmedabad|jaipur|kochi|coimbatore|indore|chandigarh)\b/i;
function titleMatches(t) { t = t || ''; if (/\bcmo\b/i.test(t)) return true; return FUNC.test(t) && SENIOR.test(t); }

const CSV_HEADER = ['id', 'site', 'title', 'companyName', 'location', 'jobUrl', 'datePosted',
  'jobType', 'isRemote', 'minAmount', 'maxAmount', 'currency', 'interval', 'description'];

function runEverJobs(payload, outCsv) {
  return new Promise((resolve) => {
    const cmd = `node cli-run.cjs search --stdin -f csv -o "${outCsv}"`;
    const c = spawn(cmd, { cwd: EVER_JOBS_DIR, shell: true, stdio: ['pipe', 'ignore', 'ignore'] });
    c.on('error', () => resolve()); c.on('close', () => resolve());
    c.stdin.write(JSON.stringify(payload)); c.stdin.end();
  });
}
function findPython() {
  const cands = [process.env.JOBS_PYTHON, 'py', 'python', 'python3',
    join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe')].filter(Boolean);
  for (const c of cands) { try { execFileSync(c, ['-c', 'import botasaurus'], { stdio: 'ignore', timeout: 20000 }); return c; } catch { /**/ } }
  return null;
}
function runBota(py, cfg) {
  return new Promise((resolve) => {
    const p = join(RESULTS_DIR, `.bn_${Date.now()}.json`);
    writeFileSync(p, JSON.stringify(cfg), 'utf8');
    const c = spawn(py, [BOTA_SCRIPT, p], { cwd: HERE, stdio: ['ignore', 'inherit', 'inherit'] });
    const t = setTimeout(() => { try { c.kill('SIGKILL'); } catch { /**/ } }, (cfg.budgetSec + 30) * 1000);
    c.on('error', () => { clearTimeout(t); resolve(); });
    c.on('close', () => { clearTimeout(t); try { unlinkSync(p); } catch { /**/ } resolve(); });
  });
}
function parseCsv(text) {
  const rows = []; let f = '', row = [], q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\r') {} else if (c === '\n') { row.push(f); rows.push(row); f = ''; row = []; } else f += c; }
  if (f.length || row.length) { row.push(f); rows.push(row); } return rows;
}
function loadRows(p) { if (!existsSync(p)) return []; const a = parseCsv(readFileSync(p, 'utf8')); if (a.length < 2) return [];
  const h = a[0]; return a.slice(1).filter((r) => r.length > 1).map((r) => { const o = {}; h.forEach((k, i) => o[k] = r[i] ?? ''); return o; }); }
function esc(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }

async function main() {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outCsv = join(RESULTS_DIR, `extra_boards_${stamp}.csv`);
  const partials = [];
  const py = findPython();

  console.log('=== Extra boards: Playwright (' + PLAYWRIGHT_BOARDS.join(',') + ') + Naukri ===\n');

  for (const term of TERMS) {
    const out = join(RESULTS_DIR, `.pw_${TERMS.indexOf(term)}.csv`);
    console.log(`> playwright boards: "${term}"`);
    await runEverJobs({ searchTerm: term, country: 'INDIA', location: 'India', hoursOld: HOURS_OLD,
      resultsWanted: RESULTS_PER, isRemote: false, siteType: PLAYWRIGHT_BOARDS }, out);
    if (existsSync(out)) { partials.push(out); console.log(`   -> ${loadRows(out).length} raw`); }
  }

  if (py) {
    for (const term of NAUKRI_TERMS) {
      const out = join(RESULTS_DIR, `.nk_${NAUKRI_TERMS.indexOf(term)}.csv`);
      console.log(`\n> naukri (Botasaurus): "${term}"`);
      await runBota(py, { searchTerm: term, country: 'INDIA', location: 'India', days: DAYS,
        resultsWanted: RESULTS_PER, sites: ['naukri'], outputCsv: out, headless: true, budgetSec: 90 });
      if (existsSync(out)) { partials.push(out); console.log(`   -> ${loadRows(out).length} raw`); }
    }
  } else {
    console.log('No Python/Botasaurus → skipping Naukri.');
  }

  const seen = new Set(); const kept = [];
  for (const p of partials) {
    for (const r of loadRows(p)) {
      const key = (r.jobUrl || r.id || `${r.title}|${r.companyName}`).trim().toLowerCase();
      if (seen.has(key)) continue; seen.add(key);
      if (!titleMatches(r.title)) continue;
      const indiaBoard = r.site === 'naukri';
      if (!indiaBoard && !INDIA.test(r.location || '')) continue;
      kept.push(r);
    }
  }
  const lines = [CSV_HEADER.join(',')];
  for (const r of kept) lines.push(CSV_HEADER.map((h) => esc(r[h])).join(','));
  writeFileSync(outCsv, lines.join('\n'), 'utf8');
  for (const p of partials) { try { unlinkSync(p); } catch { /**/ } }

  const bySite = {};
  for (const r of kept) bySite[r.site] = (bySite[r.site] || 0) + 1;
  console.log(`\n=== ${kept.length} extra India marketing jobs ===`);
  Object.entries(bySite).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`  ${s}: ${n}`));
  console.log(`\nCSV: ${outCsv}`);
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
