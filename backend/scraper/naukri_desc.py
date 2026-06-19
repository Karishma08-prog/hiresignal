"""Enrich Naukri rows in a CSV with FULL job descriptions by visiting each
Naukri detail page (Botasaurus stealth browser, real IP). Other rows untouched.

Usage: python naukri_desc.py --in <csv> --out <csv> [--limit N]
"""
import sys, csv, json, re, os, html as _html, threading, time
from botasaurus.browser import browser, Driver

def arg(n, d=None):
    i = sys.argv.index(n) if n in sys.argv else -1
    return sys.argv[i + 1] if i >= 0 and i + 1 < len(sys.argv) else d

IN = arg("--in"); OUT = arg("--out"); LIMIT = int(arg("--limit", "0"))
BUDGET = int(arg("--budget", "1200"))


def strip_tags(s):
    s = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", s or "", flags=re.S | re.I)
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"</(p|div|li|h\d)>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = _html.unescape(s)
    return re.sub(r"[ \t]+", " ", re.sub(r"\n\s*\n+", "\n", s)).strip()


def extract_desc(html):
    # 1) JSON-LD JobPosting.description (most reliable)
    for m in re.finditer(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html, re.S):
        try:
            data = json.loads(m.group(1).strip())
        except Exception:
            continue
        for it in (data if isinstance(data, list) else [data]):
            if isinstance(it, dict) and it.get("@type") == "JobPosting" and it.get("description"):
                d = strip_tags(it["description"])
                if len(d) > 80:
                    return d[:9000]
    # 2) Naukri JD container variants
    for pat in [r'class="[^"]*dang-inner-html[^"]*"[^>]*>(.*?)</div>',
                r'class="[^"]*styles_JDC__dang[^"]*"[^>]*>(.*?)</div>',
                r'class="[^"]*job-desc[^"]*"[^>]*>(.*?)</section>',
                r'class="[^"]*jobDescription[^"]*"[^>]*>(.*?)</div>']:
        m = re.search(pat, html, re.S)
        if m:
            d = strip_tags(m.group(1))
            if len(d) > 80:
                return d[:9000]
    return ""


def main():
    with open(IN, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)
    header = fieldnames or (rows[0].keys() if rows else [])
    naukri_idx = [i for i, r in enumerate(rows) if r.get("site") == "naukri" and r.get("jobUrl")]
    if LIMIT:
        naukri_idx = naukri_idx[:LIMIT]
    print(f"rows={len(rows)} naukri-to-enrich={len(naukri_idx)} budget={BUDGET}s", file=sys.stderr, flush=True)

    def flush():
        with open(OUT, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(header), extrasaction="ignore")
            w.writeheader()
            for r in rows:
                w.writerow(r)

    wd = threading.Timer(BUDGET, lambda: (flush(), print("WATCHDOG flush+exit", file=sys.stderr, flush=True), os._exit(7)))
    wd.daemon = True
    wd.start()

    @browser(headless=True, block_images=True, reuse_driver=True, close_on_crash=True, output=None)
    def run(driver: Driver, data):
        ok = 0
        for n, i in enumerate(naukri_idx, 1):
            url = rows[i]["jobUrl"]
            try:
                driver.get(url)
                driver.sleep(2.5)
                d = extract_desc(driver.page_html or "")
                if d:
                    rows[i]["description"] = d
                    ok += 1
            except Exception as e:
                print(f"  err {url[:60]}: {type(e).__name__}", file=sys.stderr, flush=True)
            if n % 10 == 0:
                flush()
                print(f"  {n}/{len(naukri_idx)} done, {ok} descriptions", file=sys.stderr, flush=True)
        return ok

    t0 = time.time()
    ok = run()
    wd.cancel()
    flush()
    print(f"DONE: enriched {ok}/{len(naukri_idx)} naukri descriptions in {time.time()-t0:.0f}s", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
