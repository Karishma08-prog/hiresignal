# HireSignal Backend

FastAPI backend scaffold for the HireSignal frontend.

## Run API

```powershell
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

## Run worker

### Redis + Celery worker

```powershell
cd backend
celery -A app.services.celery_app.celery_app worker --loglevel=info
```

### Database worker fallback

```powershell
cd backend
python run_worker.py
```

## API docs

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## Notes

- Uses SQLite by default at `backend/data/hiresignal.db`
- Seeds job-board source records on first startup
- Includes script-service wrappers for the existing scraper files under:
  `C:\Users\HP\Desktop\Basis VPS\Jobs scraper\Jobs scraper`
- Campaign runs now execute through a durable queue layer:
  - create run
  - enqueue a `queue_job`
  - dispatch to Redis + Celery when `HIRESIGNAL_QUEUE_MODE=celery`
  - or use the database worker fallback when `HIRESIGNAL_QUEUE_MODE=database`
  - optionally invoke existing scraper scripts when enabled/configured
  - discover CSV/XLSX outputs in the scraper `results` folder
  - ingest real jobs, companies, source health, reports, and artifacts into the backend DB
  - fall back to a small demo record only when no output files are available

## Implemented routes

- `GET /api/health`
- `POST /api/campaigns`
- `GET /api/campaigns`
- `GET /api/campaigns/{campaignId}`
- `PATCH /api/campaigns/{campaignId}`
- `POST /api/campaigns/{campaignId}/run`
- `GET /api/campaign-runs`
- `GET /api/campaign-runs/{runId}`
- `GET /api/campaign-runs/{runId}/queue`
- `GET /api/campaign-runs/{runId}/jobs`
- `GET /api/campaign-runs/{runId}/companies`
- `GET /api/jobs`
- `GET /api/companies`
- `GET /api/companies/{companyId}`
- `GET /api/sources`
- `GET /api/sources/health`
- `GET /api/sources/credentials`
- `GET /api/sources/overview`
- `GET /api/reports`
- `GET /api/reports/{reportId}`
- `GET /api/artifacts/{artifactId}`
- `GET /api/artifacts/{artifactId}/download`
- `GET /api/campaign-runs/{runId}/logs`

## Existing script bridge

The existing scraper codebase is connected through service wrappers in
`backend/app/services/script_workers.py`.

- `india-marketing.mjs`
- `find-jobs.mjs` (wrapped, but not auto-run because it is interactive)
- `extra-boards.mjs`
- `scrappa_ats.mjs`
- `bota_scraper.py`
- `naukri_desc.py`
- `build_excel.py`
- `add_us_target_companies_tab.py`

Set `HIRESIGNAL_ENABLE_SCRIPT_EXECUTION=true` to let campaign runs call those
workers. Without that flag, the backend still creates a complete demo run so
the frontend can be developed against real endpoints immediately.

## Environment

Optional environment variables:

```text
HIRESIGNAL_DB_URL=sqlite:///./data/hiresignal.db
HIRESIGNAL_SCRAPER_ROOT=C:\Users\HP\Desktop\Basis VPS\Jobs scraper\Jobs scraper
HIRESIGNAL_ENABLE_SCRIPT_EXECUTION=false
HIRESIGNAL_PYTHON_EXE=python
SCRAPPA_TOKEN=
JOBS_PROXY=
JOBS_BOTA_PROXY=
HIRESIGNAL_QUEUE_MODE=celery
HIRESIGNAL_REDIS_URL=redis://localhost:6379/0
HIRESIGNAL_CELERY_RESULT_BACKEND=redis://localhost:6379/0
HIRESIGNAL_EMBEDDED_WORKER=false
HIRESIGNAL_QUEUE_POLL_SECONDS=2
HIRESIGNAL_QUEUE_RETRY_DELAY_SECONDS=15
HIRESIGNAL_QUEUE_MAX_ATTEMPTS=2
```

The old hardcoded Scrappa token and proxy defaults were removed from the
external scraper scripts. Provide them through environment variables instead.

For local development, Redis must be running before you start the Celery worker.
If you want a lower-dependency fallback, set `HIRESIGNAL_QUEUE_MODE=database`
and the API can continue using the embedded or dedicated database worker.
