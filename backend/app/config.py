from __future__ import annotations

import os
from pathlib import Path


def _load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if value.startswith(("\"", "'")) and value.endswith(("\"", "'")) and len(value) >= 2:
            value = value[1:-1]

        os.environ.setdefault(key, value)


class Settings:
    def __init__(self) -> None:
        backend_root = Path(__file__).resolve().parent.parent
        _load_env_file(backend_root / ".env")
        self.backend_root = backend_root
        self.data_dir = backend_root / "data"
        self.artifacts_dir = backend_root / "artifacts"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)

        default_db_path = self.data_dir / "hiresignal.db"
        configured_db_url = os.getenv("HIRESIGNAL_DB_URL", f"sqlite:///{default_db_path.as_posix()}")
        if configured_db_url.startswith("sqlite:///./"):
            relative_path = configured_db_url.removeprefix("sqlite:///./")
            configured_db_url = f"sqlite:///{(backend_root / relative_path).as_posix()}"
        self.db_url = configured_db_url
        default_scraper_root = backend_root / "scraper"
        self.scraper_root = Path(
            os.getenv(
                "HIRESIGNAL_SCRAPER_ROOT",
                str(default_scraper_root),
            )
        )
        self.results_dir = self.scraper_root / "results"
        self.enable_script_execution = os.getenv(
            "HIRESIGNAL_ENABLE_SCRIPT_EXECUTION", "true"
        ).lower() == "true"
        self.python_exe = os.getenv("HIRESIGNAL_PYTHON_EXE", "python")
        self.scrappa_token = os.getenv("SCRAPPA_TOKEN", "")
        self.jobs_proxy = os.getenv("JOBS_PROXY", "")
        self.jobs_bota_proxy = os.getenv("JOBS_BOTA_PROXY", "")
        self.queue_mode = os.getenv("HIRESIGNAL_QUEUE_MODE", "database")
        self.embedded_worker = os.getenv("HIRESIGNAL_EMBEDDED_WORKER", "true").lower() == "true"
        self.queue_poll_seconds = float(os.getenv("HIRESIGNAL_QUEUE_POLL_SECONDS", "2"))
        self.queue_retry_delay_seconds = int(os.getenv("HIRESIGNAL_QUEUE_RETRY_DELAY_SECONDS", "15"))
        self.queue_max_attempts = int(os.getenv("HIRESIGNAL_QUEUE_MAX_ATTEMPTS", "2"))
        self.queue_stale_after_seconds = int(
            os.getenv("HIRESIGNAL_QUEUE_STALE_AFTER_SECONDS", "180")
        )
        self.worker_heartbeat_seconds = int(
            os.getenv("HIRESIGNAL_WORKER_HEARTBEAT_SECONDS", "15")
        )
        self.search_timeout_seconds = int(
            os.getenv("HIRESIGNAL_SEARCH_TIMEOUT_SECONDS", "90")
        )
        self.ats_fetch_timeout_seconds = int(
            os.getenv("HIRESIGNAL_ATS_FETCH_TIMEOUT_SECONDS", "12")
        )
        self.ats_max_candidate_slugs = int(
            os.getenv("HIRESIGNAL_ATS_MAX_CANDIDATE_SLUGS", "25")
        )
        self.redis_url = os.getenv("HIRESIGNAL_REDIS_URL", "redis://localhost:6379/0")
        self.celery_result_backend = os.getenv(
            "HIRESIGNAL_CELERY_RESULT_BACKEND", self.redis_url
        )
        self.api_token = os.getenv("HIRESIGNAL_API_TOKEN", "").strip()
        self.user_auth_enabled = os.getenv("HIRESIGNAL_USER_AUTH_ENABLED", "true").lower() == "true"
        self.default_admin_name = os.getenv("HIRESIGNAL_DEFAULT_ADMIN_NAME", "HireSignal Admin").strip()
        self.default_admin_email = os.getenv("HIRESIGNAL_DEFAULT_ADMIN_EMAIL", "admin@hiresignal.local").strip().lower()
        self.default_admin_password = os.getenv("HIRESIGNAL_DEFAULT_ADMIN_PASSWORD", "HireSignal123!").strip()
        self.session_hours = int(os.getenv("HIRESIGNAL_SESSION_HOURS", "24"))
        self.artifact_backend = os.getenv("HIRESIGNAL_ARTIFACT_BACKEND", "database").strip().lower()
        self.artifact_preserve_local_copy = os.getenv(
            "HIRESIGNAL_ARTIFACT_PRESERVE_LOCAL_COPY", "true"
        ).lower() == "true"
        self.cleanup_temp_results = os.getenv(
            "HIRESIGNAL_CLEANUP_TEMP_RESULTS", "true"
        ).lower() == "true"
        self.s3_bucket = os.getenv("HIRESIGNAL_S3_BUCKET", "").strip()
        self.s3_region = os.getenv("HIRESIGNAL_S3_REGION", "").strip() or None
        self.s3_endpoint_url = os.getenv("HIRESIGNAL_S3_ENDPOINT_URL", "").strip() or None
        self.s3_access_key_id = os.getenv("HIRESIGNAL_S3_ACCESS_KEY_ID", "").strip() or None
        self.s3_secret_access_key = os.getenv("HIRESIGNAL_S3_SECRET_ACCESS_KEY", "").strip() or None
        self.s3_prefix = os.getenv("HIRESIGNAL_S3_PREFIX", "hiresignal-artifacts").strip().strip("/")


settings = Settings()
