# Job Scraper

Scrape job postings across many job boards by **role**, **country**, and
**timeline** (jobs posted in the last *N* days), then see **who is hiring** and
get a CSV of every posting.

Built on top of [ever-jobs](https://github.com/ever-jobs/ever-jobs) (160+ sources).

---

## How to run

**Easiest:** double-click **`Find Jobs.bat`**.

**Or** from a terminal in this folder:

```powershell
node find-jobs.mjs
```

It will ask you, in order:

| Prompt            | Example            | Notes |
|-------------------|--------------------|-------|
| Role / job title  | `data analyst`     | The keywords to search for. |
| Country           | `India`            | `USA`, `UK`, `Germany`, `UAE`, `Canada`… (see full list below). |
| Last how many DAYS | `7`               | Only jobs posted within this many days. |
| City / area       | *(blank)*          | Optional. Blank = the whole country. |
| Max results per board | `25`           | Per job board. |
| Remote only?      | `n`                | `y` to keep only remote roles. |
| Job boards        | *(blank = default)* | Space-separated. Blank uses a sensible default set. |

When it finishes you get:

- A live **Top Companies hiring** summary on screen (who is hiring + how many roles).
- A **CSV** saved to the `results/` folder, e.g.
  `results/jobs_data-analyst_INDIA_2026-05-25T11-19-36.csv`
  with columns: `site, title, companyName, location, jobUrl, datePosted,
  jobType, isRemote, minAmount, maxAmount, currency, interval, description`.

Open the CSV in Excel / Google Sheets.

---

## Which boards actually work (measured)

ever-jobs advertises 160+ sources, but most need API keys, a company slug, or a
browser engine that isn't set up. An audit of 78 keyless boards (query "software
engineer", USA) found **30 returned data with zero config**:

`linkedin, remotive, weworkremotely, himalayas, arbeitnow, themuse, workingnomads,
builtin, landingjobs, virtualvocations, powertofly, freelancercom, hackernews,
jobspresso, realworkfromanywhere, remotefirstjobs`, plus regional
(`duunitori`-FI, `jobsch`-CH, `mycareersfuture`-SG, `habrcareer`-RU) and tech-niche
(`pyjobs, pythonjobs, golangjobs, railsjobs, vuejobs, larajobs, fossjobs,
devopsjobs, androidjobs, functionalworks`). Plus **Indeed** via Botasaurus.

Sources that need setup (return 0 until configured):
- **~20 key-gated** (Adzuna, Reed, Jooble, USAJobs, Talroo, Exa, Upwork, CareerJet,
  JobTechDev, FranceTravail, InfoJobs…) → add free API keys to `ever-jobs/.env`.
- **7 Playwright** (Dice, SimplyHired, Wellfound, StepStone, Monster, CareerBuilder,
  iCIMS) → run `npx playwright install` inside `ever-jobs/`.
- **38 ATS** (Greenhouse, Lever, Workday…) → need a per-company `companySlug`
  (not wired into this wrapper; use the raw CLI with `--company-slug`).

Some boards are also intermittent (anti-bot, geo, rate-limits): google, naukri,
bayt, remoteok, jobicy, ziprecruiter, glassdoor.

## Choosing job boards

When asked for boards, you can type any space-separated combination.

- **Country-aware** (best for "who is hiring in country X"):
  `linkedin indeed glassdoor google zip_recruiter bayt naukri bdjobs`
  - `naukri` / `bdjobs` are great for **India / Bangladesh**.
  - `bayt` is great for the **Middle East** (UAE, Saudi Arabia, Qatar…).
- **Global remote boards** (very reliable, always return data):
  `remotive arbeitnow weworkremotely himalayas jobicy remoteok`

**Default set:** `linkedin indeed glassdoor google remotive arbeitnow weworkremotely`.

### Two engines (automatic)
The tool uses two scraping engines and routes each board to the right one:

| Engine | Boards | How |
|--------|--------|-----|
| **ever-jobs** (HTTP) | linkedin, google, remotive, arbeitnow, weworkremotely, glassdoor*, and all other boards | Fast HTTP scraping. Uses the residential proxy. |
| **Botasaurus** (stealth browser) | **indeed, zip_recruiter, glassdoor** | A real Chrome browser that defeats anti-bot/fingerprint blocks. Uses **your real IP** (no proxy — see below). |

`indeed`, `zip_recruiter`, and `glassdoor` fingerprint-block plain HTTP (HTTP 403),
so they go through **Botasaurus**, which drives a real stealth Chrome browser.

Reliability of the Botasaurus boards (tested):
- **Indeed** — works well (real browser + your real residential IP). ✅
- **ZipRecruiter** — works but is geo-sensitive and sometimes flaky; best-effort.
- **Glassdoor** — usually blocked by a Cloudflare challenge; often returns 0. ⚠️
  (Not in the default board set for that reason; add it explicitly to try.)

**Requirement:** Botasaurus must be installed in a Python the tool can find.
It auto-detects `py` / `python` / the standard user install. To force a specific
interpreter: `setx JOBS_PYTHON "C:\path\to\python.exe"`. Chrome must be installed.

## Proxy (rotating residential)

A DataImpulse rotating residential proxy is wired in and **on by default** — the
tool asks `Route requests through the residential proxy? (y/n) [y]`.

What it does: spreads the **ever-jobs** HTTP requests across rotating residential
IPs, which helps avoid **rate-limit/IP bans** (especially on LinkedIn).

What it does **not** do: it is **not** used for the Botasaurus boards (Indeed/Zip/
Glassdoor). Testing showed those sites flag the proxy's IPs, while a real stealth
browser from your own residential IP gets through — so Botasaurus runs proxy-free
by default. (Override with `JOBS_BOTA_PROXY` if you ever need to.)

Configure it with the `JOBS_PROXY` environment variable:
```powershell
$env:JOBS_PROXY = "http://user:pass@host:port"   # use a different proxy
$env:JOBS_PROXY = ""                              # disable the proxy entirely
```
If `JOBS_PROXY` is unset, the built-in DataImpulse proxy is used.

---

## How "country" works (important)

- For **Indeed** and **Glassdoor**, the country picks the correct regional site
  (e.g. `indeed.co.in` for India).
- For **LinkedIn** and **Google**, results are filtered by the **location** field,
  not the country code. That's why, if you leave the city blank, this tool
  automatically uses the **country name as the location** so results stay
  country-specific.

---

## Supported countries

`USA, UK, Canada, Australia, India, Germany, France, Spain, Italy, Netherlands,
Ireland, Belgium, Switzerland, Austria, Sweden, Norway, Denmark, Finland, Poland,
Portugal, Greece, Czechia, Romania, Hungary, Bulgaria, Croatia, Ukraine, Turkey,
Brazil, Mexico, Argentina, Chile, Colombia, Peru, Singapore, Malaysia, Indonesia,
Philippines, Thailand, Vietnam, Japan, China, Hong Kong, Taiwan, South Korea,
Pakistan, Bangladesh, Nigeria, South Africa, Morocco, Egypt, Israel, UAE, Saudi
Arabia, Qatar, Kuwait, Bahrain, Oman, New Zealand, Worldwide`, and more.

You can also type the raw code (e.g. `GERMANY`, `SOUTHKOREA`).

---

## Advanced: run the underlying CLI directly

The interactive tool wraps the ever-jobs CLI. You can call it yourself:

```powershell
cd ever-jobs
node cli-run.cjs search -q "data analyst" -c INDIA --hours-old 168 `
  -s linkedin -s remotive -n 25 --analyze -f csv -o ..\results\out.csv
```

`node cli-run.cjs search --help` lists every flag.

---

## Project files

| File | Purpose |
|------|---------|
| `Find Jobs.bat`   | Double-click launcher. |
| `find-jobs.mjs`   | The interactive prompt wrapper (orchestrates both engines + merges results). |
| `bota_scraper.py` | Botasaurus stealth-browser scraper for indeed / zip_recruiter / glassdoor. |
| `results/`        | Output CSVs land here. |
| `ever-jobs/`      | The cloned ever-jobs engine. |
| `ever-jobs/cli-run.cjs` | CommonJS bootstrap that makes the TS CLI run on Node 24 (see notes). |

### Notes on the engine
Two fixes were needed to make ever-jobs' CLI run from a fresh clone:
1. **`ever-jobs/cli-run.cjs`** — a CommonJS entry that registers `ts-node` +
   `tsconfig-paths` (the repo ships no root `tsconfig.json`, and Node 24 would
   otherwise try to run the TypeScript as an ES module and fail).
2. **`ever-jobs/apps/cli/src/cli.module.ts`** — the original didn't import the
   plugin infrastructure (`PluginModule`, config, metrics, circuit-breaker), so
   the CLI couldn't start; it now imports those plus all source plugins.

## Reminder
Scraping some job boards may be against their Terms of Service. Use responsibly
and at your own risk.
