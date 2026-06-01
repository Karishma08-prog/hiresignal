# HireSignal Product Checklist

Use this file as the execution checklist for turning HireSignal from a working prototype into a production-grade lead intelligence product.

## Phase 1: Stabilize And Productize

### Frontend
- [ ] Add table filters to `Companies`
- [ ] Add table filters to `Campaigns`
- [ ] Add table filters to `Reports`
- [ ] Add sorting to `Companies`
- [ ] Add sorting to `Campaigns`
- [ ] Add sorting to `Reports`
- [ ] Add pagination controls to `Companies`
- [ ] Add pagination controls to `Campaigns`
- [ ] Add pagination controls to `Reports`
- [ ] Improve `Company Detail` to show stronger evidence blocks
- [ ] Add consistent success toasts for campaign creation
- [ ] Add consistent success toasts for source retests
- [ ] Add consistent success toasts for report exports
- [ ] Add clearer error toasts across run flows
- [ ] Improve run progress visibility on `Dashboard`
- [ ] Improve run progress visibility on `Run Detail`
- [ ] Improve empty states for non-technical users
- [ ] Improve loading states for non-technical users

### Backend
- [ ] Move database from `SQLite` to `Postgres`
- [ ] Add migration tooling
- [ ] Move artifacts from local disk to object storage
- [ ] Add auth
- [ ] Add user roles
- [ ] Add run retry endpoint
- [ ] Add run cancel endpoint
- [ ] Add structured source failure history
- [ ] Add structured retry history
- [ ] Expand source health metrics by board

### Ops
- [ ] Lock a stable default source set
- [ ] Mark unstable boards clearly in backend state
- [ ] Move all secrets and tokens to env-based config
- [ ] Document local development setup
- [ ] Document production deployment setup

### Phase 1 Exit Criteria
- [ ] App is stable for day-to-day usage
- [ ] Campaign and report flow is reliable
- [ ] Source issues are visible in UI and backend
- [ ] No core feature depends on local-only file assumptions

---

## Phase 2: Make It Valuable For Lead Generation

### Frontend
- [ ] Add company scoring badges
- [ ] Add company ranking UI
- [ ] Add shortlist save workflow
- [ ] Add shortlist review workflow
- [ ] Add lead notes
- [ ] Add lead tags
- [ ] Add outreach status per company
- [ ] Add direct export from `Company`
- [ ] Add richer Dashboard charts
- [ ] Add saved search views
- [ ] Add saved filter views

### Backend
- [ ] Build title relevance scoring
- [ ] Build objective match scoring
- [ ] Build market expansion scoring
- [ ] Build freshness scoring
- [ ] Build source confidence scoring
- [ ] Build company-level job volume scoring
- [ ] Improve company aggregation logic
- [ ] Add structured search APIs
- [ ] Add structured filter APIs
- [ ] Add structured sort APIs
- [ ] Add live run progress updates
- [ ] Add better evidence capture from job descriptions
- [ ] Add better evidence capture from web/company analysis

### Product
- [ ] Make `Company Detail` the hero lead review page
- [ ] Show why the company is a lead
- [ ] Show which roles triggered the signal
- [ ] Show which boards confirmed the signal
- [ ] Show which market-expansion or GTM signal was detected
- [ ] Show how recent the signal is
- [ ] Show whether it is outreach-ready

### Phase 2 Exit Criteria
- [ ] A GTM user can review leads without technical help
- [ ] Top leads are clearly ranked
- [ ] Exports are useful for downstream outreach

---

## Phase 3: Production-Grade Platform

### Frontend
- [ ] Add multi-workspace support
- [ ] Add role-aware views
- [ ] Add audit/history screens
- [ ] Add user onboarding flows
- [ ] Add polished lead handoff workflows

### Backend
- [ ] Reduce dependency on file-based script orchestration
- [ ] Move more scraper logic into clean services
- [ ] Run production workers with Redis + Celery
- [ ] Add scheduled campaigns
- [ ] Add recurring refresh workflows
- [ ] Add observability dashboards
- [ ] Add alerting
- [ ] Add backups
- [ ] Add security controls
- [ ] Add operational limits

### Platform
- [ ] Deploy frontend cleanly in cloud
- [ ] Deploy backend API cleanly in cloud
- [ ] Deploy worker cleanly in cloud
- [ ] Deploy Redis cleanly in cloud
- [ ] Deploy Postgres cleanly in cloud
- [ ] Deploy artifact storage cleanly in cloud
- [ ] Monitor source reliability by board
- [ ] Monitor source reliability by region
- [ ] Harden unstable job boards one by one
- [ ] Add admin source enable/disable controls
- [ ] Add admin fallback routing rules

### Phase 3 Exit Criteria
- [ ] Product supports larger team usage
- [ ] Long-running jobs are reliable
- [ ] Deployments are repeatable
- [ ] Operations are observable

---

## Recommended Priority Order

- [ ] 1. Move to `Postgres`
- [ ] 2. Move artifacts to object storage
- [ ] 3. Improve `Company Detail` into a true lead workspace
- [ ] 4. Add filters, sorting, and pagination
- [ ] 5. Add company scoring and ranking
- [ ] 6. Add shortlist workflow and company exports
- [ ] 7. Add auth and user roles
- [ ] 8. Improve source reliability and diagnostics
- [ ] 9. Harden queue/workers for production
- [ ] 10. Reduce legacy script dependency

---

## Immediate Next Tasks

### Product
- [ ] Improve `Company Detail`
- [ ] Add company ranking
- [ ] Add shortlist actions

### Frontend
- [ ] Add filters
- [ ] Add pagination
- [ ] Add stronger Dashboard charts
- [ ] Add better export entry points

### Backend
- [ ] Migrate to `Postgres`
- [ ] Add object storage
- [ ] Improve source diagnostics
- [ ] Improve source retry handling

### Infra
- [ ] Prepare cloud deployment architecture
- [ ] Remove remaining local-only assumptions

---

## Demo Positioning Checklist

- [ ] Present HireSignal as a hiring-signal lead engine
- [ ] Do not present it as only a job scraper
- [ ] Show campaign creation
- [ ] Show company-level lead evidence
- [ ] Show source health and diagnostics
- [ ] Show exports/reports
- [ ] Show why the lead list is useful for outreach
