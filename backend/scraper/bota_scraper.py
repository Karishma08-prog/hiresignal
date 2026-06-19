"""
bota_scraper.py — Botasaurus-based scraper for the anti-bot job boards that the
ever-jobs HTTP scrapers can't reach (Indeed, ZipRecruiter, Glassdoor).

Uses a stealth browser + (optional) rotating residential proxy to bypass the
fingerprint/anti-bot blocks that cause plain-HTTP 403s.

Input : a JSON config object on STDIN, e.g.
  {
    "searchTerm": "data analyst",
    "country": "USA",            # ever-jobs Country enum code
    "location": "United States", # free-text location (optional)
    "days": 14,                  # only jobs posted within N days
    "resultsWanted": 25,         # per site
    "sites": ["indeed"],         # subset of indeed / zip_recruiter / glassdoor
    "proxy": "http://user:pass@host:port",   # optional
    "outputCsv": "results/bota_xxx.csv",     # where to write
    "headless": true
  }

Output: writes a CSV (ever-jobs schema) to outputCsv and prints a JSON summary
        {"counts": {"indeed": N}, "total": M, "csv": "..."} to STDOUT.
"""
import csv
import json
import os
import sys
import threading
import time
import datetime as dt
from urllib.parse import quote_plus

from botasaurus.browser import browser, Driver
try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None

# ── ever-jobs CSV schema (must match apps/cli search.command toCsv) ──────────
CSV_FIELDS = [
    "id", "site", "title", "companyName", "location", "jobUrl",
    "datePosted", "jobType", "isRemote", "minAmount", "maxAmount",
    "currency", "interval", "description",
]

# Country enum code -> Indeed subdomain (www = indeed.com).
INDEED_SUBDOMAIN = {
    "ARGENTINA": "ar", "AUSTRALIA": "au", "AUSTRIA": "at", "BAHRAIN": "bh",
    "BANGLADESH": "bd", "BELGIUM": "be", "BULGARIA": "bg", "BRAZIL": "br",
    "CANADA": "ca", "CHILE": "cl", "CHINA": "cn", "COLOMBIA": "co",
    "COSTARICA": "cr", "CROATIA": "hr", "CYPRUS": "cy", "CZECHREPUBLIC": "cz",
    "DENMARK": "dk", "ECUADOR": "ec", "EGYPT": "eg", "ESTONIA": "ee",
    "FINLAND": "fi", "FRANCE": "fr", "GERMANY": "de", "GREECE": "gr",
    "HONGKONG": "hk", "HUNGARY": "hu", "INDIA": "in", "INDONESIA": "id",
    "IRELAND": "ie", "ISRAEL": "il", "ITALY": "it", "JAPAN": "jp",
    "KUWAIT": "kw", "LATVIA": "lv", "LITHUANIA": "lt", "LUXEMBOURG": "lu",
    "MALAYSIA": "malaysia", "MALTA": "malta", "MEXICO": "mx", "MOROCCO": "ma",
    "NETHERLANDS": "nl", "NEWZEALAND": "nz", "NIGERIA": "ng", "NORWAY": "no",
    "OMAN": "om", "PAKISTAN": "pk", "PANAMA": "pa", "PERU": "pe",
    "PHILIPPINES": "ph", "POLAND": "pl", "PORTUGAL": "pt", "QATAR": "qa",
    "ROMANIA": "ro", "SAUDIARABIA": "sa", "SINGAPORE": "sg", "SLOVAKIA": "sk",
    "SLOVENIA": "sl", "SOUTHAFRICA": "za", "SOUTHKOREA": "kr", "SPAIN": "es",
    "SWEDEN": "se", "SWITZERLAND": "ch", "TAIWAN": "tw", "THAILAND": "th",
    "TURKEY": "tr", "UKRAINE": "ua", "UNITEDARABEMIRATES": "ae", "UK": "uk",
    "USA": "www", "URUGUAY": "uy", "VENEZUELA": "ve", "VIETNAM": "vn",
    "US_CANADA": "www", "WORLDWIDE": "www",
}


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def is_chromium_neterror_page(html, title=""):
    blob = f"{title}\n{html}".lower()
    return any(
        marker in blob
        for marker in (
            "this site can’t be reached",
            "this site can't be reached",
            "dns_probe_finished_nxdomain",
            "err_name_not_resolved",
            "err_timed_out",
            "err_connection_timed_out",
            "err_proxy_connection_failed",
            "err_connection_reset",
            "chrome-error://chromewebdata",
        )
    )


def extract_balanced_json(html, anchor):
    """Return the JSON object literal that follows `anchor = ` in html."""
    i = html.find(anchor)
    if i == -1:
        return None
    j = html.find("{", i)
    if j == -1:
        return None
    depth = 0
    in_str = False
    esc = False
    for k in range(j, len(html)):
        c = html[k]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return html[j:k + 1]
    return None


def fromage_for(days):
    for v in (1, 3, 7, 14):
        if days <= v:
            return v
    return 14  # Indeed caps useful filtering around 14 days


def within_days(epoch_ms, days):
    if not epoch_ms:
        return True  # keep if unknown
    try:
        posted = dt.datetime.fromtimestamp(epoch_ms / 1000, tz=dt.timezone.utc)
        return (dt.datetime.now(tz=dt.timezone.utc) - posted).days <= days
    except Exception:
        return True


def iso_date(epoch_ms):
    if not epoch_ms:
        return ""
    try:
        return dt.datetime.fromtimestamp(epoch_ms / 1000, tz=dt.timezone.utc).date().isoformat()
    except Exception:
        return ""


# ─────────────────────────── Indeed ───────────────────────────
def parse_indeed_results(html):
    raw = extract_balanced_json(html, 'window.mosaic.providerData["mosaic-provider-jobcards"]')
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except Exception as e:
        log("indeed json parse error:", e)
        return []
    try:
        return data["metaData"]["mosaicProviderJobCardsModel"]["results"] or []
    except Exception:
        return []


def map_indeed(r, domain):
    jk = r.get("jobkey") or ""
    link = r.get("link") or r.get("viewJobLink") or (f"/viewjob?jk={jk}" if jk else "")
    if link.startswith("/"):
        link = f"https://{domain}{link}"
    # salary
    min_a = max_a = currency = interval = ""
    sal = r.get("salarySnippet") or {}
    base = sal.get("baseSalary") or {}
    rng = base.get("range") or {}
    if rng:
        min_a = rng.get("min", "") or ""
        max_a = rng.get("max", "") or ""
    currency = sal.get("currencyCode", "") or ""
    interval = (base.get("unitOfWork") or sal.get("salaryType") or "") or ""
    is_remote = bool(r.get("remoteLocation")) or bool(r.get("remoteWorkModel"))
    snippet = r.get("snippet") or ""
    if isinstance(snippet, dict):
        snippet = snippet.get("text", "")
    return {
        "id": f"in-{jk}",
        "site": "indeed",
        "title": r.get("displayTitle") or r.get("title") or r.get("normTitle") or "",
        "companyName": r.get("company") or "",
        "location": r.get("formattedLocation") or "",
        "jobUrl": link,
        "datePosted": iso_date(r.get("pubDate")),
        "jobType": "",
        "isRemote": str(is_remote).lower(),
        "minAmount": min_a,
        "maxAmount": max_a,
        "currency": currency,
        "interval": interval,
        "description": (snippet or "").strip(),
    }


def scrape_indeed(driver: Driver, cfg):
    domain = f"{INDEED_SUBDOMAIN.get(cfg['country'], 'www')}.indeed.com"
    q = quote_plus(cfg["searchTerm"])
    loc = quote_plus(cfg.get("location") or "")
    fromage = fromage_for(cfg["days"])
    wanted = cfg["resultsWanted"]
    seen = {}
    start = 0
    while len(seen) < wanted and start <= 100:
        url = f"https://{domain}/jobs?q={q}&l={loc}&fromage={fromage}&start={start}"
        log(f"  indeed: GET {url}")
        # Retry on empty: the rotating proxy hands out a fresh IP per attempt,
        # so a soft-blocked/empty page often succeeds on a retry.
        results = []
        attempts = 3 if start == 0 else 1
        for attempt in range(attempts):
            driver.get(url)
            driver.sleep(4)
            try:
                driver.detect_and_bypass_cloudflare()
            except Exception:
                pass
            html = driver.page_html or ""
            results = parse_indeed_results(html)
            if results:
                break
            # Empty usually means Indeed is soft-blocking/throttling this IP.
            log(f"  indeed: empty page (attempt {attempt + 1}/{attempts}); retrying...")
            driver.sleep(2)
        if not results:
            log("  indeed: no results after retries, stopping")
            break
        new = 0
        for r in results:
            jk = r.get("jobkey")
            if not jk or jk in seen:
                continue
            if not within_days(r.get("pubDate"), cfg["days"]):
                continue
            seen[jk] = map_indeed(r, domain)
            new += 1
        log(f"  indeed: page start={start} -> {len(results)} cards, {new} new (total {len(seen)})")
        if new == 0:
            break
        start += 10
    return list(seen.values())[:wanted]


# ─────────────────────────── ZipRecruiter ───────────────────────────
import re


def _strip_tags(s):
    return re.sub(r"<[^>]+>", "", s or "").replace("&amp;", "&").strip()


def _zip_make_url(base, href):
    if not href:
        return base
    if href.startswith("http"):
        return href
    if href.startswith("/"):
        return base + href
    return base + "/" + href


def _zip_parse_salary(txt):
    txt = (txt or "").strip()
    if not txt:
        return "", "", "", ""
    currency = "USD" if "$" in txt else ""
    interval = ""
    low = txt.lower()
    if "/yr" in low or "year" in low:
        interval = "year"
    elif "/hr" in low or "hour" in low:
        interval = "hour"
    nums = re.findall(r"[\d,.]+", txt)
    cleaned = [n.replace(",", "") for n in nums[:2]]
    min_a = cleaned[0] if len(cleaned) >= 1 else ""
    max_a = cleaned[1] if len(cleaned) >= 2 else ""
    return min_a, max_a, currency, interval


def parse_zip_date(txt):
    txt = (txt or "").strip()
    low = txt.lower()
    today = dt.date.today()
    if any(w in low for w in ("today", "just", "new", "hour")):
        return today.isoformat()
    m = re.search(r"(\d+)\s*day", low)
    if m:
        return (today - dt.timedelta(days=int(m.group(1)))).isoformat()
    m = re.search(r"(\d+)\s*week", low)
    if m:
        return (today - dt.timedelta(weeks=int(m.group(1)))).isoformat()
    for fmt in ("%d %b", "%b %d", "%d %B", "%B %d"):
        try:
            d = dt.datetime.strptime(txt, fmt).date().replace(year=today.year)
            if d > today:
                d = d.replace(year=today.year - 1)
            return d.isoformat()
        except Exception:
            pass
    return ""


def parse_zip(html, base):
    if BeautifulSoup:
        soup = BeautifulSoup(html, "html.parser")
        cards = soup.select('article[id^="job-card-"]')
        rows = []
        seen = set()
        for card in cards:
            listing_key = (card.get("id") or "").replace("job-card-", "").strip()
            if not listing_key or listing_key in seen:
                continue
            seen.add(listing_key)

            title_el = card.select_one("h2[aria-label]") or card.select_one("button[aria-label^='View ']")
            title = ""
            if title_el:
                title = (title_el.get("aria-label") or title_el.get_text(" ", strip=True) or "").strip()
                if title.startswith("View "):
                    title = title[5:].strip()

            company_el = card.select_one('a[data-testid="job-card-company"]')
            company = company_el.get_text(" ", strip=True) if company_el else ""
            company_href = company_el.get("href", "") if company_el else ""

            location_el = card.select_one('a[data-testid="job-card-location"]')
            location = location_el.get_text(" ", strip=True) if location_el else ""

            salary_text = ""
            for p in card.select("p"):
                txt = p.get_text(" ", strip=True)
                if "$" in txt or "£" in txt or "€" in txt or "/yr" in txt.lower() or "/hr" in txt.lower():
                    salary_text = txt
                    break
            min_a, max_a, currency, interval = _zip_parse_salary(salary_text)

            date_text = ""
            for p in card.select("p"):
                txt = p.get_text(" ", strip=True)
                low = txt.lower()
                if any(token in low for token in ("new", "today", "hour", "day", "week")):
                    date_text = txt
                    break

            desc_parts = [part for part in [company, location, salary_text, date_text] if part]
            rows.append({
                "id": "zr-" + re.sub(r"\W", "", listing_key)[:16],
                "site": "zip_recruiter",
                "title": title,
                "companyName": company,
                "location": location,
                "jobUrl": _zip_make_url(base, company_href) if company_href else base,
                "datePosted": parse_zip_date(date_text),
                "jobType": "",
                "isRemote": str("remote" in (title + " " + location).lower()).lower(),
                "minAmount": min_a,
                "maxAmount": max_a,
                "currency": currency,
                "interval": interval,
                "description": " | ".join(desc_parts)[:500],
            })
        if rows:
            return rows

    rows = []
    for b in html.split('<li class="job-listing')[1:]:
        m = re.search(r'jobList-title job-link"[^>]*href="([^"]+)"[^>]*>\s*(?:<strong>)?\s*([^<]+)', b)
        if not m:
            continue
        href, title = m.group(1), m.group(2).strip()
        metas = [x.strip() for x in re.findall(r"<li>(?:<i[^>]*></i>)?\s*([^<]*?)\s*</li>", b[:1500]) if x.strip()]
        company = metas[0] if metas else ""
        location = metas[1] if len(metas) > 1 else ""
        dm = re.search(r'jobList-date[^"]*">\s*([^<]+?)\s*<', b)
        dd = re.search(r'jobList-description">(.*?)</div>', b, re.S)
        url = href if href.startswith("http") else base + href
        rows.append({
            "id": "zr-" + re.sub(r"\D", "", href)[:12],
            "site": "zip_recruiter",
            "title": title,
            "companyName": company,
            "location": location,
            "jobUrl": url,
            "datePosted": parse_zip_date(dm.group(1) if dm else ""),
            "jobType": "",
            "isRemote": str("remote" in (title + " " + location).lower()).lower(),
            "minAmount": "", "maxAmount": "", "currency": "", "interval": "",
            "description": _strip_tags(dd.group(1))[:500] if dd else "",
        })
    return rows


def scrape_zip(driver: Driver, cfg):
    q = quote_plus(cfg["searchTerm"])
    loc = quote_plus(cfg.get("location") or "")
    days = cfg["days"]
    url = f"https://www.ziprecruiter.com/jobs-search?search={q}&location={loc}&days={days}"
    log(f"  zip: GET {url}")
    html = ""
    cur = url
    title = ""
    for attempt in range(2):
        driver.get(url)
        driver.sleep(5)
        try:
            driver.detect_and_bypass_cloudflare()
        except Exception:
            pass
        driver.sleep(2)
        html = driver.page_html or ""
        cur = driver.current_url or url
        title = driver.title or ""
        if is_chromium_neterror_page(html, title):
            log(f"  zip: chromium neterror page on attempt {attempt + 1}/2")
            driver.sleep(2)
            continue
        break
    base = re.match(r"https?://[^/]+", cur)
    base = base.group(0) if base else "https://www.ziprecruiter.com"
    rows = parse_zip(html, base)
    if not rows:
        with open("bota_zip_dump.html", "w", encoding="utf-8") as f:
            f.write(html)
        if is_chromium_neterror_page(html, title):
            log("  zip: chromium neterror page persisted; dumped bota_zip_dump.html")
        else:
            log("  zip: 0 parsed (layout may differ); dumped bota_zip_dump.html")
    # honor the timeline where we have a parsed date
    rows = [r for r in rows if not r["datePosted"]
            or (dt.date.today() - dt.date.fromisoformat(r["datePosted"])).days <= days]
    return rows[:cfg["resultsWanted"]]


# ─────────────────────────── Glassdoor ───────────────────────────
def parse_ld_jobs(html):
    """Pull JobPosting objects from JSON-LD blocks."""
    rows = []
    for m in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S):
        try:
            data = json.loads(m.group(1).strip())
        except Exception:
            continue
        items = data if isinstance(data, list) else [data]
        for it in items:
            if isinstance(it, dict) and it.get("@type") == "JobPosting":
                rows.append(it)
            elif isinstance(it, dict) and it.get("@type") == "ItemList":
                for el in it.get("itemListElement", []):
                    if isinstance(el, dict) and isinstance(el.get("item"), dict):
                        rows.append(el["item"])
    return rows


def scrape_glassdoor(driver: Driver, cfg):
    q = quote_plus(cfg["searchTerm"])
    loc = quote_plus(cfg.get("location") or "")
    url = f"https://www.glassdoor.com/Job/jobs.htm?sc.keyword={q}&locKeyword={loc}"
    log(f"  glassdoor: GET {url}")
    # Single bounded attempt — Glassdoor sits behind Cloudflare and the longer
    # bypass routines can hang, so we try once and bail fast if challenged.
    html = ""
    title = ""
    for attempt in range(2):
        driver.get(url)
        driver.sleep(6)
        html = driver.page_html or ""
        title = (driver.title or "")
        if is_chromium_neterror_page(html, title):
            log(f"  glassdoor: chromium neterror page on attempt {attempt + 1}/2")
            driver.sleep(2)
            continue
        break
    if "Just a moment" in html or title.startswith("Just a moment"):
        log("  glassdoor: blocked by Cloudflare challenge (skipping)")
        return []
    rows = []
    for jp in parse_ld_jobs(html):
        org = jp.get("hiringOrganization") or {}
        loc_obj = jp.get("jobLocation") or {}
        addr = (loc_obj.get("address") if isinstance(loc_obj, dict) else {}) or {}
        rows.append({
            "id": "gd-" + re.sub(r"\W", "", str(jp.get("identifier") or jp.get("title") or ""))[:16],
            "site": "glassdoor",
            "title": jp.get("title") or "",
            "companyName": (org.get("name") if isinstance(org, dict) else "") or "",
            "location": ", ".join(filter(None, [addr.get("addressLocality"), addr.get("addressRegion"),
                                                 addr.get("addressCountry") if isinstance(addr.get("addressCountry"), str) else None])),
            "jobUrl": jp.get("url") or url,
            "datePosted": (jp.get("datePosted") or "")[:10],
            "jobType": jp.get("employmentType") or "",
            "isRemote": "", "minAmount": "", "maxAmount": "", "currency": "", "interval": "",
            "description": _strip_tags(jp.get("description") or "")[:500],
        })
    if not rows:
        with open("bota_glassdoor_dump.html", "w", encoding="utf-8") as f:
            f.write(html)
        if is_chromium_neterror_page(html, title):
            log("  glassdoor: chromium neterror page persisted; dumped bota_glassdoor_dump.html")
        else:
            log("  glassdoor: page loaded but 0 jobs parsed; dumped bota_glassdoor_dump.html")
    return rows[:cfg["resultsWanted"]]


# ─────────────────────────── Naukri ───────────────────────────
def parse_naukri_date(txt):
    low = (txt or "").lower()
    today = dt.date.today()
    if any(w in low for w in ("just", "today", "hour", "min", "few")):
        return today.isoformat()
    m = re.search(r"(\d+)\+?\s*day", low)
    if m:
        return (today - dt.timedelta(days=int(m.group(1)))).isoformat()
    m = re.search(r"(\d+)\+?\s*week", low)
    if m:
        return (today - dt.timedelta(weeks=int(m.group(1)))).isoformat()
    m = re.search(r"(\d+)\+?\s*month", low)
    if m:
        return (today - dt.timedelta(days=30 * int(m.group(1)))).isoformat()
    return ""


def parse_naukri(html):
    rows = []
    for b in html.split('srp-jobtuple-wrapper')[1:]:
        jid_m = re.search(r'data-job-id="(\d+)"', b[:80])
        title_m = re.search(r'class="title\s*"[^>]*?title="([^"]*)"[^>]*href="([^"]+)"', b)
        if not title_m:
            title_m = re.search(r'href="(https://www\.naukri\.com/job-listings-[^"]+)"[^>]*>([^<]+)</a>', b)
            if not title_m:
                continue
            url, title = title_m.group(1), title_m.group(2)
        else:
            title, url = title_m.group(1), title_m.group(2)
        comp_m = re.search(r'comp-name[^"]*"[^>]*title="([^"]*)"', b)
        loc_m = re.search(r'class="locWdth"[^>]*>([^<]*)<', b) or re.search(r'class="locWdth"[^>]*title="([^"]*)"', b)
        exp_m = re.search(r'class="expwdth"[^>]*>([^<]*)<', b)
        date_m = re.search(r'job-post-day[^"]*"[^>]*>([^<]*)<', b)
        desc_m = re.search(r'class="job-desc[^"]*"[^>]*>(.*?)</span>', b, re.S)
        rows.append({
            "id": f"nk-{jid_m.group(1) if jid_m else re.sub(chr(92)+'D', '', url)[:12]}",
            "site": "naukri",
            "title": (title or "").strip(),
            "companyName": (comp_m.group(1).strip() if comp_m else ""),
            "location": (loc_m.group(1).strip() if loc_m else ""),
            "jobUrl": url,
            "datePosted": parse_naukri_date(date_m.group(1) if date_m else ""),
            "jobType": exp_m.group(1).strip() if exp_m else "",
            "isRemote": str("remote" in (title or "").lower()).lower(),
            "minAmount": "", "maxAmount": "", "currency": "", "interval": "",
            "description": _strip_tags(desc_m.group(1))[:600] if desc_m else "",
        })
    return rows


def scrape_naukri(driver: Driver, cfg):
    kw = re.sub(r"[^a-z0-9]+", "-", cfg["searchTerm"].lower()).strip("-")
    loc = re.sub(r"[^a-z0-9]+", "-", (cfg.get("location") or "india").lower()).strip("-") or "india"
    base = f"https://www.naukri.com/{kw}-jobs-in-{loc}"
    # jobAge=<days> is Naukri's freshness filter → strictly last-N-days at source.
    fresh = f"?jobAge={cfg.get('days', 30)}"
    wanted = cfg["resultsWanted"]
    seen = {}
    page = 1
    while len(seen) < wanted and page <= 8:
        url = (base if page == 1 else f"{base}-{page}") + fresh
        log(f"  naukri: GET {url}")
        results = []
        for attempt in range(2):
            driver.get(url)
            driver.sleep(5)
            html = driver.page_html or ""
            results = parse_naukri(html)
            if results:
                break
            log(f"  naukri: empty (attempt {attempt + 1}/2), retrying...")
            driver.sleep(2)
        if not results:
            break
        new = 0
        for r in results:
            if not r["jobUrl"] or r["jobUrl"] in seen:
                continue
            seen[r["jobUrl"]] = r
            new += 1
        log(f"  naukri: page {page} -> {len(results)} cards, {new} new (total {len(seen)})")
        if new == 0:
            break
        page += 1
    return list(seen.values())[:wanted]


# ─────────────────────────── dispatch ───────────────────────────
def make_browser_fn(cfg):
    out = cfg.get("outputCsv")

    @browser(
        proxy=cfg.get("proxy") or None,
        headless=cfg.get("headless", True),
        block_images=True,
        reuse_driver=True,
        close_on_crash=True,
        output=None,
        max_retry=1,
    )
    def run(driver: Driver, data):
        # Write the CSV incrementally and fsync after each site, so results
        # already collected survive even if a later site hangs and the
        # watchdog force-exits the process.
        f = w = None
        if out:
            f = open(out, "w", newline="", encoding="utf-8")
            w = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
            w.writeheader()
            f.flush()
        counts = {}
        for site in cfg["sites"]:
            try:
                if site == "indeed":
                    r = scrape_indeed(driver, cfg)
                elif site == "zip_recruiter":
                    r = scrape_zip(driver, cfg)
                elif site == "glassdoor":
                    r = scrape_glassdoor(driver, cfg)
                elif site == "naukri":
                    r = scrape_naukri(driver, cfg)
                else:
                    r = []
            except Exception as e:
                log(f"  {site}: ERROR {type(e).__name__}: {e}")
                r = []
            counts[site] = len(r)
            if w:
                for row in r:
                    w.writerow(row)
                f.flush()
                try:
                    os.fsync(f.fileno())
                except Exception:
                    pass
        if f:
            f.close()
        return {"counts": counts, "total": sum(counts.values())}

    return run


def main():
    # Config from a file path argument (preferred) or STDIN.
    if len(sys.argv) > 1:
        with open(sys.argv[1], "r", encoding="utf-8") as f:
            cfg = json.load(f)
    else:
        cfg = json.loads(sys.stdin.read())
    cfg.setdefault("resultsWanted", 25)
    cfg.setdefault("days", 14)
    cfg.setdefault("country", "USA")
    sites = [s for s in cfg.get("sites", []) if s in ("indeed", "zip_recruiter", "glassdoor", "naukri")]
    cfg["sites"] = sites
    out = cfg.get("outputCsv", "")
    if not sites:
        print(json.dumps({"counts": {}, "total": 0, "csv": out}))
        return

    # Hard watchdog: a flaky residential proxy can make a browser navigation
    # hang indefinitely. After the budget we force-exit; the CSV is already
    # flushed per-site, so completed sites are preserved.
    budget = int(cfg.get("budgetSec", 240))

    def _kill():
        log(f"WATCHDOG: exceeded {budget}s budget, force-exiting (partial results kept)")
        os._exit(7)

    wd = threading.Timer(budget, _kill)
    wd.daemon = True
    wd.start()

    log(f"Botasaurus scraping {sites} for '{cfg['searchTerm']}' ({cfg['country']})"
        f"{' via proxy' if cfg.get('proxy') else ''} (budget {budget}s)...")
    t0 = time.time()
    result = make_browser_fn(cfg)()
    wd.cancel()

    log(f"Botasaurus found {result['total']} jobs in {time.time() - t0:.1f}s: {result['counts']}")
    print(json.dumps({"counts": result["counts"], "total": result["total"], "csv": out}))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log("FATAL:", type(e).__name__, e)
        print(json.dumps({"counts": {}, "total": 0, "error": str(e)}))
        sys.exit(1)
