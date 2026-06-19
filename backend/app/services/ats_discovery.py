from __future__ import annotations

import csv
import json
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen

from app.services.source_catalog import ATS_SITE_MAP


def _gl_code(country: str) -> str:
    normalized = (country or "").strip().upper()
    mapping = {
        "INDIA": "in",
        "USA": "us",
        "UK": "uk",
        "CANADA": "ca",
        "AUSTRALIA": "au",
        "GERMANY": "de",
        "GLOBAL": "us",
        "WORLD": "us",
    }
    return mapping.get(normalized, "us")


def _slug_and_type(ats_name: str, link: str) -> tuple[str, str]:
    try:
        parsed = urlparse(link)
        hostname = (parsed.hostname or "").lower()
        parts = [part for part in parsed.path.split("/") if part]
        query = parse_qs(parsed.query)
        if ats_name == "workday":
            return parsed.hostname.split(".")[0] if parsed.hostname else "", "post" if "/job/" in parsed.path else "board"
        slug = parts[0] if parts else ""
        if ats_name in {"lever", "ashby", "smartrecruiters"}:
            return slug, "post" if len(parts) >= 2 else "board"
        if ats_name == "greenhouse":
            return slug, "post" if "jobs" in parts else "board"
        if ats_name == "jobvite":
            return slug, "post" if "job" in parts else "board"
        if ats_name == "workable":
            return slug, "post" if "j" in parts else "board"
        if ats_name in {"bamboohr", "recruitee", "freshteam", "jazzhr", "breezyhr", "pinpoint", "trakstar"}:
            host_slug = hostname.split(".")[0] if hostname else ""
            return host_slug, "post" if len(parts) >= 2 else "board"
        if ats_name == "personio":
            host_slug = hostname.split(".")[0] if hostname else ""
            return host_slug, "post" if "job" in parts else "board"
        if ats_name in {"rippling", "teamtailor", "loxo", "manatal", "homerun"}:
            return slug, "post" if len(parts) >= 2 else "board"
        if ats_name == "icims":
            host_slug = hostname.split(".")[0] if hostname else ""
            return host_slug, "post" if query else "board"
        if ats_name == "taleo":
            host_slug = hostname.split(".")[0] if hostname else ""
            return host_slug, "post" if "jobdetail" in parsed.path.lower() else "board"
        if ats_name == "successfactors":
            company_id = (query.get("company") or [""])[0]
            instance = hostname.split(".")[0] if hostname else ""
            return (f"{instance}:{company_id}" if company_id else instance), "post" if "job" in parsed.path.lower() else "board"
        if ats_name == "adp":
            adp_id = (query.get("cid") or query.get("client") or [""])[0]
            return adp_id, "post" if "job" in parsed.path.lower() else "board"
        if ats_name == "ukg":
            ukg_slug = parts[0] if parts else ""
            return ukg_slug, "post" if len(parts) >= 2 else "board"
        if ats_name == "comeet":
            company = parts[3] if len(parts) >= 4 and parts[0] == "careers-api" else ""
            return company, "post" if "positions" in parts else "board"
        if ats_name == "paylocity":
            guid = parts[-1] if parts else ""
            return guid, "post" if guid else "board"
        if ats_name == "bullhorn":
            cls = hostname.removeprefix("public-rest").split(".")[0] if hostname else ""
            corp_token = parts[1] if len(parts) >= 2 and parts[0] == "rest-services" else ""
            combined = f"{cls}:{corp_token}" if cls and corp_token else ""
            return combined, "post" if "entity" in parts else "board"
        if ats_name == "hiringthing":
            company = (query.get("company") or [""])[0]
            return company, "post" if "jobs" in parts else "board"
        if ats_name == "fountain":
            company = (query.get("company") or query.get("company_slug") or [""])[0]
            return company, "post" if "openings" in parts else "board"
        if ats_name == "deel":
            company = (query.get("company") or [""])[0]
            return company, "post" if "job-postings" in parts else "board"
        if ats_name == "phenom":
            company = hostname.split(".")[1] if hostname.startswith("jobs.") and hostname.count(".") >= 2 else ""
            return company, "post" if "jobs" in parts else "board"
        if ats_name == "jobylon":
            company = parts[1] if len(parts) >= 2 and parts[0] == "feeds" else ""
            return company, "post" if len(parts) >= 3 else "board"
        if ats_name == "jobscore":
            company = (query.get("c") or query.get("company") or [""])[0]
            return company, "post" if "jobs" in parts else "board"
        if ats_name == "talentlyft":
            company = (query.get("company") or [""])[0]
            return company, "post" if "jobs" in parts else "board"
        if ats_name == "crelate":
            company = parts[1] if len(parts) >= 2 and parts[0] == "api3" else ""
            return company, "post" if "jobs" in parts else "board"
        if ats_name == "ismartrecruit":
            company = (query.get("company") or query.get("slug") or [""])[0]
            return company, "post" if "websitejsonapi" in parsed.path.lower() else "board"
        if ats_name == "recruiterflow":
            company = (query.get("company_name") or query.get("company") or [""])[0]
            return company, "post" if "job" in parts else "board"
        return slug, "board"
    except Exception:
        return "", ""


def _scrappa_search(token: str, query: str, gl: str, page: int) -> list[dict]:
    params = urlencode(
        {
            "query": query,
            "hl": "en",
            "gl": gl,
            "amount": 10,
            "page": page,
        }
    )
    request = Request(
        f"https://scrappa.co/api/search?{params}",
        headers={"x-api-key": token},
    )
    with urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return payload.get("organic_results", [])


def run_generic_ats_discovery(
    *,
    token: str,
    role_query: str,
    country: str,
    location: str,
    ats_boards: list[str],
    output_csv: Path,
    max_pages: int = 2,
) -> int:
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    gl = _gl_code(country)
    selected = [board for board in ats_boards if board in ATS_SITE_MAP]
    if not selected:
        output_csv.write_text("", encoding="utf-8")
        return 0

    seen_links: set[str] = set()
    rows: list[dict[str, str]] = []

    for ats_name in selected:
        for site in ATS_SITE_MAP[ats_name]:
            query_candidates = [
                f"site:{site} ({role_query}) {location}".strip(),
                f"site:{site} ({role_query})".strip(),
                f"site:{site} (jobs OR careers OR hiring)".strip(),
            ]

            found_for_site = False
            for query in query_candidates:
                for page in range(max_pages):
                    try:
                        results = _scrappa_search(token, query, gl, page)
                    except Exception:
                        break
                    if not results:
                        break
                    for item in results:
                        link = str(item.get("link") or "").strip()
                        if not link or link in seen_links:
                            continue
                        seen_links.add(link)
                        slug, url_type = _slug_and_type(ats_name, link)
                        rows.append(
                            {
                                "ats": ats_name,
                                "companySlug": slug,
                                "urlType": url_type,
                                "title": str(item.get("title") or "").strip(),
                                "jobUrl": link,
                                "snippet": str(item.get("snippet") or "").strip()[:300],
                            }
                        )
                    if results:
                        found_for_site = True
                    if len(results) < 10:
                        break
                if found_for_site:
                    break

    with output_csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["ats", "companySlug", "urlType", "title", "jobUrl", "snippet"],
        )
        writer.writeheader()
        writer.writerows(rows)

    return len(rows)
