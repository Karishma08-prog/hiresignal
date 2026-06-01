# HireSignal Handoff

## What This Package Contains

- Next.js frontend in `src/`
- FastAPI backend in `backend/app/`
- Backend SQLite data in `backend/data/`
- Generated report artifacts in `backend/artifacts/`
- Supporting docs in `docs/`

## Current Local URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api`
- Backend health: `http://localhost:8000/api/health`

## Verified Working Areas

- Frontend routes:
  - `/`
  - `/dashboard`
  - `/scraper`
  - `/campaigns`
  - `/companies`
  - `/job-boards`
  - `/reports`
  - `/settings`
  - `/companies/[companyId]`
  - `/campaign-runs/[runId]`
- Report downloads through `/api/artifacts/{artifactId}/download`
- Campaign run creation and run detail loading
- Dashboard hardened so one client widget cannot blank the entire page

## Current Source Status

- Functional source families now: `19`
- `10` are `live_supported`
- `9` are `fallback_supported`

Functional now:

- Arbeitnow
- Ashby
- Built In
- Greenhouse
- Himalayas
- Indeed
- Jobvite
- Landing Jobs
- Lever
- LinkedIn
- Naukri
- PowerToFly
- Remotive
- SmartRecruiters
- The Muse
- Virtual Vocations
- We Work Remotely
- Workable
- Workday

## Important Limits

- Not all sources are fresh-live on every run.
- Some runs still complete via historical fallback instead of fresh scraping.
- This workspace is not a git repository snapshot, so this handoff is being shared as a packaged project folder.

## Setup Notes

### Frontend

Run from the project root:

```powershell
npm.cmd install
npm.cmd run dev
```

### Backend

Use `backend/.env.example` as the starting environment template.

Run from `backend/`:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Useful Environment Variables

- `SCRAPPA_TOKEN` for ATS discovery
- `JOBS_PROXY` for search-board/browser flows
- `JOBS_BOTA_PROXY` for Botasaurus-backed flows
- `HIRESIGNAL_DB_URL` if the SQLite path needs to move

## Shareable Archive

The packaged handoff archive excludes:

- `node_modules`
- `.next`
- runtime logs
- local secret env files such as `.env` and `.env.local`

It keeps source code, backend code, database data, artifacts, docs, and config needed for handoff.
