export const defaultTitleGroups = [
  "Head of Marketing",
  "VP Marketing",
  "Chief Marketing Officer",
  "Director of Marketing",
  "Marketing Manager",
  "Head of Growth",
];

export const defaultIncludeKeywords = [
  "growth",
  "pipeline",
  "demand generation",
  "us market",
];

export const defaultObjectiveSignals = [
  "us market",
  "united states",
  "north america",
  "us customers",
  "expand into us",
];

export const defaultObjectiveModes = [
  {
    key: "expansion_hiring",
    title: "Expansion Hiring",
    description: "Find companies adding new pods, new geographies, or fresh product lines.",
  },
  {
    key: "replacement_hiring",
    title: "Replacement Hiring",
    description: "Surface roles that point to backfills or leadership turnover signals.",
  },
  {
    key: "urgent_hiring",
    title: "Urgent Hiring",
    description: "Prioritize campaigns with multiple openings and recently refreshed listings.",
  },
];

export const sourcePresetOptions = [
  {
    key: "single_source",
    title: "Single Source",
    description: "Run against one selected board or ATS at a time.",
  },
  {
    key: "free_zero_config",
    title: "Free 30 Zero-Config",
    description: "Launch across the 30 free boards that do not require API keys or slugs.",
  },
] as const;
