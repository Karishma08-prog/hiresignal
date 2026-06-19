#!/usr/bin/env node
/**
 * scrappa_ats.mjs — Find India marketing-leadership roles on ATS job boards
 * (Greenhouse / Lever / Workday / Ashby / SmartRecruiters / Jobvite / Workable)
 * via Google dork queries through the Scrappa Google Search API.
 *
 * No company-slug guessing: the dorks surface real job-post URLs, and we extract
 * the companySlug from each URL. Output: results/ats_marketing_india_<stamp>.csv
 *
 * Run:  node scrappa_ats.mjs       (designed to run in the background)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(HERE, 'results');

const TOKEN = process.env.SCRAPPA_TOKEN || '';

// Marketing-leadership title clause (covers the 22 requested titles).
const TITLES_OR =
  '("Head of Marketing" OR "VP Marketing" OR "Chief Marketing Officer" OR CMO OR ' +
  '"Director of Marketing" OR "Marketing Manager" OR "Head of Growth" OR ' +
  '"Demand Generation" OR "Product Marketing" OR "Marketing Operations")';

// ATS platforms → the domains to dork + how to pull the company slug from a URL.
const ATS = [
  { name: 'greenhouse', sites: ['boards.greenhouse.io', 'job-boards.greenhouse.io'] },
  { name: 'lever', sites: ['jobs.lever.co'] },
  { name: 'ashby', sites: ['jobs.ashbyhq.com'] },
  { name: 'smartrecruiters', sites: ['jobs.smartrecruiters.com', 'careers.smartrecruiters.com'] },
  { name: 'jobvite', sites: ['jobs.jobvite.com'] },
  { name: 'workable', sites: ['apply.workable.com'] },
  { name: 'workday', sites: ['myworkdayjobs.com'] },
];

const MAX_PAGES = 4;            // pages per dork (10 results/page) — 1 credit each
const TITLE_RE_FUNC = /(marketing|growth|demand gen|demand generation|product marketing|brand|performance marketing|revenue marketing|marketing operations|martech)/i;
const TITLE_RE_SENIOR = /(head|chief|cmo|\bvp\b|vice president|director|lead|principal|manager|general manager)/i;
const INDIA_HINT = /(india|bengaluru|bangalore|mumbai|delhi|gurgaon|gurugram|hyderabad|pune|chennai|noida|kolkata|ahmedabad|remote)/i;

function titleMatches(t) {
  t = t || '';
  if (/\bcmo\b/i.test(t)) return true;
  return TITLE_RE_FUNC.test(t) && TITLE_RE_SENIOR.test(t);
}

function slugAndType(name, link) {
  try {
    const u = new URL(link);
    const parts = u.pathname.split('/').filter(Boolean);
    if (name === 'workday') {
      return { slug: u.hostname.split('.')[0], type: u.pathname.includes('/job/') ? 'post' : 'board' };
    }
    const slug = parts[0] || '';
    let isPost = false;
    if (name === 'lever' || name === 'ashby' || name === 'smartrecruiters') isPost = parts.length >= 2;
    else if (name === 'greenhouse') isPost = parts.includes('jobs');
    else if (name === 'jobvite') isPost = parts.includes('job');
    else if (name === 'workable') isPost = parts.includes('j');
    return { slug, type: isPost ? 'post' : 'board' };
  } catch {
    return { slug: '', type: '' };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function scrappa(query, page) {
  const u = new URL('https://scrappa.co/api/search');
  u.searchParams.set('query', query);
  u.searchParams.set('hl', 'en');
  u.searchParams.set('gl', 'in');
  u.searchParams.set('amount', '10');
  u.searchParams.set('page', String(page));
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(u, { headers: { 'x-api-key': TOKEN } });
      if (res.status === 429) { await sleep(3000); continue; }
      if (!res.ok) { console.log(`   ! HTTP ${res.status}`); return []; }
      const d = await res.json();
      return d.organic_results || [];
    } catch (e) {
      console.log('   ! fetch error:', e.message);
      await sleep(2000);
    }
  }
  return [];
}

function esc(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }

async function main() {
  if (!TOKEN) {
    console.error('SCRAPPA_TOKEN is required to run scrappa_ats.mjs');
    process.exit(1);
  }
  mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outCsv = join(RESULTS_DIR, `ats_marketing_india_${stamp}.csv`);

  console.log('============================================================');
  console.log('  ATS dork sweep (Scrappa) — India marketing-leadership roles');
  console.log('  Platforms: ' + ATS.map((a) => a.name).join(', '));
  console.log('============================================================\n');

  const seen = new Set();
  const rows = [];
  let credits = 0;

  for (const ats of ATS) {
    for (const site of ats.sites) {
      const query = `site:${site} ${TITLES_OR} India`;
      console.log(`> ${ats.name} (${site})`);
      for (let page = 0; page < MAX_PAGES; page++) {
        const results = await scrappa(query, page);
        credits++;
        if (!results.length) break;
        let added = 0;
        for (const r of results) {
          const link = r.link || '';
          if (!link || seen.has(link)) continue;
          seen.add(link);
          const { slug, type } = slugAndType(ats.name, link);
          const text = `${r.title || ''} ${r.snippet || ''}`;
          rows.push({
            ats: ats.name,
            companySlug: slug,
            urlType: type,
            title: r.title || '',
            jobUrl: link,
            indiaMentioned: INDIA_HINT.test(text) ? 'yes' : 'no',
            marketingLeadership: titleMatches(r.title) ? 'yes' : 'no',
            snippet: (r.snippet || '').slice(0, 300),
          });
          added++;
        }
        console.log(`   page ${page}: +${added} (total ${rows.length})`);
        await sleep(800);
        if (results.length < 10) break;      // last page
      }
    }
  }

  const header = ['ats', 'companySlug', 'urlType', 'title', 'jobUrl', 'indiaMentioned', 'marketingLeadership', 'snippet'];
  const lines = [header.join(',')];
  for (const r of rows) lines.push(header.map((h) => esc(r[h])).join(','));
  writeFileSync(outCsv, lines.join('\n'), 'utf8');

  // Summary
  const byAts = {}, companies = new Set();
  let indiaCount = 0, mktCount = 0;
  for (const r of rows) {
    byAts[r.ats] = (byAts[r.ats] || 0) + 1;
    if (r.companySlug) companies.add(`${r.ats}:${r.companySlug}`);
    if (r.indiaMentioned === 'yes') indiaCount++;
    if (r.marketingLeadership === 'yes') mktCount++;
  }
  console.log('\n============================================================');
  console.log(`  ${rows.length} URLs found  |  ${companies.size} unique companies  |  ~${credits} credits`);
  console.log(`  India-mentioned: ${indiaCount}  |  marketing-leadership title: ${mktCount}`);
  console.log('============================================================');
  console.log('--- By ATS ---');
  Object.entries(byAts).sort((a, b) => b[1] - a[1]).forEach(([a, n]) => console.log(`  ${a}: ${n}`));
  console.log('\n--- Sample companies (ats:slug) ---');
  console.log('  ' + [...companies].slice(0, 30).join('\n  '));
  console.log(`\nCSV saved to: ${outCsv}`);
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
