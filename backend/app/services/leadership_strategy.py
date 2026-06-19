from __future__ import annotations

import re
from dataclasses import dataclass

from app import models


@dataclass(frozen=True)
class SearchBatch:
    query: str
    boards: list[str]
    label: str


@dataclass(frozen=True)
class CampaignProfile:
    key: str
    role_family: str
    search_boards: list[str]
    ats_boards: list[str]
    company_keywords: list[str]
    title_aliases: dict[str, tuple[str, ...]]
    query_batches: tuple[tuple[str, tuple[str, ...], str], ...]


def _campaign_text(campaign: models.Campaign) -> str:
    title_config = campaign.title_filter_config or {}
    objective = campaign.objective_filter_config or {}
    source_config = campaign.source_config or {}
    return " ".join(
        [
            campaign.name or "",
            campaign.role_query or "",
            campaign.country or "",
            campaign.location or "",
            " ".join(str(item or "") for item in title_config.get("includeTitles", [])),
            " ".join(str(item or "") for item in title_config.get("includeKeywords", [])),
            str(objective.get("objective") or ""),
            " ".join(str(item or "") for item in objective.get("signals", [])),
            str(objective.get("targetMarket") or ""),
            " ".join(str(item or "") for item in source_config.get("searchBoards", [])),
        ]
    ).lower()


TITLE_ALIAS_LIBRARY: dict[str, tuple[str, ...]] = {
    "chief financial officer": ("chief financial officer", "cfo"),
    "cfo": ("cfo", "chief financial officer"),
    "vp finance": ("vp finance", "vice president finance", "vice president of finance"),
    "head of finance": ("head of finance", "finance head"),
    "director of finance": ("director of finance", "finance director"),
    "controller": ("controller", "corporate controller", "financial controller"),
    "chief accounting officer": ("chief accounting officer", "cao"),
    "chief marketing officer": ("chief marketing officer", "cmo"),
    "vp marketing": ("vp marketing", "vice president marketing", "vice president of marketing"),
    "director of marketing": ("director of marketing", "marketing director"),
    "head of marketing": ("head of marketing", "marketing head"),
    "vp growth": ("vp growth", "vice president growth", "vice president of growth"),
    "head of growth": ("head of growth", "growth lead", "growth marketing lead"),
    "head of growth marketing": ("head of growth marketing", "growth marketing lead"),
    "head of growth & product marketing": (
        "head of growth and product marketing",
        "head of growth product marketing",
    ),
    "revenue operations": ("revenue operations", "revops", "revenue ops"),
    "sales operations": ("sales operations", "sales ops"),
    "chief revenue officer": ("chief revenue officer", "cro"),
    "vp sales": ("vp sales", "vice president sales", "vice president of sales"),
    "director of operations": ("director of operations", "operations director"),
    "operations manager": ("operations manager",),
    "vp ecommerce": ("vp ecommerce", "vp e commerce", "vice president ecommerce", "vice president e commerce"),
    "director ecommerce": ("director ecommerce", "director of ecommerce", "director of e commerce"),
    "head of revenue": ("head of revenue", "revenue lead"),
    "partnerships": ("partnerships", "head of partnerships", "director partnerships"),
}


PROFILES: tuple[CampaignProfile, ...] = (
    CampaignProfile(
        key="cv3_growth_consumer",
        role_family="marketing_leadership",
        search_boards=[
            "builtin",
            "themuse",
            "powertofly",
            "landingjobs",
            "himalayas",
            "arbeitnow",
            "remotive",
            "weworkremotely",
        ],
        ats_boards=[
            "greenhouse",
            "lever",
            "ashby",
            "workable",
            "smartrecruiters",
            "jobvite",
            "recruitee",
            "personio",
        ],
        company_keywords=[
            "wellness",
            "specialty food",
            "food",
            "beverage",
            "nutrition",
            "consumer",
            "d2c",
            "ecommerce",
            "shopify",
            "brand",
            "snack",
        ],
        title_aliases={
            "chief marketing officer": TITLE_ALIAS_LIBRARY["chief marketing officer"],
            "vp marketing": TITLE_ALIAS_LIBRARY["vp marketing"],
            "director of marketing": TITLE_ALIAS_LIBRARY["director of marketing"],
            "head of marketing": TITLE_ALIAS_LIBRARY["head of marketing"],
            "vp growth": TITLE_ALIAS_LIBRARY["vp growth"],
            "head of growth": TITLE_ALIAS_LIBRARY["head of growth"],
            "head of growth marketing": TITLE_ALIAS_LIBRARY["head of growth marketing"],
            "head of growth & product marketing": TITLE_ALIAS_LIBRARY["head of growth & product marketing"],
        },
        query_batches=(
            ("vp growth", ("builtin", "powertofly", "himalayas", "remotive"), "vp_growth"),
            ("head of growth", ("builtin", "landingjobs", "themuse", "himalayas"), "head_of_growth"),
            ("chief marketing officer", ("builtin", "powertofly", "themuse"), "chief_marketing_officer"),
            ("vp marketing", ("builtin", "themuse", "powertofly", "himalayas"), "vp_marketing"),
            ("director of marketing", ("builtin", "themuse", "landingjobs"), "director_of_marketing"),
        ),
    ),
    CampaignProfile(
        key="revengineer_us_expansion",
        role_family="marketing_leadership",
        search_boards=[
            "builtin",
            "themuse",
            "arbeitnow",
            "himalayas",
            "landingjobs",
            "powertofly",
            "remotive",
        ],
        ats_boards=[
            "greenhouse",
            "lever",
            "ashby",
            "workable",
            "smartrecruiters",
            "jobvite",
            "recruitee",
        ],
        company_keywords=[
            "india",
            "indian",
            "b2b saas",
            "saas",
            "north america",
            "united states",
            "us market",
            "regional expansion",
            "new geography",
        ],
        title_aliases={
            "head of marketing": TITLE_ALIAS_LIBRARY["head of marketing"],
            "vp marketing": TITLE_ALIAS_LIBRARY["vp marketing"],
            "chief marketing officer": TITLE_ALIAS_LIBRARY["chief marketing officer"],
            "vp sales": TITLE_ALIAS_LIBRARY["vp sales"],
            "revenue operations": TITLE_ALIAS_LIBRARY["revenue operations"],
            "sales operations": TITLE_ALIAS_LIBRARY["sales operations"],
        },
        query_batches=(
            ("chief marketing officer", ("builtin", "themuse", "powertofly"), "chief_marketing_officer"),
            ("vp marketing", ("builtin", "themuse", "powertofly", "himalayas"), "vp_marketing"),
            ("head of marketing", ("builtin", "themuse", "landingjobs", "arbeitnow"), "head_of_marketing"),
            ("vp sales", ("builtin", "himalayas", "powertofly"), "vp_sales"),
            ("revenue operations", ("builtin", "himalayas", "remotive"), "revenue_operations"),
        ),
    ),
    CampaignProfile(
        key="cadient_finance_leadership",
        role_family="finance_leadership",
        search_boards=[
            "builtin",
            "himalayas",
            "themuse",
            "arbeitnow",
            "powertofly",
            "remotive",
        ],
        ats_boards=[
            "greenhouse",
            "lever",
            "workable",
            "smartrecruiters",
            "jobvite",
            "workday",
            "recruitee",
        ],
        company_keywords=[
            "finance",
            "accounting",
            "controller",
            "healthcare",
            "staffing",
            "enterprise",
            "services",
            "cash flow",
            "forecasting",
        ],
        title_aliases={
            "chief financial officer": TITLE_ALIAS_LIBRARY["chief financial officer"],
            "cfo": TITLE_ALIAS_LIBRARY["cfo"],
            "vp finance": TITLE_ALIAS_LIBRARY["vp finance"],
            "head of finance": TITLE_ALIAS_LIBRARY["head of finance"],
            "director of finance": TITLE_ALIAS_LIBRARY["director of finance"],
            "controller": TITLE_ALIAS_LIBRARY["controller"],
            "chief accounting officer": TITLE_ALIAS_LIBRARY["chief accounting officer"],
        },
        query_batches=(
            ("chief financial officer", ("builtin", "himalayas", "powertofly"), "chief_financial_officer"),
            ("cfo", ("builtin", "himalayas", "remotive"), "cfo"),
            ("vp finance", ("builtin", "himalayas", "themuse"), "vp_finance"),
            ("head of finance", ("builtin", "arbeitnow", "himalayas"), "head_of_finance"),
            ("controller", ("builtin", "themuse"), "controller"),
        ),
    ),
    CampaignProfile(
        key="food_distribution_ops",
        role_family="operations_leadership",
        search_boards=[
            "builtin",
            "themuse",
            "powertofly",
            "himalayas",
        ],
        ats_boards=[
            "greenhouse",
            "lever",
            "workable",
            "smartrecruiters",
            "jobvite",
            "workday",
        ],
        company_keywords=[
            "food production",
            "food and beverages",
            "wholesale",
            "distribution",
            "foodservice",
            "distributor",
            "ingredients",
            "logistics",
            "supply chain",
            "ecommerce",
        ],
        title_aliases={
            "vp sales": TITLE_ALIAS_LIBRARY["vp sales"],
            "director of operations": TITLE_ALIAS_LIBRARY["director of operations"],
            "operations manager": TITLE_ALIAS_LIBRARY["operations manager"],
            "vp ecommerce": TITLE_ALIAS_LIBRARY["vp ecommerce"],
            "director ecommerce": TITLE_ALIAS_LIBRARY["director ecommerce"],
        },
        query_batches=(
            ("vp sales distribution", ("builtin", "powertofly"), "vp_sales_distribution"),
            ("director operations distribution", ("builtin", "themuse"), "director_operations_distribution"),
            ("operations manager wholesale", ("builtin",), "operations_manager_wholesale"),
            ("vp ecommerce food", ("builtin", "powertofly"), "vp_ecommerce_food"),
            ("director ecommerce food", ("builtin",), "director_ecommerce_food"),
        ),
    ),
    CampaignProfile(
        key="revenue_buildout",
        role_family="revenue_leadership",
        search_boards=[
            "builtin",
            "themuse",
            "powertofly",
            "himalayas",
            "arbeitnow",
            "remotive",
        ],
        ats_boards=[
            "greenhouse",
            "lever",
            "ashby",
            "workable",
            "smartrecruiters",
            "jobvite",
            "recruitee",
        ],
        company_keywords=[
            "new team",
            "regional expansion",
            "multiple openings",
            "priority role",
            "go to market",
            "gtm",
            "enterprise",
            "sales",
            "partnerships",
            "revenue",
        ],
        title_aliases={
            "chief revenue officer": TITLE_ALIAS_LIBRARY["chief revenue officer"],
            "vp sales": TITLE_ALIAS_LIBRARY["vp sales"],
            "revenue operations": TITLE_ALIAS_LIBRARY["revenue operations"],
            "sales operations": TITLE_ALIAS_LIBRARY["sales operations"],
            "partnerships": TITLE_ALIAS_LIBRARY["partnerships"],
            "head of revenue": TITLE_ALIAS_LIBRARY["head of revenue"],
        },
        query_batches=(
            ("chief revenue officer", ("builtin", "powertofly"), "chief_revenue_officer"),
            ("vp sales", ("builtin", "himalayas", "powertofly"), "vp_sales"),
            ("revenue operations", ("builtin", "remotive", "himalayas"), "revenue_operations"),
            ("sales operations", ("builtin", "remotive"), "sales_operations"),
            ("partnerships", ("builtin", "themuse"), "partnerships"),
        ),
    ),
)


DEFAULT_MARKETING_LEADERSHIP_BOARDS = [
    "builtin",
    "arbeitnow",
    "themuse",
    "landingjobs",
    "himalayas",
    "powertofly",
    "remotive",
    "weworkremotely",
    "virtualvocations",
]

DEFAULT_FINANCE_LEADERSHIP_BOARDS = [
    "builtin",
    "himalayas",
    "arbeitnow",
    "remotive",
    "themuse",
    "powertofly",
]

DEFAULT_ATS_LEADERSHIP_FAMILIES = [
    "greenhouse",
    "lever",
    "smartrecruiters",
    "workable",
    "recruitee",
    "personio",
    "ashby",
    "jobvite",
    "workday",
]

TITLE_TOKEN_STOPWORDS = {"of", "and", "the", "for", "to", "a", "an", "in", "on", "with"}


def _normalize_text(value: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9\s&/+.-]", " ", value.lower()).split())


def _canonicalize_title_phrase(value: str) -> str:
    normalized = _normalize_text(value)
    replacements = {
        "vice president of": "vp",
        "vice president": "vp",
        "chief financial officer": "cfo",
        "chief marketing officer": "cmo",
        "chief revenue officer": "cro",
        "chief accounting officer": "cao",
        "revenue operations": "revops",
        "sales operations": "sales ops",
        "e commerce": "ecommerce",
        "e-commerce": "ecommerce",
        "&": " and ",
        "/": " ",
        "-": " ",
    }
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    return " ".join(normalized.split())


def _title_tokens(value: str) -> tuple[str, ...]:
    canonical = _canonicalize_title_phrase(value)
    if not canonical:
        return ()
    return tuple(
        token
        for token in canonical.split()
        if token and token not in TITLE_TOKEN_STOPWORDS
    )


def _profile_matches(profile: CampaignProfile, text: str) -> int:
    score = 0
    for canonical, aliases in profile.title_aliases.items():
        all_aliases = {canonical, *aliases}
        if any(_normalize_text(alias) in text for alias in all_aliases):
            score += 3
    for keyword in profile.company_keywords:
        if _normalize_text(keyword) in text:
            score += 2
    if profile.key == "cv3_growth_consumer" and any(token in text for token in ("cv3", "d2c", "wellness")):
        score += 4
    if profile.key == "revengineer_us_expansion" and any(token in text for token in ("revengineer", "india", "indian", "us market")):
        score += 4
    if profile.key == "cadient_finance_leadership" and any(token in text for token in ("cadient", "finance", "cfo")):
        score += 4
    return score


def campaign_profile(campaign: models.Campaign) -> CampaignProfile | None:
    text = _normalize_text(_campaign_text(campaign))
    best_profile: CampaignProfile | None = None
    best_score = 0
    for profile in PROFILES:
        score = _profile_matches(profile, text)
        if score > best_score:
            best_profile = profile
            best_score = score
    return best_profile if best_score >= 4 else None


def campaign_role_family(campaign: models.Campaign) -> str:
    profile = campaign_profile(campaign)
    if profile is not None:
        return profile.role_family
    text = _campaign_text(campaign)
    if any(
        token in text
        for token in [
            "chief financial officer",
            "cfo",
            "vp finance",
            "vice president of finance",
            "head of finance",
            "finance director",
            "director of finance",
            "controller",
            "corporate controller",
            "chief accounting officer",
        ]
    ):
        return "finance_leadership"
    if any(
        token in text
        for token in [
            "chief marketing officer",
            "cmo",
            "vp marketing",
            "vice president of marketing",
            "head of marketing",
            "director of marketing",
            "vp growth",
            "vice president of growth",
            "head of growth",
            "growth marketing",
            "product marketing",
        ]
    ):
        return "marketing_leadership"
    if any(token in text for token in ["chief revenue officer", "vp sales", "revenue operations", "sales operations"]):
        return "revenue_leadership"
    return "generic"


def campaign_company_keywords(campaign: models.Campaign) -> list[str]:
    profile = campaign_profile(campaign)
    if profile is not None:
        return list(profile.company_keywords)

    title_config = campaign.title_filter_config or {}
    objective = campaign.objective_filter_config or {}
    keywords = [
        str(item).strip().lower()
        for item in [
            *(title_config.get("includeKeywords", []) or []),
            *(objective.get("signals", []) or []),
        ]
        if str(item).strip()
    ]
    seen: set[str] = set()
    ordered: list[str] = []
    for keyword in keywords:
        normalized = _canonicalize_title_phrase(keyword)
        if normalized and normalized not in seen:
            seen.add(normalized)
            ordered.append(normalized)
    return ordered


def campaign_title_variants(campaign: models.Campaign) -> list[str]:
    title_config = campaign.title_filter_config or {}
    role_query = campaign.role_query or ""
    configured_titles = [
        part.strip()
        for part in title_config.get("includeTitles", [])
        if str(part).strip()
    ]
    query_parts = [
        part.strip()
        for part in re.split(r"\bor\b", role_query, flags=re.IGNORECASE)
        if part.strip()
    ]
    profile = campaign_profile(campaign)

    ordered: list[str] = []
    seen: set[str] = set()
    for term in [*configured_titles, *query_parts]:
        normalized = _canonicalize_title_phrase(term)
        if not normalized:
            continue
        alias_candidates = [term]
        if profile is not None:
            aliases = profile.title_aliases.get(term.lower())
            if aliases:
                alias_candidates.extend(aliases)
        library_aliases = TITLE_ALIAS_LIBRARY.get(term.lower())
        if library_aliases:
            alias_candidates.extend(library_aliases)
        alias_candidates.append(normalized)
        for alias in alias_candidates:
            canonical = _canonicalize_title_phrase(alias)
            if canonical and canonical not in seen:
                seen.add(canonical)
                ordered.append(canonical)
    return ordered


def title_matches_campaign(job_title: str, campaign: models.Campaign) -> bool:
    title = _canonicalize_title_phrase(job_title)
    terms = campaign_title_variants(campaign)
    if not terms:
        return False

    title_token_set = set(_title_tokens(job_title))
    for term in terms:
        if term in title:
            return True
        term_tokens = set(_title_tokens(term))
        if term_tokens and term_tokens.issubset(title_token_set):
            return True
    return False


def company_keyword_score(
    campaign: models.Campaign,
    *,
    company_name: str,
    description: str | None,
    title: str | None,
    domain: str | None,
    location: str | None = None,
) -> tuple[int, list[str]]:
    haystack = _normalize_text(
        " ".join(
            [
                company_name or "",
                description or "",
                title or "",
                domain or "",
                location or "",
            ]
        )
    )
    matched: list[str] = []
    for keyword in campaign_company_keywords(campaign):
        normalized = _canonicalize_title_phrase(keyword)
        if normalized and normalized in haystack:
            matched.append(keyword)
    unique = list(dict.fromkeys(matched))
    return min(len(unique), 4), unique[:6]


def score_slug_for_campaign(
    campaign: models.Campaign,
    *,
    company_name: str | None,
    company_slug: str,
    job_board_url: str | None = None,
) -> int:
    haystack = _normalize_text(
        " ".join(
            [
                company_name or "",
                company_slug or "",
                job_board_url or "",
            ]
        )
    )
    score = 0
    for keyword in campaign_company_keywords(campaign):
        normalized = _canonicalize_title_phrase(keyword)
        if normalized and normalized in haystack:
            score += 3

    role_family = campaign_role_family(campaign)
    if role_family == "marketing_leadership" and any(token in haystack for token in ("brand", "consumer", "shop", "commerce", "wellness", "food", "beverage")):
        score += 2
    if role_family == "finance_leadership" and any(token in haystack for token in ("finance", "health", "staff", "enterprise", "service")):
        score += 2
    if role_family == "operations_leadership" and any(token in haystack for token in ("distribution", "wholesale", "foodservice", "supply", "logistics")):
        score += 2
    if role_family == "revenue_leadership" and any(token in haystack for token in ("revenue", "sales", "partnership", "gtm")):
        score += 2

    if any(token in haystack for token in ("apac", "emea", "europe", "japan", "singapore", "india")) and (
        "united states" in _normalize_text(" ".join([campaign.country or "", campaign.location or ""]))
        or "usa" in _normalize_text(" ".join([campaign.country or "", campaign.location or ""]))
    ):
        score -= 3

    return score


def preferred_search_boards_for_campaign(
    campaign: models.Campaign,
    search_boards: list[str],
) -> list[str]:
    allowed = [board.strip().lower() for board in search_boards if board.strip()]
    profile = campaign_profile(campaign)
    if profile is not None:
        refined = [board for board in profile.search_boards if board in allowed]
        return refined or allowed

    family = campaign_role_family(campaign)
    if family == "marketing_leadership":
        refined = [board for board in DEFAULT_MARKETING_LEADERSHIP_BOARDS if board in allowed]
        return refined or allowed
    if family == "finance_leadership":
        refined = [board for board in DEFAULT_FINANCE_LEADERSHIP_BOARDS if board in allowed]
        return refined or allowed
    return allowed


def preferred_ats_boards_for_campaign(
    campaign: models.Campaign,
    ats_boards: list[str],
) -> list[str]:
    allowed = [board.strip().lower() for board in ats_boards if board.strip()]
    profile = campaign_profile(campaign)
    if profile is not None:
        refined = [board for board in profile.ats_boards if board in allowed]
        return refined or allowed

    family = campaign_role_family(campaign)
    if family in {"marketing_leadership", "finance_leadership", "revenue_leadership"}:
        refined = [board for board in DEFAULT_ATS_LEADERSHIP_FAMILIES if board in allowed]
        return refined or allowed
    return allowed


def build_search_batches(campaign: models.Campaign, search_boards: list[str]) -> list[SearchBatch]:
    refined_boards = preferred_search_boards_for_campaign(campaign, search_boards)
    if not refined_boards:
        return []

    board_set = set(refined_boards)
    profile = campaign_profile(campaign)

    def pick(query: str, boards: tuple[str, ...], label: str) -> SearchBatch | None:
        selected = [board for board in boards if board in board_set]
        return SearchBatch(query=query, boards=selected, label=label) if selected else None

    if profile is not None and profile.query_batches:
        batches = [pick(query, boards, label) for query, boards, label in profile.query_batches]
        realized = [batch for batch in batches if batch is not None]
        if realized:
            return realized

    return [
        SearchBatch(
            query=campaign.role_query.strip() or campaign.name.strip() or "marketing",
            boards=refined_boards,
            label="generic",
        )
    ]
