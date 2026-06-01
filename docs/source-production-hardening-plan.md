# HireSignal Source Production Hardening Plan

Date: 2026-06-01

This plan is for taking HireSignal from the current mixed state of `ready`, `historically proven`, and `fresh-live functional` into a sellable system with a clear supported-source contract.

Current reality from the live backend:
- `51` source groups are `ready`
- `19` source groups are `verified or historically proven`
- `14` source groups are `fresh-live functional now`

Important:
- `ready` is not the same as `working live now`
- the product should not claim `50+ live boards` in the current state
- the achievable short-term target is `50+ supported sources`, split into `live-supported`, `fallback-supported`, and `experimental`

## Target State

For every source family, the backend and frontend should classify it as exactly one of:
- `live_supported`
- `fallback_supported`
- `experimental`
- `disabled`

Suggested sellable milestone:
- `25-35` `live_supported`
- `15-25` `fallback_supported`
- `0` client-visible `experimental`

## Phase 1: Fix The Highest-Value 15 First

These are the first 15 sources to focus on because they are either already partially working, high-value, or easiest to stabilize into something client-usable.

### Search / HTTP boards
1. `linkedin`
2. `remotive`
3. `weworkremotely`
4. `himalayas`
5. `arbeitnow`
6. `themuse`
7. `builtin`
8. `landingjobs`
9. `jobspresso`
10. `workingnomads`

### Browser-backed boards
11. `indeed`
12. `naukri`
13. `zip_recruiter`

### ATS families
14. `greenhouse`
15. `lever`

Why this 15:
- they map to the strongest current signal in `source_catalog.py`
- they already have real evidence, partial evidence, or strong commercial value
- they give the fastest route to a credible client story

## Phase 2: ATS Families To Implement Next

After the first 15 are stable, expand the public ATS families that can scale source count without chasing fragile niche boards.

Priority order:
1. `ashby`
2. `workday`
3. `workable`
4. `smartrecruiters`
5. `jobvite`
6. `bamboohr`
7. `personio`
8. `jazzhr`
9. `recruitee`
10. `breezyhr`
11. `comeet`
12. `pinpoint`
13. `manatal`
14. `paylocity`
15. `jobscore`
16. `talentlyft`
17. `crelate`
18. `recruiterflow`
19. `homerun`
20. `loxo`

Why ATS next:
- one successful ATS implementation unlocks many employers
- public ATS feeds are more stable than random long-tail job boards
- they are a more realistic path to `50+ supported sources`

## Do Not Prioritize Yet

These should remain `experimental` or `disabled` until the higher-value set is stable:
- `glassdoor`
- `freelancercom`
- `realworkfromanywhere`
- `androidjobs`
- `devopsjobs`
- `fossjobs`
- `functionalworks`
- `railsjobs`
- `vuejobs`
- `larajobs`

Reason:
- low business value relative to engineering effort
- frequent timeouts, 403s, or upstream instability
- poor sales leverage compared with ATS/public-feed families

## Exact Backend Work To Add

### 1. Add a source support registry

Add a new table in [backend/app/models.py](C:/Users/HP/Desktop/hiresignal-frontend/backend/app/models.py):

Suggested model: `SourceSupport`
- `id`
- `site_key`
- `support_tier`
  - `live_supported`
  - `fallback_supported`
  - `experimental`
  - `disabled`
- `support_reason`
- `client_visible`
- `owned_by`
- `last_policy_review_at`

Purpose:
- separates commercial support policy from raw scraper health

### 2. Add an ATS slug cache

Add a new table:

Suggested model: `SourceSlug`
- `id`
- `site_key`
- `company_slug`
- `company_name`
- `job_board_url`
- `discovery_method`
- `status`
  - `discovered`
  - `verified`
  - `failed`
  - `stale`
- `last_discovered_at`
- `last_verified_at`
- `last_error`
- `notes`

Purpose:
- discovery and fetch should be separated
- public ATS sources become much more stable when slug discovery is cached

### 3. Add source run evidence

Add a new table:

Suggested model: `SourceEvidence`
- `id`
- `site_key`
- `run_id`
- `evidence_type`
  - `live_retest`
  - `historical_import`
  - `fallback_import`
  - `audit_import`
- `jobs_found`
- `query_signature`
- `country`
- `location`
- `succeeded`
- `created_at`

Purpose:
- keeps real evidence separate from summary counters
- lets you classify `working for this query` vs `working in general`

## Exact API Routes To Add

Add these backend routes:

### `GET /api/sources/support`
- returns only support policy fields
- frontend should use this for client-facing board visibility

### `GET /api/sources/slugs`
- query by `siteKey`
- returns cached ATS slugs and verification status

### `POST /api/sources/{site_key}/discover-slugs`
- runs slug discovery only
- does not fetch jobs

### `POST /api/sources/{site_key}/verify-fetch`
- uses known slug(s) to fetch jobs
- this is a different operation from discovery

### `GET /api/sources/evidence`
- returns recent live/historical/fallback evidence

### `POST /api/sources/promote`
- promote a source from `experimental` to `fallback_supported` or `live_supported`
- should be an explicit operator action

## Exact Service-Level Refactors

### A. Split source testing into 3 steps

Current code mixes setup, discovery, and working status.

Refactor into:
1. `credential readiness`
2. `discovery readiness`
3. `fetch readiness`

Files:
- [backend/app/services/source_retest.py](C:/Users/HP/Desktop/hiresignal-frontend/backend/app/services/source_retest.py)
- [backend/app/services/source_runtime.py](C:/Users/HP/Desktop/hiresignal-frontend/backend/app/services/source_runtime.py)
- [backend/app/routers/sources.py](C:/Users/HP/Desktop/hiresignal-frontend/backend/app/routers/sources.py)

### B. Make board-specific smoke queries

Right now too many boards are tested with a generic query.

Add a board query profile layer:
- `us_marketing`
- `us_engineering`
- `india_marketing`
- `remote_general`
- `ats_discovery_generic`

Files:
- [backend/app/services/source_retest.py](C:/Users/HP/Desktop/hiresignal-frontend/backend/app/services/source_retest.py)

### C. Add board-specific timeout budgets

Examples:
- `linkedin`: 30-45s
- `builtin`: 20-30s
- `indeed`: 90-120s
- `zip_recruiter`: 90-120s
- `glassdoor`: lower retry count, early anti-bot exit

Files:
- [backend/app/services/script_workers.py](C:/Users/HP/Desktop/hiresignal-frontend/backend/app/services/script_workers.py)
- [backend/app/services/source_retest.py](C:/Users/HP/Desktop/hiresignal-frontend/backend/app/services/orchestrator.py)

### D. Add source-family-specific fetchers

Do not rely on one generic ATS discovery path for every ATS family.

Add service modules like:
- `backend/app/services/ats_fetch_greenhouse.py`
- `backend/app/services/ats_fetch_lever.py`
- `backend/app/services/ats_fetch_ashby.py`
- `backend/app/services/ats_fetch_workday.py`
- `backend/app/services/ats_fetch_bamboohr.py`

Each fetcher should:
- accept slug(s)
- fetch public jobs directly
- normalize to the existing ingestion schema

## Frontend Changes Required

### Job Boards page

Change [src/app/job-boards/page.tsx](C:/Users/HP/Desktop/hiresignal-frontend/src/app/job-boards/page.tsx) to show:
- `Live Supported`
- `Fallback Supported`
- `Experimental`

Do not show `ready` as a client-facing concept.

### Scraper source selection

Change [src/lib/source-launch.ts](C:/Users/HP/Desktop/hiresignal-frontend/src/lib/source-launch.ts) so source suggestions prefer:
1. `live_supported`
2. `fallback_supported`
3. never suggest `experimental` unless the user explicitly opts in

### Settings page

Expose:
- proxy present
- Scrappa token present
- slug-cache health
- last retest by source family

## Success Criteria

### Milestone 1
- `20+` live-supported
- `10+` fallback-supported
- LinkedIn, Indeed, Naukri, Greenhouse, Lever stable

### Milestone 2
- `30+` live-supported
- `15+` fallback-supported
- ATS slug cache live
- public ATS fetchers shipping for at least 8 families

### Milestone 3
- `50+` supported sources total
- at least `25` live-supported
- no client-visible experimental sources

## Immediate Next Sprint

Sprint order:
1. Add `SourceSupport`, `SourceSlug`, and `SourceEvidence` models and schemas
2. Add `/api/sources/support`, `/api/sources/slugs`, `/api/sources/evidence`
3. Refactor `source_retest.py` to store evidence and board-specific smoke profiles
4. Stabilize the first 10 HTTP boards
5. Implement direct public ATS fetchers for `greenhouse`, `lever`, `ashby`, `workday`, `bamboohr`
6. Update frontend `Job Boards` labels to support tiers instead of generic readiness

## Sales-Safe Positioning

What can be sold after this plan starts landing:
- `50+ supported source families`
- `25+ live-tested`
- `fallback-supported coverage for additional ATS families`

What should not be sold until Milestone 3:
- `50+ live boards working right now`
- `all boards fully fresh-live`
- `every run always fresh-live`
