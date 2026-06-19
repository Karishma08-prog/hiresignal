from __future__ import annotations

from collections import defaultdict
from threading import Lock
from time import time


class RuntimeMetrics:
    def __init__(self) -> None:
        self.started_at = time()
        self._lock = Lock()
        self._request_count = 0
        self._error_count = 0
        self._route_stats: dict[str, dict[str, float | int]] = defaultdict(
            lambda: {
                "count": 0,
                "errors": 0,
                "lastStatus": 0,
                "lastDurationMs": 0.0,
            }
        )

    def record_request(self, *, method: str, path: str, status_code: int, duration_ms: float) -> None:
        key = f"{method.upper()} {path}"
        with self._lock:
            self._request_count += 1
            if status_code >= 500:
                self._error_count += 1
            route = self._route_stats[key]
            route["count"] = int(route["count"]) + 1
            route["lastStatus"] = status_code
            route["lastDurationMs"] = round(duration_ms, 2)
            if status_code >= 500:
                route["errors"] = int(route["errors"]) + 1

    def snapshot(self) -> dict:
        with self._lock:
            sorted_routes = sorted(
                self._route_stats.items(),
                key=lambda item: int(item[1]["count"]),
                reverse=True,
            )
            top_routes = [
                {"route": route, **stats}
                for route, stats in sorted_routes[:25]
            ]
            return {
                "uptimeSeconds": round(time() - self.started_at, 1),
                "requestCount": self._request_count,
                "errorCount": self._error_count,
                "topRoutes": top_routes,
            }


runtime_metrics = RuntimeMetrics()
