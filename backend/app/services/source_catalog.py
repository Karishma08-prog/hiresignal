from __future__ import annotations


def _search_source(
    display_name: str,
    *,
    category: str = "search_board",
    engine: str = "ever_jobs_http",
    region: str = "global",
    risk_level: str = "secondary",
    needs_proxy: bool = False,
    notes: str,
) -> dict[str, object]:
    return {
        "display_name": display_name,
        "category": category,
        "engine": engine,
        "region": region,
        "risk_level": risk_level,
        "needs_proxy": needs_proxy,
        "notes": notes,
    }


def _ats_source(
    display_name: str,
    *,
    risk_level: str = "secondary",
    needs_api_key: bool = True,
    notes: str,
) -> dict[str, object]:
    return {
        "display_name": display_name,
        "category": "ats",
        "engine": "ats_api",
        "region": "global",
        "requires_company_slug": True,
        "needs_api_key": needs_api_key,
        "risk_level": risk_level,
        "notes": notes,
    }


FREE_ZERO_CONFIG_BOARDS: list[str] = [
    "linkedin",
    "remotive",
    "weworkremotely",
    "himalayas",
    "arbeitnow",
    "themuse",
    "workingnomads",
    "builtin",
    "landingjobs",
    "virtualvocations",
    "powertofly",
    "freelancercom",
    "hackernews",
    "jobspresso",
    "realworkfromanywhere",
    "remotefirstjobs",
    "duunitori",
    "jobsch",
    "mycareersfuture",
    "habrcareer",
    "pyjobs",
    "pythonjobs",
    "golangjobs",
    "railsjobs",
    "vuejobs",
    "larajobs",
    "fossjobs",
    "devopsjobs",
    "androidjobs",
    "functionalworks",
]


FREE_ZERO_CONFIG_SOURCE_METADATA: dict[str, dict[str, object]] = {
    "linkedin": _search_source(
        "LinkedIn",
        risk_level="core",
        notes="Largest professional job board; broad coverage without extra setup.",
    ),
    "remotive": _search_source(
        "Remotive",
        category="remote",
        risk_level="core",
        notes="Remote-first source with consistent zero-config coverage.",
    ),
    "weworkremotely": _search_source(
        "We Work Remotely",
        category="remote",
        risk_level="core",
        notes="Remote-first source with consistent zero-config coverage.",
    ),
    "himalayas": _search_source(
        "Himalayas",
        category="remote",
        risk_level="core",
        notes="Remote-heavy listings with good company metadata.",
    ),
    "arbeitnow": _search_source(
        "Arbeitnow",
        category="remote",
        risk_level="core",
        notes="Remote and visa-sponsored roles; works without keys.",
    ),
    "themuse": _search_source(
        "The Muse",
        risk_level="core",
        notes="Curated company-profile-rich source with zero-config access.",
    ),
    "workingnomads": _search_source(
        "Working Nomads",
        category="remote",
        notes="Curated remote jobs; free upstream source.",
    ),
    "builtin": _search_source(
        "Built In",
        region="us",
        risk_level="core",
        notes="Tech-company-heavy source with useful company metadata.",
    ),
    "landingjobs": _search_source(
        "Landing Jobs",
        risk_level="core",
        notes="European tech jobs board with zero-config access.",
    ),
    "virtualvocations": _search_source(
        "Virtual Vocations",
        category="remote",
        notes="Screened remote jobs board that works without keys.",
    ),
    "powertofly": _search_source(
        "PowerToFly",
        notes="Diversity-focused remote board with public access.",
    ),
    "freelancercom": _search_source(
        "Freelancer.com",
        notes="Freelance/gig marketplace accessible without auth.",
    ),
    "hackernews": _search_source(
        "Hacker News",
        notes="YC/tech startup job postings via public HN jobs data.",
    ),
    "jobspresso": _search_source(
        "Jobspresso",
        category="remote",
        risk_level="core",
        notes="Curated remote jobs with zero-config coverage.",
    ),
    "realworkfromanywhere": _search_source(
        "Real Work From Anywhere",
        category="remote",
        notes="Remote jobs feed that does not require credentials.",
    ),
    "remotefirstjobs": _search_source(
        "RemoteFirstJobs",
        category="remote",
        notes="Remote-first jobs feed with zero-config access.",
    ),
    "duunitori": _search_source(
        "Duunitori",
        region="finland",
        notes="Finnish job board with public data.",
    ),
    "jobsch": _search_source(
        "Jobs.ch",
        region="switzerland",
        notes="Swiss board with public listings.",
    ),
    "mycareersfuture": _search_source(
        "MyCareersFuture",
        region="singapore",
        notes="Singapore government job portal with public listings.",
    ),
    "habrcareer": _search_source(
        "Habr Career",
        region="russia",
        notes="Russian tech job board with public listings.",
    ),
    "pyjobs": _search_source(
        "PyJobs",
        notes="Python developer job board with public feeds.",
    ),
    "pythonjobs": _search_source(
        "Python.org Jobs",
        notes="Official Python job board with public listings.",
    ),
    "golangjobs": _search_source(
        "Golang Projects",
        notes="Go/Golang jobs board with public listings.",
    ),
    "railsjobs": _search_source(
        "Rails Job Board",
        notes="Ruby on Rails niche board with public listings.",
    ),
    "vuejobs": _search_source(
        "VueJobs",
        notes="Vue.js niche board with public listings.",
    ),
    "larajobs": _search_source(
        "LaraJobs",
        notes="Laravel/PHP jobs board with public listings.",
    ),
    "fossjobs": _search_source(
        "FOSS Jobs",
        notes="Open-source software jobs board with public listings.",
    ),
    "devopsjobs": _search_source(
        "DevOpsJobs",
        notes="DevOps and infrastructure jobs board with public listings.",
    ),
    "androidjobs": _search_source(
        "AndroidJobs",
        notes="Android developer jobs board with public listings.",
    ),
    "functionalworks": _search_source(
        "Functional Works",
        notes="Functional programming niche jobs board with public listings.",
    ),
}


ADDITIONAL_SOURCE_METADATA: dict[str, dict[str, object]] = {
    "indeed": _search_source(
        "Indeed",
        engine="botasaurus",
        needs_proxy=True,
        risk_level="core",
        notes="Stealth browser path for anti-bot-sensitive Indeed results.",
    ),
    "naukri": _search_source(
        "Naukri",
        engine="botasaurus",
        region="india",
        risk_level="core",
        notes="Strong India-native source after optional description enrichment.",
    ),
    "zip_recruiter": _search_source(
        "ZipRecruiter",
        engine="botasaurus",
        region="us",
        needs_proxy=True,
        notes="Browser scraping path for ZipRecruiter results.",
    ),
    "glassdoor": _search_source(
        "Glassdoor",
        engine="botasaurus",
        needs_proxy=True,
        risk_level="experimental",
        notes="Browser scraping path for Cloudflare-sensitive Glassdoor results.",
    ),
    "google": _search_source(
        "Google Jobs",
        notes="Best with specific Google-oriented search terms.",
    ),
}


ATS_SOURCE_METADATA: dict[str, dict[str, object]] = {
    "greenhouse": _ats_source(
        "Greenhouse",
        risk_level="core",
        needs_api_key=False,
        notes="ATS source discovered via slug search against greenhouse boards.",
    ),
    "lever": _ats_source(
        "Lever",
        risk_level="core",
        needs_api_key=False,
        notes="Startup-friendly ATS discovered via jobs.lever.co slug search.",
    ),
    "ashby": _ats_source(
        "Ashby",
        notes="Modern ATS discovered via jobs.ashbyhq.com slug search.",
    ),
    "smartrecruiters": _ats_source(
        "SmartRecruiters",
        needs_api_key=False,
        notes="Public ATS boards discovered via smartrecruiters slug search.",
    ),
    "jobvite": _ats_source(
        "Jobvite",
        notes="Public ATS boards discovered via jobs.jobvite.com slug search.",
    ),
    "workable": _ats_source(
        "Workable",
        notes="Public ATS boards discovered via apply.workable.com slug search.",
    ),
    "workday": _ats_source(
        "Workday",
        notes="Enterprise ATS discovered from myworkdayjobs host and path patterns.",
    ),
    "rippling": _ats_source(
        "Rippling",
        needs_api_key=False,
        notes="Public ATS path at ats.rippling.com/{slug}/jobs.",
    ),
    "bamboohr": _ats_source(
        "BambooHR",
        needs_api_key=False,
        notes="Public careers feed at {slug}.bamboohr.com/careers/list.",
    ),
    "personio": _ats_source(
        "Personio",
        needs_api_key=False,
        notes="Public XML feeds at {slug}.jobs.personio.de/com.",
    ),
    "jazzhr": _ats_source(
        "JazzHR",
        needs_api_key=False,
        notes="Public HTML boards at {slug}.applytojob.com.",
    ),
    "recruitee": _ats_source(
        "Recruitee",
        needs_api_key=False,
        notes="Public offers API at {slug}.recruitee.com/api/offers.",
    ),
    "teamtailor": _ats_source(
        "Teamtailor",
        notes="Public widget endpoints discovered from career.teamtailor.com URLs.",
    ),
    "icims": _ats_source(
        "iCIMS",
        notes="Company-specific careers hosts discovered from {slug}.icims.com.",
    ),
    "taleo": _ats_source(
        "Taleo",
        notes="Enterprise ATS discovered from {slug}.taleo.net career URLs.",
    ),
    "successfactors": _ats_source(
        "SuccessFactors",
        notes="Enterprise ATS discovered from successfactors tenant URLs.",
    ),
    "adp": _ats_source(
        "ADP Recruiting",
        notes="Recruiting endpoints discovered from ADP Workforce Now career pages.",
    ),
    "ukg": _ats_source(
        "UKG",
        notes="Public recruiting URLs discovered from recruiting.ultipro.com.",
    ),
    "breezyhr": _ats_source(
        "Breezy HR",
        needs_api_key=False,
        notes="Public boards at {slug}.breezy.hr/json.",
    ),
    "comeet": _ats_source(
        "Comeet",
        needs_api_key=False,
        notes="Public career endpoints discovered from company-specific Comeet URLs.",
    ),
    "pinpoint": _ats_source(
        "Pinpoint",
        needs_api_key=False,
        notes="Public postings JSON at {slug}.pinpointhq.com/postings.json.",
    ),
    "manatal": _ats_source(
        "Manatal",
        needs_api_key=False,
        notes="Public career-page API at api.manatal.com/open/v1/career-page/{slug}/jobs.",
    ),
    "paylocity": _ats_source(
        "Paylocity",
        needs_api_key=False,
        notes="Public feed discovered from recruiting.paylocity.com GUID URLs.",
    ),
    "freshteam": _ats_source(
        "Freshteam",
        notes="Freshteam slug discovery works, but job fetch still needs API key.",
    ),
    "bullhorn": _ats_source(
        "Bullhorn",
        notes="Bullhorn slug discovery can find cls/corpToken patterns from public URLs.",
    ),
    "trakstar": _ats_source(
        "Trakstar Hire",
        notes="Slug discovery works, but job fetch still needs Trakstar API auth.",
    ),
    "hiringthing": _ats_source(
        "HiringThing",
        notes="HiringThing discovery works, but job fetch still needs API auth.",
    ),
    "loxo": _ats_source(
        "Loxo",
        needs_api_key=False,
        notes="Public Loxo endpoints support slug-based discovery.",
    ),
    "fountain": _ats_source(
        "Fountain",
        notes="High-volume hiring ATS; public discovery only until auth is provided.",
    ),
    "deel": _ats_source(
        "Deel",
        notes="Deel ATS discovery only; full job fetch still needs auth.",
    ),
    "phenom": _ats_source(
        "Phenom",
        needs_api_key=False,
        notes="Per-company career sites vary; discovery is best-effort via public job URLs.",
    ),
    "jobylon": _ats_source(
        "Jobylon",
        needs_api_key=False,
        notes="Public feed endpoints discovered from feed.jobylon.com URLs.",
    ),
    "homerun": _ats_source(
        "Homerun",
        needs_api_key=False,
        notes="Public Homerun endpoints discovered from app.homerun.co URLs.",
    ),
    "jobscore": _ats_source(
        "JobScore",
        needs_api_key=False,
        notes="Public JobScore boards discovered from careers.jobscore.com URLs.",
    ),
    "talentlyft": _ats_source(
        "TalentLyft",
        needs_api_key=False,
        notes="Public TalentLyft endpoints discovered from talentlyft career URLs.",
    ),
    "crelate": _ats_source(
        "Crelate",
        needs_api_key=False,
        notes="Public Crelate portals support slug-based discovery.",
    ),
    "ismartrecruit": _ats_source(
        "iSmartRecruit",
        needs_api_key=False,
        notes="Public iSmartRecruit endpoints support slug-based discovery.",
    ),
    "recruiterflow": _ats_source(
        "Recruiterflow",
        needs_api_key=False,
        notes="Public Recruiterflow external job URLs support slug-based discovery.",
    ),
}


SOURCE_METADATA: dict[str, dict[str, object]] = {
    **FREE_ZERO_CONFIG_SOURCE_METADATA,
    **ADDITIONAL_SOURCE_METADATA,
    **ATS_SOURCE_METADATA,
}


APPROVED_SEARCH_SOURCE_KEYS: set[str] = {
    "linkedin",
    "remotive",
    "weworkremotely",
    "himalayas",
    "arbeitnow",
    "themuse",
    "builtin",
    "landingjobs",
    "jobspresso",
    "powertofly",
    "virtualvocations",
    "workingnomads",
    "jobsch",
    "pyjobs",
    "pythonjobs",
    "railsjobs",
    "realworkfromanywhere",
    "remotefirstjobs",
    "vuejobs",
    "hackernews",
}

APPROVED_BROWSER_SOURCE_KEYS: set[str] = {
    "indeed",
    "naukri",
    "zip_recruiter",
}

APPROVED_ATS_SOURCE_KEYS: set[str] = {
    "greenhouse",
    "lever",
    "ashby",
    "smartrecruiters",
    "jobvite",
    "workable",
    "workday",
    "recruitee",
    "personio",
}

APPROVED_SOURCE_KEYS: set[str] = (
    APPROVED_SEARCH_SOURCE_KEYS
    | APPROVED_BROWSER_SOURCE_KEYS
    | APPROVED_ATS_SOURCE_KEYS
)


ATS_SITE_MAP: dict[str, list[str]] = {
    "greenhouse": ["boards.greenhouse.io", "job-boards.greenhouse.io"],
    "lever": ["jobs.lever.co"],
    "ashby": ["jobs.ashbyhq.com"],
    "smartrecruiters": ["jobs.smartrecruiters.com", "careers.smartrecruiters.com"],
    "jobvite": ["jobs.jobvite.com"],
    "workable": ["apply.workable.com"],
    "workday": ["myworkdayjobs.com"],
    "rippling": ["ats.rippling.com"],
    "bamboohr": ["bamboohr.com/careers"],
    "personio": ["jobs.personio.de", "jobs.personio.com"],
    "jazzhr": ["applytojob.com"],
    "recruitee": ["recruitee.com"],
    "teamtailor": ["career.teamtailor.com"],
    "icims": ["icims.com/jobs"],
    "taleo": ["taleo.net"],
    "successfactors": ["successfactors.com/career"],
    "adp": ["workforcenow.adp.com/mascsr/default/mdf/recruitment"],
    "ukg": ["recruiting.ultipro.com"],
    "breezyhr": ["breezy.hr"],
    "comeet": ["comeet.com"],
    "pinpoint": ["pinpointhq.com"],
    "manatal": ["api.manatal.com/open/v1/career-page"],
    "paylocity": ["recruiting.paylocity.com/Recruiting/Jobs/Details"],
    "freshteam": ["freshteam.com/jobs", "freshteam.com/api/job_postings"],
    "bullhorn": ["bullhornstaffing.com/rest-services"],
    "trakstar": ["hire.trakstar.com"],
    "hiringthing": ["hiringthing.com"],
    "loxo": ["app.loxo.co"],
    "fountain": ["fountain.com"],
    "deel": ["letsdeel.com/rest/v2/ats", "careers.deel.com"],
    "phenom": ["phenompeople.com"],
    "jobylon": ["feed.jobylon.com"],
    "homerun": ["app.homerun.co"],
    "jobscore": ["careers.jobscore.com"],
    "talentlyft": ["talentlyft.com"],
    "crelate": ["crelate.com"],
    "ismartrecruit": ["ismartrecruit.com"],
    "recruiterflow": ["recruiterflow.com"],
}
