# HireSignal Product Roadmap

## Goal
HireSignal should help a user discover lead-worthy companies from real hiring activity across job boards, turn those signals into ranked company targets, and export or act on those leads without needing manual spreadsheet work.

The product direction is:
- start with campaign-driven hiring signal discovery
- aggregate jobs into company-level lead intelligence
- surface why a company is a strong lead
- make the workflow usable by non-technical sales, GTM, or research teams

---

## Current State

### What already works
- Next.js frontend and FastAPI backend are integrated
- campaigns can be created from the frontend
- runs can be triggered and tracked
- backend imports real scraper outputs
- Dashboard, Campaigns, Companies, Job Boards, Reports, and Run Detail read backend data
- source retest flow exists for Job Boards
- report downloads are served by backend artifact endpoints

### What is still incomplete
- some job boards are still unstable
- browser and ATS flows depend on environment setup like proxies and `SCRAPPA_TOKEN`
- backend still relies partly on legacy scripts and file-based outputs
- lead scoring and company ranking are still basic
- cloud-ready persistence and storage are not finished

---

## Product Vision

### Core promise
HireSignal should answer:
- which companies are showing a hiring signal relevant to my offer?
- why are they a lead right now?
- how strong is that signal?
- what evidence supports it?
- can I export or act on that company immediately?

### Hero workflow
1. Create a campaign by role, objective, market, location, and source set
2. Run job-board discovery
3. Aggregate matching jobs into company-level lead candidates
4. Score each company by hire signal strength
5. Review evidence on the Company page
6. Export shortlist or push into outreach workflow

---

## Phase 1: Stabilize And Productize

### Goal
Make the product stable, demo-safe, and ready for internal usage.

### Frontend priorities
- add filters, sorting, and pagination to `Companies`, `Campaigns`, and `Reports`
- improve `Company Detail` so it becomes the main lead review page
- add stronger success, error, and progress feedback throughout the app
- improve run progress and diagnostics visibility on `Dashboard` and `Run Detail`
- make empty states and loading states clearer for non-technical users

### Backend priorities
- move from `SQLite` to `Postgres`
- add migrations
- move artifact storage from local disk to `S3` or `Cloudflare R2`
- add auth and basic user roles
- add run retry and cancel endpoints
- store structured source diagnostics and retry history
- improve source health tracking per board

### Operational priorities
- lock a stable default source set
- mark unstable boards clearly in the system
- standardize env vars and secrets handling
- document local setup and production deployment

### Success criteria
- app is stable for everyday use
- campaigns and reports are reliable
- source issues are visible instead of hidden
- system can be deployed without relying on local files

---

## Phase 2: Make It Valuable For Lead Generation

### Goal
Turn HireSignal from a scraper dashboard into a lead intelligence tool.

### Frontend priorities
- add company scoring badges and ranking
- add shortlist saving and review workflow
- add lead notes, tags, and outreach status
- add direct export from the Company page
- add richer Dashboard charts for source performance and hiring trends
- add saved search and saved filter views

### Backend priorities
- build a real lead scoring engine
- score by:
  - title relevance
  - objective match
  - market expansion signal
  - freshness
  - source confidence
  - job volume per company
- improve company-level aggregation
- add structured search/filter/sort endpoints
- add live progress updates through polling or webhooks
- add better evidence capture for web and job-description signals

### Product priorities
- make `Company` the hero page
- show:
  - why the company is a lead
  - which roles triggered the signal
  - which boards confirmed it
  - what market expansion or GTM signal was detected
  - how recent the signal is
  - whether it is ready for outreach

### Success criteria
- a GTM or sales user can review leads without technical help
- top leads are clearly ranked
- exports are meaningful and ready for downstream use

---

## Phase 3: Production-Grade Platform

### Goal
Make HireSignal scalable, cloud-ready, and usable as a real multi-user product.

### Frontend priorities
- support multiple workspaces
- support user roles and permissions
- add audit/history views
- add onboarding for new users
- add polished lead handoff and collaboration flows

### Backend priorities
- reduce dependency on file-based script orchestration
- move toward cleaner service-based data pipelines
- run background work at scale with Redis + Celery
- add scheduled campaigns and recurring refreshes
- add observability, alerting, and error dashboards
- add backups, security controls, and operational limits

### Platform priorities
- deploy frontend, API, worker, Redis, Postgres, and storage cleanly in cloud
- monitor source reliability by board and region
- harden unstable job boards one by one
- add admin controls for source enablement and source fallback rules

### Success criteria
- supports larger internal or client-facing usage
- long-running jobs are reliable
- deployment and operations are repeatable

---

## Recommended Build Order

1. Move database to `Postgres`
2. Move file artifacts to object storage
3. Improve `Company Detail` into a true lead workspace
4. Add filters, sorting, and pagination across key pages
5. Add company scoring and ranking
6. Add shortlist workflow and exports from Company views
7. Add auth and user roles
8. Improve source reliability and diagnostics
9. Harden queue/workers for production
10. Reduce legacy script dependency over time

---

## Best Product Bet

If HireSignal is going to feel differentiated, the strongest product bet is:
- make company-specific hire signals the center of the experience

That means the best page in the system should not just list jobs.
It should explain:
- which company is worth contacting
- what signal was detected
- how strong that signal is
- how fresh it is
- what evidence supports it
- what export or next action should happen

That is what turns HireSignal into a real lead engine.

---

## Suggested Next Immediate Tasks

### Product
- improve `Company Detail`
- add company ranking
- add shortlist actions

### Frontend
- add filters and pagination
- add more actionable Dashboard charts
- add better export entry points

### Backend
- migrate to `Postgres`
- add object storage
- improve source diagnostics and retries

### Infra
- prepare cloud deployment architecture
- replace local-only assumptions

---

## Suggested Demo Positioning

When presenting HireSignal, position it as:
- a hiring-signal lead engine
- not just a jobs scraper

Key message:
- HireSignal identifies companies that are showing intent through hiring activity, then converts those signals into reviewed, exportable lead lists.
