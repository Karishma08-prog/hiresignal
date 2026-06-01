from __future__ import annotations

import json
import os
import subprocess
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from app.config import settings


@dataclass
class ScriptResult:
    command: list[str]
    exit_code: int
    stdout: str
    stderr: str


class ScriptWorkerService:
    def __init__(self) -> None:
        self.root = settings.scraper_root
        self.python_exe = settings.python_exe
        fallback_bota_python = Path.home() / "botavenv" / "Scripts" / "python.exe"
        env_bota_python = os.getenv("HIRESIGNAL_BOTA_PYTHON_EXE", "").strip()
        if env_bota_python:
            self.browser_python_exe = env_bota_python
        elif fallback_bota_python.exists():
            self.browser_python_exe = str(fallback_bota_python)
        else:
            self.browser_python_exe = self.python_exe
        self.env = os.environ.copy()
        self.env["PYTHONUNBUFFERED"] = "1"
        if settings.scrappa_token:
            self.env["SCRAPPA_TOKEN"] = settings.scrappa_token
        if settings.jobs_proxy:
            self.env["JOBS_PROXY"] = settings.jobs_proxy
        if settings.jobs_bota_proxy:
            self.env["JOBS_BOTA_PROXY"] = settings.jobs_bota_proxy
        self.ever_jobs_root = self.root / "ever-jobs"

    def _terminate_process_tree(self, process: subprocess.Popen) -> None:
        try:
            subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                capture_output=True,
                text=True,
                check=False,
                timeout=15,
            )
        except Exception:
            try:
                process.kill()
            except Exception:
                pass

    def _run_process(
        self,
        command: Sequence[str],
        *,
        cwd: Path | None = None,
        timeout: int = 900,
        input_text: str | None = None,
    ) -> ScriptResult:
        creationflags = 0
        if hasattr(subprocess, "CREATE_NEW_PROCESS_GROUP"):
            creationflags = subprocess.CREATE_NEW_PROCESS_GROUP

        process = subprocess.Popen(
            list(command),
            cwd=str(cwd or self.root),
            env=self.env,
            stdin=subprocess.PIPE if input_text is not None else None,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            creationflags=creationflags,
        )

        try:
            stdout, stderr = process.communicate(input=input_text, timeout=timeout)
            return ScriptResult(
                command=list(command),
                exit_code=process.returncode,
                stdout=stdout,
                stderr=stderr,
            )
        except subprocess.TimeoutExpired as exc:
            self._terminate_process_tree(process)
            try:
                stdout, stderr = process.communicate(timeout=5)
            except Exception:
                stdout = exc.stdout or ""
                stderr = exc.stderr or ""
            return ScriptResult(
                command=list(command),
                exit_code=124,
                stdout=stdout or exc.stdout or "",
                stderr=((stderr or exc.stderr or "") + f"\nCommand timed out after {timeout} seconds.").strip(),
            )

    def _run(self, command: list[str], cwd: Path | None = None, timeout: int = 900) -> ScriptResult:
        try:
            return self._run_process(command, cwd=cwd, timeout=timeout)
        except Exception as exc:
            return ScriptResult(command=command, exit_code=1, stdout="", stderr=str(exc))

    def _run_with_input(
        self,
        command: list[str],
        *,
        cwd: Path | None = None,
        timeout: int = 900,
        input_text: str = "",
    ) -> ScriptResult:
        try:
            return self._run_process(command, cwd=cwd, timeout=timeout, input_text=input_text)
        except Exception as exc:
            return ScriptResult(command=command, exit_code=1, stdout="", stderr=str(exc))

    def run_india_marketing(self) -> ScriptResult:
        return self._run(["node", "india-marketing.mjs"])

    def run_find_jobs(self) -> ScriptResult:
        return self._run(["node", "find-jobs.mjs"])

    def run_extra_boards(self) -> ScriptResult:
        return self._run(["node", "extra-boards.mjs"])

    def run_scrappa_ats(self) -> ScriptResult:
        return self._run(["node", "scrappa_ats.mjs"])

    def run_naukri_description_enrichment(self, input_csv: str, output_csv: str, limit: int = 0) -> ScriptResult:
        command = [
            self.python_exe,
            "naukri_desc.py",
            "--in",
            input_csv,
            "--out",
            output_csv,
        ]
        if limit > 0:
            command.extend(["--limit", str(limit)])
        return self._run(command)

    def run_build_excel(self) -> ScriptResult:
        return self._run([self.python_exe, "build_excel.py"])

    def run_add_us_target_companies_tab(self) -> ScriptResult:
        return self._run([self.python_exe, "add_us_target_companies_tab.py"])

    def run_bota_scraper(self, config: dict) -> ScriptResult:
        config_path = settings.data_dir / f"bota_config_{uuid.uuid4().hex}.json"
        config_path.write_text(json.dumps(config), encoding="utf-8")
        budget = int(config.get("budgetSec") or 0)
        timeout = max(25, budget + 10)
        try:
            return self._run(
                [self.browser_python_exe, "bota_scraper.py", str(config_path)],
                timeout=timeout,
            )
        finally:
            try:
                config_path.unlink(missing_ok=True)
            except Exception:
                pass

    def run_ever_jobs_search(self, payload: dict, output_csv: str) -> ScriptResult:
        command = [
            "node",
            "cli-run.cjs",
            "search",
            "--stdin",
            "-f",
            "csv",
            "-o",
            output_csv,
        ]
        return self._run_with_input(
            command,
            cwd=self.ever_jobs_root,
            timeout=1200,
            input_text=json.dumps(payload),
        )
