from __future__ import annotations

import hashlib
import json
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.services.leadership_strategy import (
    campaign_role_family,
    company_keyword_score,
    score_slug_for_campaign,
    title_matches_campaign,
)
from app.services.source_registry import list_all_source_slugs_for_fetch, upsert_source_slug


@dataclass
class PublicAtsJob:
    site_key: str
    company_slug: str
    company_name: str
    title: str
    job_url: str
    location: str | None = None
    date_posted: str | None = None
    description: str | None = None
    is_remote: bool = False
    job_type: str | None = None


def _http_get_json(url: str, *, headers: dict[str, str] | None = None) -> dict | list:
    request = Request(
        url,
        headers={
            "User-Agent": "HireSignal ATS Fetcher/1.0",
            "Accept": "application/json, text/plain, */*",
            **(headers or {}),
        },
    )
    with urlopen(request, timeout=settings.ats_fetch_timeout_seconds) as response:
        payload = response.read().decode("utf-8", errors="ignore")
    return json.loads(payload)


def _http_get_text(url: str, *, headers: dict[str, str] | None = None) -> str:
    request = Request(
        url,
        headers={
            "User-Agent": "HireSignal ATS Fetcher/1.0",
            "Accept": "application/json, application/xml, text/plain, */*",
            **(headers or {}),
        },
    )
    with urlopen(request, timeout=settings.ats_fetch_timeout_seconds) as response:
        return response.read().decode("utf-8", errors="ignore")


def _safe_iso_date(value: str | None) -> str | None:
    raw = (value or "").strip()
    if not raw:
        return None
    return raw[:10]


def _looks_remote(*values: str | None) -> bool:
    text = " ".join(str(value or "") for value in values).lower()
    return "remote" in text or "work from home" in text


def _job_row(job: PublicAtsJob) -> dict[str, str | bool | None]:
    return {
        "id": hashlib.sha1(f"{job.site_key}|{job.job_url}".encode("utf-8")).hexdigest()[:20],
        "site": job.site_key,
        "title": job.title,
        "companyName": job.company_name,
        "location": job.location or "",
        "datePosted": job.date_posted or "",
        "jobType": job.job_type or "",
        "isRemote": job.is_remote,
        "minAmount": "",
        "maxAmount": "",
        "currency": "",
        "description": job.description or "",
        "jobUrl": job.job_url,
    }


def _fetch_greenhouse(slug: str, company_name: str | None, limit: int) -> list[PublicAtsJob]:
    payload = _http_get_json(f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true")
    jobs = payload.get("jobs", []) if isinstance(payload, dict) else []
    output: list[PublicAtsJob] = []
    for item in jobs[:limit]:
        output.append(
            PublicAtsJob(
                site_key="greenhouse",
                company_slug=slug,
                company_name=company_name or slug.replace("-", " ").title(),
                title=str(item.get("title") or "").strip(),
                job_url=str(item.get("absolute_url") or "").strip(),
                location=str((item.get("location") or {}).get("name") or "").strip() or None,
                date_posted=_safe_iso_date(str(item.get("updated_at") or "")),
                description=str(item.get("content") or "").strip() or None,
                is_remote=_looks_remote((item.get("location") or {}).get("name")),
            )
        )
    return [job for job in output if job.title and job.job_url]


def _fetch_lever(slug: str, company_name: str | None, limit: int) -> list[PublicAtsJob]:
    payload = _http_get_json(f"https://api.lever.co/v0/postings/{slug}?mode=json")
    items = payload if isinstance(payload, list) else []
    output: list[PublicAtsJob] = []
    for item in items[:limit]:
        categories = item.get("categories") or {}
        location = str(categories.get("location") or "").strip() or None
        output.append(
            PublicAtsJob(
                site_key="lever",
                company_slug=slug,
                company_name=company_name or slug.replace("-", " ").title(),
                title=str(item.get("text") or "").strip(),
                job_url=str(item.get("hostedUrl") or item.get("applyUrl") or "").strip(),
                location=location,
                date_posted=_safe_iso_date(str(item.get("createdAt") or "")),
                description=str(item.get("descriptionPlain") or item.get("description") or "").strip() or None,
                is_remote=_looks_remote(location),
                job_type=str(categories.get("commitment") or "").strip() or None,
            )
        )
    return [job for job in output if job.title and job.job_url]


def _fetch_smartrecruiters(slug: str, company_name: str | None, limit: int) -> list[PublicAtsJob]:
    payload = _http_get_json(
        f"https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit={max(limit, 25)}"
    )
    items = payload.get("content", []) if isinstance(payload, dict) else []
    output: list[PublicAtsJob] = []
    for item in items[:limit]:
        ref = str(item.get("ref") or "").strip()
        job_url = str(item.get("ref") or item.get("applyUrl") or "").strip()
        if ref and not job_url.startswith("http"):
            job_url = f"https://jobs.smartrecruiters.com/{slug}/{ref}"
        location = ""
        if isinstance(item.get("location"), dict):
            location = str(item["location"].get("city") or "")
        else:
            location = str(item.get("location") or "")
        country = ""
        if isinstance(item.get("location"), dict):
            country = str(item["location"].get("country") or "")
        output.append(
            PublicAtsJob(
                site_key="smartrecruiters",
                company_slug=slug,
                company_name=company_name or slug.replace("-", " ").title(),
                title=str(item.get("name") or "").strip(),
                job_url=job_url.strip(),
                location=", ".join(part for part in [location.strip(), country.strip()] if part) or None,
                date_posted=_safe_iso_date(str(item.get("releasedDate") or "")),
                description=str(item.get("jobAd", {}).get("sections", ""))[:5000] if isinstance(item.get("jobAd"), dict) else None,
                is_remote=_looks_remote(location, country),
            )
        )
    return [job for job in output if job.title and job.job_url]


def _fetch_recruitee(slug: str, company_name: str | None, limit: int) -> list[PublicAtsJob]:
    payload = _http_get_json(f"https://{slug}.recruitee.com/api/offers/")
    items = payload.get("offers", []) if isinstance(payload, dict) else []
    output: list[PublicAtsJob] = []
    for item in items[:limit]:
        location = str(item.get("location") or "").strip() or None
        output.append(
            PublicAtsJob(
                site_key="recruitee",
                company_slug=slug,
                company_name=company_name or slug.replace("-", " ").title(),
                title=str(item.get("title") or "").strip(),
                job_url=str(item.get("careers_url") or item.get("apply_url") or "").strip(),
                location=location,
                date_posted=_safe_iso_date(str(item.get("updated_at") or item.get("created_at") or "")),
                description=str(item.get("description") or "").strip() or None,
                is_remote=_looks_remote(location),
            )
        )
    return [job for job in output if job.title and job.job_url]


def _fetch_breezyhr(slug: str, company_name: str | None, limit: int) -> list[PublicAtsJob]:
    payload = _http_get_json(f"https://{slug}.breezy.hr/json")
    items = payload if isinstance(payload, list) else []
    output: list[PublicAtsJob] = []
    for item in items[:limit]:
        location = str(item.get("location", {}).get("name") or "").strip() if isinstance(item.get("location"), dict) else str(item.get("location") or "").strip()
        output.append(
            PublicAtsJob(
                site_key="breezyhr",
                company_slug=slug,
                company_name=company_name or slug.replace("-", " ").title(),
                title=str(item.get("name") or "").strip(),
                job_url=str(item.get("url") or "").strip(),
                location=location or None,
                date_posted=_safe_iso_date(str(item.get("published_date") or item.get("date") or "")),
                description=str(item.get("description") or "").strip() or None,
                is_remote=_looks_remote(location),
            )
        )
    return [job for job in output if job.title and job.job_url]


def _fetch_pinpoint(slug: str, company_name: str | None, limit: int) -> list[PublicAtsJob]:
    payload = _http_get_json(f"https://{slug}.pinpointhq.com/postings.json")
    items = payload.get("postings", payload if isinstance(payload, list) else []) if isinstance(payload, (list, dict)) else []
    output: list[PublicAtsJob] = []
    for item in items[:limit]:
        location = str(item.get("location") or "").strip() or None
        output.append(
            PublicAtsJob(
                site_key="pinpoint",
                company_slug=slug,
                company_name=company_name or slug.replace("-", " ").title(),
                title=str(item.get("title") or "").strip(),
                job_url=str(item.get("absolute_url") or item.get("url") or "").strip(),
                location=location,
                date_posted=_safe_iso_date(str(item.get("updated_at") or item.get("created_at") or "")),
                description=str(item.get("description") or "").strip() or None,
                is_remote=_looks_remote(location),
            )
        )
    return [job for job in output if job.title and job.job_url]


def _fetch_manatal(slug: str, company_name: str | None, limit: int) -> list[PublicAtsJob]:
    payload = _http_get_json(f"https://api.manatal.com/open/v1/career-page/{slug}/jobs")
    items = payload.get("results", payload.get("jobs", [])) if isinstance(payload, dict) else []
    output: list[PublicAtsJob] = []
    for item in items[:limit]:
        location = str(item.get("location_name") or item.get("location") or "").strip() or None
        output.append(
            PublicAtsJob(
                site_key="manatal",
                company_slug=slug,
                company_name=company_name or slug.replace("-", " ").title(),
                title=str(item.get("position_name") or item.get("title") or "").strip(),
                job_url=str(item.get("job_url") or item.get("apply_url") or "").strip(),
                location=location,
                date_posted=_safe_iso_date(str(item.get("created_at") or item.get("updated_at") or "")),
                description=str(item.get("description") or "").strip() or None,
                is_remote=_looks_remote(location),
            )
        )
    return [job for job in output if job.title and job.job_url]


def _fetch_personio(slug: str, company_name: str | None, limit: int) -> list[PublicAtsJob]:
    text = _http_get_text(f"https://{slug}.jobs.personio.de/xml?language=en")
    root = ET.fromstring(text)
    output: list[PublicAtsJob] = []
    for position in root.findall(".//position")[:limit]:
        title = (position.findtext("name") or "").strip()
        office = (position.findtext("office") or "").strip()
        detail_url = (position.findtext("url") or "").strip()
        description = (position.findtext("jobDescriptions/jobDescription/value") or "").strip()
        output.append(
            PublicAtsJob(
                site_key="personio",
                company_slug=slug,
                company_name=company_name or slug.replace("-", " ").title(),
                title=title,
                job_url=detail_url,
                location=office or None,
                description=description or None,
                is_remote=_looks_remote(office, description),
            )
        )
    return [job for job in output if job.title and job.job_url]


def _fetch_workable(slug: str, company_name: str | None, limit: int) -> list[PublicAtsJob]:
    payload = _http_get_json(f"https://apply.workable.com/api/v3/accounts/{slug}/jobs")
    if isinstance(payload, dict):
        items = payload.get("results") or payload.get("jobs") or payload.get("items") or []
    else:
        items = payload
    output: list[PublicAtsJob] = []
    for item in items[:limit]:
        location = str(item.get("location", {}).get("city") or item.get("location") or "").strip()
        if isinstance(item.get("location"), dict):
            country = str(item["location"].get("country") or "").strip()
            location = ", ".join(part for part in [location, country] if part)
        job_url = str(item.get("url") or item.get("shortcode") or "").strip()
        if job_url and not job_url.startswith("http"):
            job_url = f"https://apply.workable.com/{slug}/j/{job_url}"
        output.append(
            PublicAtsJob(
                site_key="workable",
                company_slug=slug,
                company_name=company_name or slug.replace("-", " ").title(),
                title=str(item.get("title") or item.get("name") or "").strip(),
                job_url=job_url,
                location=location or None,
                date_posted=_safe_iso_date(str(item.get("published") or item.get("created_at") or item.get("updated_at") or "")),
                description=str(item.get("description") or item.get("description_plain") or "").strip() or None,
                is_remote=_looks_remote(location, str(item.get("employment_type") or "")),
                job_type=str(item.get("employment_type") or "").strip() or None,
            )
        )
    return [job for job in output if job.title and job.job_url]


PUBLIC_ATS_FETCHERS: dict[str, Callable[[str, str | None, int], list[PublicAtsJob]]] = {
    "greenhouse": _fetch_greenhouse,
    "lever": _fetch_lever,
    "smartrecruiters": _fetch_smartrecruiters,
    "workable": _fetch_workable,
    "recruitee": _fetch_recruitee,
    "breezyhr": _fetch_breezyhr,
    "pinpoint": _fetch_pinpoint,
    "manatal": _fetch_manatal,
    "personio": _fetch_personio,
}


def fetch_public_ats_board_jobs(
    db: Session,
    *,
    site_key: str,
    campaign: models.Campaign | None = None,
    limit: int = 25,
) -> tuple[list[dict[str, str | bool | None]], str | None]:
    fetcher = PUBLIC_ATS_FETCHERS.get(site_key)
    if fetcher is None:
        return [], "No public fetcher is available for this ATS family yet."

    rows: list[dict[str, str | bool | None]] = []
    seen_urls: set[str] = set()
    last_error: str | None = None
    campaign_scope = ""
    us_scope = False
    include_geo_terms: tuple[str, ...] = ()
    exclude_geo_terms: tuple[str, ...] = ()
    minimum_score = 1
    if campaign is not None:
        campaign_scope = " ".join(
            str(item or "")
            for item in [
                campaign.country,
                campaign.location,
                (campaign.objective_filter_config or {}).get("targetMarket"),
            ]
        ).lower()
        us_scope = any(token in campaign_scope for token in ("united states", "usa", "north america"))
        if us_scope:
            include_geo_terms = (
                "united states",
                "usa",
                "us ",
                " us",
                "new york",
                "california",
                "texas",
                "seattle",
                "boston",
                "austin",
                "chicago",
                "remote us",
                "remote - united states",
            )
            exclude_geo_terms = (
                "india",
                "singapore",
                "japan",
                "vietnam",
                "philippines",
                "indonesia",
                "malaysia",
                "taiwan",
                "latam",
                "emea",
                "europe",
                "apac",
            )
    candidate_slugs = list_all_source_slugs_for_fetch(
        db,
        site_key,
        limit=max(settings.ats_max_candidate_slugs, 1),
    )
    if campaign is not None:
        candidate_slugs = sorted(
            candidate_slugs,
            key=lambda slug: (
                score_slug_for_campaign(
                    campaign,
                    company_name=slug.company_name,
                    company_slug=slug.company_slug,
                    job_board_url=slug.job_board_url,
                ),
                slug.last_verified_at or slug.last_discovered_at or datetime.min,
            ),
            reverse=True,
        )

    rows_with_score: list[tuple[int, dict[str, str | bool | None]]] = []
    per_slug_limit = max(min(limit, 10), 5)
    max_candidate_slugs = max(settings.ats_max_candidate_slugs, 1)
    for slug in candidate_slugs[:max_candidate_slugs]:
        try:
            jobs = fetcher(slug.company_slug, slug.company_name, per_slug_limit)
        except (HTTPError, URLError, TimeoutError, ET.ParseError, json.JSONDecodeError, ValueError) as exc:
            slug.last_error = str(exc)[:300]
            last_error = str(exc)[:300]
            continue
        except Exception as exc:  # pragma: no cover - defensive guard for vendor payload drift
            slug.last_error = str(exc)[:300]
            last_error = str(exc)[:300]
            continue

        if jobs:
            slug.status = "verified"
            slug.last_verified_at = datetime.utcnow()
            slug.last_error = None
        slug_score = 0
        if campaign is not None:
            slug_score = max(
                score_slug_for_campaign(
                    campaign,
                    company_name=slug.company_name,
                    company_slug=slug.company_slug,
                    job_board_url=slug.job_board_url,
                ),
                0,
            )
        for job in jobs:
            if job.job_url in seen_urls:
                continue
            seen_urls.add(job.job_url)
            row = _job_row(job)
            score = 0
            if campaign is not None:
                title_ok = title_matches_campaign(job.title, campaign)
                score += 8 if title_ok else 0
                niche_score, _ = company_keyword_score(
                    campaign,
                    company_name=job.company_name,
                    description=job.description,
                    title=job.title,
                    domain=job.job_url,
                    location=job.location,
                )
                score += niche_score * 3
                location_text = " ".join(str(item or "") for item in [job.location, job.description]).lower()
                if us_scope:
                    explicit_us = any(token in location_text for token in include_geo_terms)
                    explicit_excluded = any(token in location_text for token in exclude_geo_terms)
                    if explicit_excluded and not explicit_us:
                        continue
                    if explicit_us:
                        score += 5
                if job.is_remote:
                    score += 1
                score += slug_score

                role_family = campaign_role_family(campaign)
                keep_row = title_ok or niche_score >= 2 or slug_score >= 3
                if role_family == "finance_leadership":
                    keep_row = keep_row or any(token in (job.title or "").lower() for token in ("finance", "financial", "controller", "accounting", "cfo"))
                elif role_family == "marketing_leadership":
                    keep_row = keep_row or any(token in (job.title or "").lower() for token in ("marketing", "growth", "brand", "creative", "acquisition"))
                elif role_family == "revenue_leadership":
                    keep_row = keep_row or any(token in (job.title or "").lower() for token in ("sales", "revenue", "partnership", "business development", "account executive"))
                elif role_family == "operations_leadership":
                    keep_row = keep_row or any(token in (job.title or "").lower() for token in ("operations", "ecommerce", "logistics", "distribution", "supply chain"))

                if not keep_row or score < minimum_score:
                    continue
            rows_with_score.append((score, row))

    if rows_with_score:
        rows_with_score.sort(key=lambda item: item[0], reverse=True)
        rows = [row for _, row in rows_with_score[:limit]]
        return rows, None
    return [], last_error or "No public ATS jobs were returned from known slugs."


def write_public_ats_csv(
    path: Path,
    rows: list[dict[str, str | bool | None]],
) -> None:
    import csv

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "id",
                "site",
                "title",
                "companyName",
                "location",
                "datePosted",
                "jobType",
                "isRemote",
                "minAmount",
                "maxAmount",
                "currency",
                "description",
                "jobUrl",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)


def register_discovered_ats_rows(db: Session, ats_rows: list[dict]) -> None:
    for row in ats_rows:
        site_key = str(row.get("ats") or "").strip().lower()
        company_slug = str(row.get("companySlug") or "").strip()
        if not site_key or not company_slug:
            continue
        upsert_source_slug(
            db,
            site_key=site_key,
            company_slug=company_slug,
            company_name=(str(row.get("title") or "").strip() or None),
            job_board_url=(str(row.get("jobUrl") or "").strip() or None),
            discovery_method="ats_search_discovery",
            status="verified" if str(row.get("urlType") or "").strip().lower() == "post" else "discovered",
            notes="Captured from ATS discovery search results.",
        )
