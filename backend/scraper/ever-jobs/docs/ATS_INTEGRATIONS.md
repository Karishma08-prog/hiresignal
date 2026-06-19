# ATS Integrations

Ever Jobs integrates directly with **41 applicant tracking systems** that power career pages at thousands of companies worldwide. When a recruiter publishes a new role through any supported ATS, Ever Jobs detects the posting at the source — often hours before it appears on aggregated job boards like LinkedIn or Indeed.

## How ATS Integration Works

1. **Purpose-Built Adapters** — Each ATS has a dedicated scraper module that understands the platform's data format, API structure, and publishing workflow.
2. **Direct Source Detection** — Ever Jobs reads from the ATS's structured JSON/XML feed or API endpoint, seeing jobs the moment they go live on the company's career page.
3. **Normalized Output** — Despite each ATS having a different response schema, all results are normalized into the standard `JobPostDto` format with consistent fields across platforms.

### Usage

ATS scrapers require a `companySlug` parameter to identify which company's career page to query:

```bash
# Search Greenhouse jobs for Stripe
curl -X POST http://localhost:3001/api/jobs/search \
  -H 'Content-Type: application/json' \
  -d '{"companySlug": "stripe", "siteType": ["greenhouse"]}'

# Search all ATS platforms for a given company
curl -X POST http://localhost:3001/api/jobs/search \
  -H 'Content-Type: application/json' \
  -d '{"companySlug": "notion"}'
```

When `companySlug` is provided without an explicit `siteType`, all 41 ATS scrapers run concurrently. Each one independently checks whether the company exists on its platform and returns results accordingly.

---

## Supported Platforms

### Greenhouse

The leading applicant tracking system for scaling companies. Known for structured hiring methodology with scorecards, interview plans, and evaluation criteria. Career pages typically hosted at `boards.greenhouse.io`.

- **Method**: REST API (`api.greenhouse.io/v1/boards`)
- **Data Format**: JSON with full job descriptions, departments, offices
- **Notable Users**: Airbnb, Coinbase, Datadog, DoorDash, HubSpot, Notion, Stripe

### Lever

A talent acquisition suite combining ATS and CRM capabilities. Lever helps companies build and maintain candidate relationships throughout the hiring process, from sourcing to close.

- **Method**: REST API (`jobs.lever.co`)
- **Data Format**: JSON with team, location, commitment level
- **Notable Users**: Netflix, Shopify, KPMG, Eventbrite, Atlassian

### Workday

Enterprise-grade human capital management platform used by the world's largest organizations. Workday Recruiting is a core module within its broader HR suite, handling requisitions, approvals, and candidate management at global scale.

- **Method**: REST API (company-specific Workday endpoints)
- **Data Format**: JSON with compensation, requisition metadata
- **Notable Users**: Amazon, Salesforce, Target, Bank of America, Visa, Netflix

### Ashby

A modern, all-in-one recruiting platform purpose-built for high-growth companies. Ashby combines ATS, CRM, scheduling, and analytics into a single product, favored by technology companies that value data-driven hiring.

- **Method**: REST API (`jobs.ashbyhq.com`)
- **Data Format**: JSON with department, team, employment type
- **Notable Users**: Ramp, Figma, Linear, Vercel, Plaid

### SmartRecruiters

Enterprise talent acquisition platform with a marketplace of integrated hiring tools. SmartRecruiters serves large organizations across industries globally, with strong compliance and reporting capabilities.

- **Method**: REST API (`jobs.smartrecruiters.com`)
- **Data Format**: JSON with location, department, experience level
- **Notable Users**: Visa, Bosch, LinkedIn, Skechers, Equinox

### Jobvite

End-to-end talent acquisition suite covering recruitment marketing, ATS, and onboarding. Jobvite is recognized for its annual insights on hiring trends and candidate behavior.

- **Method**: REST API (`jobs.jobvite.com`)
- **Data Format**: JSON with requisition details, department, category
- **Notable Users**: Logitech, Schneider Electric, Zappos

### Workable

Hiring platform designed for small and mid-sized businesses. Workable provides sourcing tools, an ATS, and AI-powered candidate recommendations, making it accessible for organizations without dedicated recruiting operations.

- **Method**: GraphQL API (company-specific subdomains)
- **Data Format**: JSON with requirements, benefits, location
- **Notable Users**: Sephora, Bain Capital, Forbes

### SAP SuccessFactors

SAP's cloud-based human experience management suite used by large enterprises worldwide. SuccessFactors Recruiting handles talent acquisition at scale with deep integration into SAP's broader HR ecosystem.

- **Method**: OData API with HTML fallback
- **Data Format**: XML/JSON, full requisition details
- **Notable Users**: Siemens, Accenture, Deloitte, EY

### Oracle Taleo

Oracle's enterprise talent management cloud and one of the most widely deployed ATS platforms globally, particularly among Fortune 500 companies. Taleo handles high-volume recruiting across complex organizational structures.

- **Method**: REST API (JSON)
- **Data Format**: JSON with requisition metadata, location hierarchy
- **Notable Users**: JPMorgan Chase, PepsiCo, Intel, Cisco

### iCIMS

Talent cloud platform serving enterprise employers. iCIMS powers hiring for some of the world's largest workforces with tools spanning the entire talent lifecycle — from attraction and engagement to hiring and onboarding.

- **Method**: Playwright + JSON gateway
- **Data Format**: JSON via dynamic rendering
- **Notable Users**: UPS, Uber, Johnson & Johnson, Target

### ADP Recruiting

Part of ADP's comprehensive HR platform, ADP Recruiting Management helps organizations streamline hiring from requisition to onboarding. Integrated with ADP Workforce Now, it provides unified HR and recruiting data for enterprises.

- **Method**: REST API (ADP Workforce Now endpoints)
- **Data Format**: JSON with requisition, location, compensation
- **Notable Users**: Major enterprises across industries

### UKG (UltiPro)

UKG's talent acquisition module within its broader workforce management platform. UKG Pro Recruiting is used by mid-to-large organizations for end-to-end HR management, particularly strong in healthcare and manufacturing sectors.

- **Method**: REST API (`recruiting.ultipro.com`)
- **Data Format**: JSON with opportunity details, department, location
- **Notable Users**: Major healthcare and manufacturing organizations

### Rippling

Modern HR platform that unifies employee management, payroll, benefits, and recruiting. Rippling's ATS integrates tightly with its broader HR suite, popular among technology companies.

- **Method**: REST API
- **Data Format**: JSON

### Recruitee

Collaborative hiring platform with an emphasis on employer branding. Recruitee provides public career page APIs with salary data when available.

- **Method**: REST API (`{slug}.recruitee.com/api/offers`)
- **Data Format**: JSON with salary, department, location

### Teamtailor

Swedish-origin employer branding and ATS platform focused on candidate experience. Teamtailor powers career sites with rich media and analytics.

- **Method**: REST API (company-specific career page endpoints)
- **Data Format**: JSON

### BambooHR

HR software designed for small and medium businesses. BambooHR's recruiting module provides public career page APIs with structured job and location data.

- **Method**: REST API (`{slug}.bamboohr.com/careers/list`)
- **Data Format**: JSON with department, location, employment status

### Personio

European-focused HR platform for small and mid-sized companies. Personio's recruiting module exposes job listings through XML feeds.

- **Method**: XML feed
- **Data Format**: XML with position details, department, location

### JazzHR

Recruiting software for small businesses. JazzHR provides career pages with job listings accessible through HTML scraping.

- **Method**: HTML scraping
- **Data Format**: HTML with job details, location, department

### Breezy HR

Visual hiring pipeline ATS with a focus on simplicity and employer branding.

- **Method**: REST API
- **Data Format**: JSON

### Comeet

Collaborative hiring platform that helps teams make data-driven hiring decisions.

- **Method**: REST API
- **Data Format**: JSON

### Pinpoint

Smart recruiting software with employer branding and analytics.

- **Method**: REST API
- **Data Format**: JSON

### Manatal

AI-powered ATS serving 160,000+ organizations, particularly strong in Asia-Pacific and global SMB markets. Manatal offers public career page APIs that require no authentication.

- **Method**: REST API (`api.manatal.com/open/v1/career-page/{slug}/jobs/`)
- **Data Format**: JSON with salary, location, department
- **Notable Users**: 160K+ organizations globally

### Paylocity

US mid-market HR and payroll platform with integrated recruiting. Career page jobs are accessible via GUID-based public endpoints.

- **Method**: REST API (`recruiting.paylocity.com/recruiting/api/feed/jobs/{guid}`)
- **Data Format**: JSON
- **Notable Users**: 30K+ US mid-market companies

### Freshteam

Freshworks' HR platform with applicant tracking. Requires API key authentication for job listing access.

- **Method**: REST API (`{company}.freshteam.com/api/job_postings`)
- **Auth**: Bearer token (API key)
- **Data Format**: JSON

### Bullhorn

The #1 ATS for staffing and recruiting agencies. Uses corp token authentication for public job search endpoints.

- **Method**: REST API (`public-rest{cls}.bullhornstaffing.com/rest-services/{token}/search/JobOrder`)
- **Auth**: Corp Token (static per-company)
- **Data Format**: JSON
- **Notable Users**: 10K+ staffing agencies

### Trakstar Hire

Formerly RecruiterBox. Provides API access with basic authentication for job listings.

- **Method**: REST API (`{slug}.hire.trakstar.com/api/v1/openings`)
- **Auth**: API Key (Basic Auth)
- **Data Format**: JSON
- **Notable Users**: 5K+ companies

### HiringThing

White-label ATS platform (also branded as ATS Anywhere). API key required for access.

- **Method**: REST API (`api.hiringthing.com/api/v1/jobs`)
- **Auth**: API Key (Basic Auth)
- **Data Format**: JSON

### Loxo

AI-powered recruiting platform with public career board endpoints and optional API token for full access.

- **Method**: REST API (`app.loxo.co/api/{slug}/jobs`)
- **Auth**: Optional API token (public career board works without)
- **Data Format**: JSON
- **Notable Users**: 1K-3K recruiting firms

### Fountain

High-volume hourly hiring ATS used by major enterprises for frontline workforce hiring.

- **Method**: REST API (`api.fountain.com/v2/openings`)
- **Auth**: Bearer token
- **Data Format**: JSON
- **Notable Users**: 300+ enterprises (Uber, Amazon for frontline hiring)

### Deel

Global hiring and EOR (Employer of Record) platform with an integrated ATS module for job posting management.

- **Method**: REST API (`api.letsdeel.com/rest/v2/ats/job-postings/`)
- **Auth**: Bearer token
- **Data Format**: JSON
- **Notable Users**: 35K+ customers globally

### Phenom

Enterprise talent experience platform powering career sites for 900+ large enterprises. Each company has a Phenom-powered career site with REST API access.

- **Method**: REST API (`jobs.{company}.com/api/jobs` — per-company domain)
- **Auth**: None (public per-company career site)
- **Data Format**: JSON
- **Notable Users**: Boeing, Hilton, Nestle, Comcast, Verizon

### Avature

Enterprise-grade talent acquisition and CRM platform for global enterprises. Avature emphasizes flexible workflow configuration and is widely used in financial services, energy, and global staffing. Career portals are reachable both at standard subdomains and at custom-domain tenants (e.g. Bloomberg, IBM).

- **Method**: HTML scrape with cheerio (`*.avature.net/careers/SearchJobs/?jobOffset=N&jobRecordsPerPage=12`)
- **Auth**: None (public career portal)
- **Data Format**: HTML — five-cascade selector chain (`article.job` / `div.job-item` / `li.job-listing` / `tr.job` / `div[data-job-id]`) plus an `/JobDetail/`-link fallback
- **Custom Domains**: Supported via the `companyUrl` input override (e.g. `https://careers.ibm.com`)
- **Notable Users**: Bloomberg, KPMG (Ireland / NL), Deloitte (PNG), Maximus, Plante Moran, NVA, Delta, One800Flowers

### Gem

Modern recruiting platform combining ATS + CRM, popular with high-growth technology companies and venture-backed startups. Gem boards are hosted at `jobs.gem.com/<companySlug>` with a single batched GraphQL endpoint that returns the entire board in one round-trip.

- **Method**: Single batched GraphQL POST (`https://jobs.gem.com/api/public/graphql/batch`) carrying both `JobBoardTheme` + `JobBoardList` operations
- **Auth**: None (public board)
- **Data Format**: JSON — `data.oatsExternalJobPostings.jobPostings[]` per envelope; response-order tolerant (Theme first or List first)
- **Notable Users**: Accel, Alex and Ani, A16Z Speedrun, 43North, Acre, Agora, Airframe

### Join.com

European-focused recruiting platform with strong adoption in Germany, Austria, and Switzerland. Join.com career pages live at `join.com/companies/<slug>`; the public REST API exposes paginated jobs at 50 per page with optional aggregations.

- **Method**: Two-step REST flow — Step 1: HTML scrape `join.com/companies/<slug>` to regex-extract numeric `companyId` (primary `"company":{"id":N` shape, fallback `"companyId":N` for skinned tenants); Step 2: paginated `GET /api/public/companies/<id>/jobs?locale=en-us&page=N&pageSize=50&withAggregations=true&sort=+title` until `pagination.totalPages` is reached or `items[]` is empty
- **Auth**: None (public `/api/public` namespace)
- **Data Format**: JSON with `items[]`, `pagination`, optional aggregations
- **Polite Pacing**: 0.5 s between paginated calls (matches upstream Python's `time.sleep(0.5)`)
- **Notable Users**: Awork, Alteos, Aitad, Capitalmind, Brandcircle, Cinnamood, Brandneo, Brunathelabel, Allunity, Citychickennhas490

### Oracle HCM Cloud (Oracle Recruiting Cloud)

Enterprise-grade multi-tenant ATS within Oracle's HCM Cloud suite. Tenants typically host at `https://<subdomain>.fa.<region>.oraclecloud.com` (e.g. `eeho.fa.us2.oraclecloud.com` for Oracle's own careers site). The CandidateExperience REST API exposes a finder-string-driven `recruitingCEJobRequisitions` endpoint that paginates at 100 per page.

- **Method**: REST GET against `/hcmRestApi/resources/latest/recruitingCEJobRequisitions` with a `findReqs;<finder-string>` finder (commas between params, semicolons between facets — matches upstream Python's wire format; the all-semicolon variant suggested in spec drafts was rejected by the live API)
- **Auth**: None (public CandidateExperience namespace)
- **Data Format**: JSON — `response.items[0].requisitionList[]`; each row carries `Id` / `Title` / `PrimaryLocation` / `PostedDate` / `EmployerName` plus optional `ExternalUrl` / `ExternalUrlSeo` for canonical apply links
- **Tenant Resolution**: `companyUrl` (full URL override, canonical) ⇒ used verbatim; `companySlug` (`<subdomain>-<region>` form, e.g. `eeho-us2`) ⇒ composed to `https://<subdomain>.fa.<region>.oraclecloud.com`
- **`siteNumber` Override**: Optional `ScraperInputDto.siteNumber` field defaulting to `'CX_45001'` (Q-030 — upstream Python's documented default; ≥ 95 % of tenants honour it)
- **Pagination**: `offset=N` increments by 100 until `requisitionList[]` is empty OR `resultsWanted` cap; first page omits `offset=` for canonical request shape
- **Notable Users**: Oracle, City of Atlanta, TTX, CooperCompanies, EXP, Kroll, Macy's, Westpac Group, DTCC, Hologic, Mountaire, Mouser, Ricoh, Galliford Try, Apollo Hospitals, Standard Aero, Proskauer, Euroclear, Arcadis, BDO USA, Onity, Hillside, Dubai World Trade Centre, Zeus

### Mercor

Talent marketplace (NOT a per-company ATS) where companies post contract / full-time opportunities. The explore page returns the **entire public catalogue** in one GET — no per-company URL segmentation, no pagination — so per-company filtering is a client-side substring match on `companyName` rather than a slug-keyed dispatch.

- **Method**: Single REST GET to `https://aws.api.mercor.com/work/listings-explore-page`
- **Auth**: Literal `Authorization: Bearer` header (empty token — mirrors upstream Python's `MercorClient.session.headers`); `Origin` + `Referer` (`https://work.mercor.com`) required by the API gateway
- **Data Format**: JSON — `response.listings[]`; each row carries `listingId` / `title` / `companyName` / `location` / `postedAt` plus a `rateMin / rateMax / payRateFrequency` triple (mapped into `JobPostDto.compensation` directly — no detail fetch required)
- **Filtering Semantics**: `companySlug` is a **case-insensitive substring filter** on `companyName` (e.g. `companySlug='stripe'` retains rows whose `companyName.toLowerCase()` contains `'stripe'`). Empty slug ⇒ full catalogue, capped by `resultsWanted` (cap applies AFTER the filter so a 5-row Stripe slice is genuinely 5 Stripe rows)
- **Detail Fetch**: Not exercised — explore-page envelope already carries enough fields for `JobPostDto` mapping. Detail-page enrichment deferred to candidate Spec 016
- **Notable Users**: Stripe, OpenAI, Anthropic, Notion, Airbnb, Figma, Vercel, Linear, Discord, Coinbase, Plaid, Ramp (sample of the catalogue at time of writing — the explore page surfaces ≥ 200 distinct employers across software, finance, design, and operations)

### Tesla

Single-company custom careers portal at `https://www.tesla.com/careers/search/`. Tesla operates its own internal `/cua-api/` endpoint pair (board + per-job detail) protected by Akamai Bot Manager. Ever Jobs ships **two** Tesla plugins:

- **Default `source-tesla` (pure-HTTP):** Calls the board endpoint directly with rotated UA + `Accept: application/json`. Akamai-challenge surfaces (HTTP 403 / 503 OR a `text/html` body when JSON was requested) return an empty `JobResponseDto` with the `ERR_TESLA_AKAMAI_CHALLENGE` sentinel logged.
- **Optional `source-tesla-playwright` (browser-automation companion):** Lazy-loads `playwright` via `Function('s', 'return import(s)')(specifier)` indirection (defeats ts-jest's static module resolution). Launches headless Chromium with `--disable-blink-features=AutomationControlled`, navigates to the careers-search landing page, settles 5 s for Akamai's challenge JS to resolve, then issues in-page `fetch()` calls through the established session. Per Q-028, this companion is **NOT** auto-registered via `ALL_SOURCE_MODULES` — operators opt in by importing `TeslaPlaywrightModule` directly.

- **Method (default)**: REST GET to `https://www.tesla.com/cua-api/apps/careers/state` (board) followed by per-job GETs to `/cua-api/careers/job/{id}` (detail)
- **Method (companion)**: Headless Chromium navigation to `/careers/search/` → in-page `fetch()` for board + detail (lazy `import('playwright')`)
- **Auth**: None for either path (public careers API; companion adds a real browser session for Akamai bypass)
- **Data Format**: JSON — `response.listings[]` at top level + `response.lookup` as a sibling map (location-id / department-id dictionaries; the spec draft's `data.lookup.listings[]` path was incorrect and is corrected in the implementation)
- **Description Budget**: `ScraperInputDto.descriptionDepth` controls per-job detail-fetch fan-out: `'board'` → 0 follow-ups (descriptions stay null), `'detail-25'` (default per Q-031) → 25 follow-ups, `'detail-all'` → ∞. Detail-fetch failures are silently swallowed; the affected listing keeps `description: null` but still emits as a `JobPostDto`
- **Cross-Plugin Dedup**: When both Tesla plugins are enabled, rows emit under different `Site` keys (`Site.TESLA` vs `Site.TESLA_PLAYWRIGHT`) so per-source breaker policies (Spec 005 / FR-1) track them independently. `dedup-hybrid`'s hash strategy (Spec 003 / FR-3) collapses cross-site duplicates by `externalId` (per Q-032 default)
- **Notable Users**: Tesla (single-tenant; no per-company variation)

---

## Architecture

Each ATS integration is an independent NestJS package following the `IScraper` interface:

```
packages/source-ats-{name}/
  src/
    index.ts              # Public exports
    {name}.module.ts      # NestJS module
    {name}.service.ts     # IScraper implementation
    {name}.constants.ts   # API URLs, headers
    {name}.types.ts       # Response type definitions
```

All ATS services are registered in `JobsService.ATS_SITES` and included in the scraper map, ensuring they run automatically when `companySlug` is provided.

---

## Adding a New ATS Integration

See [PRD_NEW_JOB_SOURCES.md](PRD_NEW_JOB_SOURCES.md) for the step-by-step guide to implementing a new source. The key steps are:

1. Create `packages/source-ats-{name}/` with the standard file structure
2. Implement the `IScraper` interface in the service
3. Add the `Site` enum entry in `packages/models/src/enums/site.enum.ts`
4. Register the path in `tsconfig.base.json`
5. Import the module in `apps/api/src/jobs/jobs.module.ts` and `apps/cli/src/cli.module.ts`
6. Wire it into `JobsService` (constructor, scraper map, `ATS_SITES` set)
