/**
 * ats-enrich.cjs — Reuse ever-jobs' built-in ATS scrapers to enrich the company
 * slugs found by the Scrappa dork sweep into full job rows.
 *
 * Boots the Nest DI context ONCE (via CliModule), then loops over each unique
 * (ats, companySlug) pair calling the real JobsService.searchJobs — so we use the
 * existing Greenhouse/Lever/Ashby/SmartRecruiters/Jobvite/Workable scrapers
 * (structured API, full description, location, date). Then filters to:
 *   - marketing-leadership titles (the 22 requested roles)
 *   - jobs located in India
 *   - has a description
 *
 * Usage:  node ats-enrich.cjs --in <ats_dork.csv> --out <enriched.csv>
 */
const path = require('path');
process.env.TS_NODE_TRANSPILE_ONLY = 'true';
process.env.TS_NODE_PROJECT = path.join(__dirname, 'tsconfig.base.json');
require('ts-node/register');
require('tsconfig-paths/register');

const fs = require('fs');
const { NestFactory } = require('@nestjs/core');
const { CliModule } = require('./apps/cli/src/cli.module');
const { JobsService } = require('./apps/api/src/jobs/jobs.service');
const { ScraperInputDto } = require('@ever-jobs/models');

// ── filters ──────────────────────────────────────────────────────
const FUNC = /(marketing|growth|demand gen|demand generation|product marketing|brand|performance marketing|revenue marketing|marketing operations|martech)/i;
const SENIOR = /(head|chief|cmo|\bvp\b|vice president|director|lead|principal|manager|general manager)/i;
function titleMatches(t) {
  t = t || '';
  if (/\bcmo\b/i.test(t)) return true;
  return FUNC.test(t) && SENIOR.test(t);
}
const INDIA = /\b(india|bengaluru|bangalore|mumbai|delhi|new delhi|gurgaon|gurugram|hyderabad|pune|chennai|noida|kolkata|ahmedabad|jaipur|kochi|coimbatore|indore|chandigarh|thiruvananthapuram|trivandrum)\b/i;

// Workday needs a tenant:wd:site triple, built from the URL (see workdayTriple).
const SUPPORTED = new Set(['greenhouse', 'lever', 'ashby', 'smartrecruiters', 'jobvite', 'workable', 'workday']);

// Build Workday's "{company}:{wd_number}:{site}" slug from a Workday job URL:
//   https://{company}.wd{n}.myworkdayjobs.com/{locale}/{site}/job/...
function workdayTriple(u) {
  try {
    const url = new URL(u);
    const labels = url.hostname.split('.');
    const company = labels[0];
    const wdn = (labels[1] || '').replace(/\D/g, '') || '5';
    const segs = url.pathname.split('/').filter(Boolean)
      .filter((s) => !/^[a-z]{2}[-_][A-Z]{2}$/.test(s)); // drop locale like en-US
    let site = 'External';
    const ji = segs.findIndex((s) => ['job', 'details'].includes(s.toLowerCase()));
    if (ji > 0) site = segs[ji - 1];
    else if (segs.length) site = segs[0];
    return company ? `${company}:${wdn}:${site}` : '';
  } catch { return ''; }
}

const CSV_HEADER = ['id', 'site', 'title', 'companyName', 'location', 'jobUrl', 'datePosted',
  'jobType', 'isRemote', 'minAmount', 'maxAmount', 'currency', 'interval', 'description'];

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
function esc(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

// Normalize a date that may be ISO or a relative string ("Posted 5 Days Ago").
function normDate(d) {
  if (!d) return '';
  d = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const low = d.toLowerCase();
  const today = new Date();
  const iso = (x) => x.toISOString().slice(0, 10);
  const back = (n) => { const t = new Date(today); t.setDate(t.getDate() - n); return iso(t); };
  if (/today|just|hour|^posted today/.test(low)) return iso(today);
  if (/yesterday/.test(low)) return back(1);
  let m = low.match(/(\d+)\+?\s*day/); if (m) return back(+m[1]);
  m = low.match(/(\d+)\+?\s*week/); if (m) return back(7 * +m[1]);
  m = low.match(/(\d+)\+?\s*month/); if (m) return back(30 * +m[1]);
  return '';
}

function locStr(loc) {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  return [loc.city, loc.state, loc.country].filter(Boolean).join(', ');
}

async function main() {
  const inCsv = arg('--in');
  const outCsv = arg('--out');
  const only = arg('--only'); // optional: limit to one ATS (e.g. "workday")
  if (!inCsv || !outCsv) { console.error('need --in and --out'); process.exit(1); }

  // Read dork CSV → unique (ats, slug) pairs
  const arr = parseCsv(fs.readFileSync(inCsv, 'utf8'));
  const header = arr[0];
  const idx = (k) => header.indexOf(k);
  const pairs = new Map();
  for (const r of arr.slice(1)) {
    const ats = (r[idx('ats')] || '').trim();
    if (only && ats !== only) continue;
    const slug = ats === 'workday'
      ? workdayTriple((r[idx('jobUrl')] || '').trim())
      : (r[idx('companySlug')] || '').trim();
    if (!SUPPORTED.has(ats) || !slug) continue;
    pairs.set(`${ats}:${slug}`, { ats, slug });
  }
  const list = [...pairs.values()];
  console.log(`Booting ever-jobs… will scrape ${list.length} company boards via built-in ATS scrapers.`);

  const app = await NestFactory.createApplicationContext(CliModule, { logger: ['error'] });
  const jobs = app.get(JobsService);

  const seen = new Set();
  const kept = [];
  let done = 0;
  for (const { ats, slug } of list) {
    done++;
    let results = [];
    try {
      const input = new ScraperInputDto({
        siteType: [ats],
        companySlug: slug,
        country: 'INDIA',
        location: 'India',
        resultsWanted: ats === 'workday' ? 60 : 200,
        requestTimeout: 15,          // bound each HTTP call so a slow board can't stall the loop
        descriptionFormat: 'plain',
      });
      results = await jobs.searchJobs(input);
    } catch (e) {
      // bad/closed board — skip
    }
    let matched = 0;
    for (const j of results) {
      const loc = locStr(j.location);
      if (!titleMatches(j.title)) continue;
      const inIndia = INDIA.test(loc) || INDIA.test(j.description || '');
      if (!inIndia) continue;
      // Workday's list API has no description (only detail pages do), so don't
      // require one for Workday; every other ATS returns full descriptions.
      if (ats !== 'workday' && (!j.description || !j.description.trim())) continue;
      const key = (j.jobUrl || j.id || `${j.title}|${slug}`).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      kept.push({
        id: j.id || `${ats}-${slug}`,
        site: `${ats}:${slug}`,
        title: j.title || '',
        companyName: j.companyName || slug,
        location: loc,
        jobUrl: j.jobUrl || '',
        datePosted: normDate(j.datePosted),
        jobType: Array.isArray(j.jobType) ? j.jobType.join('; ') : (j.jobType || ''),
        isRemote: j.isRemote ? 'true' : 'false',
        minAmount: j.compensation?.minAmount ?? '',
        maxAmount: j.compensation?.maxAmount ?? '',
        currency: j.compensation?.currency ?? '',
        interval: j.compensation?.interval ?? '',
        description: (j.description || '').replace(/\s+/g, ' ').trim().slice(0, 6000),
      });
      matched++;
    }
    if (matched) console.log(`  [${done}/${list.length}] ${ats}:${slug} -> ${results.length} jobs, ${matched} India marketing`);
  }

  await app.close();

  const lines = [CSV_HEADER.join(',')];
  for (const r of kept) lines.push(CSV_HEADER.map((h) => esc(r[h])).join(','));
  fs.writeFileSync(outCsv, lines.join('\n'), 'utf8');

  const byCompany = {};
  for (const r of kept) byCompany[r.companyName] = (byCompany[r.companyName] || 0) + 1;
  console.log(`\n==== ${kept.length} India marketing-leadership ATS jobs (with descriptions) ====`);
  Object.entries(byCompany).sort((a, b) => b[1] - a[1]).slice(0, 25)
    .forEach(([c, n]) => console.log(`  ${c}: ${n}`));
  console.log(`\nCSV saved to: ${outCsv}`);
  process.exit(0);
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
