from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import artifacts, campaigns, companies, health, jobs, reports, runs, sources
from app.services.queue import start_embedded_worker, stop_embedded_worker
from app.seed_data import seed_sources
from app.database import SessionLocal


app = FastAPI(
    title="HireSignal Backend",
    version="0.1.0",
    description="API and orchestration layer for HireSignal campaigns, jobs, companies, sources, and reports.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_sources(db)
    finally:
        db.close()
    start_embedded_worker()


@app.on_event("shutdown")
def on_shutdown() -> None:
    stop_embedded_worker()


app.include_router(health.router, prefix="/api")
app.include_router(campaigns.router, prefix="/api")
app.include_router(runs.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(companies.router, prefix="/api")
app.include_router(sources.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(artifacts.router, prefix="/api")
