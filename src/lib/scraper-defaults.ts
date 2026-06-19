export type RolePack = {
  key: string;
  title: string;
  description: string;
  titles: string[];
  includeKeywords: string[];
  defaultQuery: string;
};

export const rolePackOptions: RolePack[] = [
  {
    key: "finance_leadership",
    title: "Finance Leadership",
    description: "CFO and senior finance operators for US account targeting.",
    titles: [
      "Chief Financial Officer",
      "CFO",
      "VP Finance",
      "Vice President of Finance",
      "Head of Finance",
      "Director of Finance",
      "Finance Director",
      "SVP Finance",
      "EVP Finance",
      "Chief Accounting Officer",
      "Corporate Controller",
      "Controller",
      "FP&A Director",
    ],
    includeKeywords: [
      "finance",
      "financial planning",
      "fp&a",
      "accounting",
      "controller",
      "treasury",
      "cash flow",
      "forecasting",
      "budgeting",
      "united states",
    ],
    defaultQuery:
      'Chief Financial Officer OR CFO OR "VP Finance" OR "Vice President of Finance" OR "Head of Finance" OR "Director of Finance" OR "Chief Accounting Officer" OR "Corporate Controller"',
  },
  {
    key: "marketing_leadership",
    title: "Marketing Leadership",
    description: "CMO and senior demand-generation operators.",
    titles: [
      "Head of Marketing",
      "VP Marketing",
      "Chief Marketing Officer",
      "Director of Marketing",
      "Marketing Manager",
      "Head of Growth",
    ],
    includeKeywords: [
      "growth",
      "pipeline",
      "demand generation",
      "us market",
    ],
    defaultQuery:
      'Head of Marketing OR "VP Marketing" OR "Chief Marketing Officer" OR "Director of Marketing" OR "Head of Growth"',
  },
  {
    key: "sales_leadership",
    title: "Sales Leadership",
    description: "Revenue and sales leadership roles for outbound targeting.",
    titles: [
      "Chief Revenue Officer",
      "CRO",
      "VP Sales",
      "Vice President of Sales",
      "Head of Sales",
      "Director of Sales",
      "Sales Director",
      "Revenue Operations Director",
      "VP Revenue Operations",
    ],
    includeKeywords: [
      "revenue",
      "sales leadership",
      "pipeline",
      "enterprise sales",
      "go-to-market",
      "united states",
    ],
    defaultQuery:
      'Chief Revenue Officer OR CRO OR "VP Sales" OR "Vice President of Sales" OR "Head of Sales" OR "Director of Sales"',
  },
];

export const defaultRolePackKey = "finance_leadership";
export const defaultRolePack =
  rolePackOptions.find((pack) => pack.key === defaultRolePackKey) ?? rolePackOptions[0];

export function getRolePackByKey(key: string) {
  return rolePackOptions.find((pack) => pack.key === key) ?? defaultRolePack;
}

export const defaultTitleGroups = defaultRolePack.titles;
export const defaultIncludeKeywords = defaultRolePack.includeKeywords;
export const defaultPrimaryKeyword = defaultRolePack.defaultQuery;

export const defaultObjectiveSignals = [
  "new budget",
  "new team",
  "transformation program",
  "leadership mandate",
  "priority hire",
];

export const defaultObjectiveModes = [
  {
    key: "expansion_hiring",
    title: "Expansion Hiring",
    description: "Find companies adding new pods, new geographies, or fresh product lines.",
    defaultObjective: "Find companies adding new teams, launching new products, or investing in new functions that signal expansion hiring.",
    defaultSignals: [
      "new budget",
      "new team",
      "product launch",
      "new business unit",
      "regional expansion",
      "hiring manager growth",
    ],
  },
  {
    key: "replacement_hiring",
    title: "Replacement Hiring",
    description: "Surface roles that point to backfills or leadership turnover signals.",
    defaultObjective: "Surface companies posting roles that suggest backfills, leadership turnover, or replacement hiring.",
    defaultSignals: [
      "backfill",
      "replacement",
      "leadership transition",
      "reorg",
      "new mandate",
      "process ownership",
    ],
  },
  {
    key: "urgent_hiring",
    title: "Urgent Hiring",
    description: "Prioritize campaigns with multiple openings and recently refreshed listings.",
    defaultObjective: "Prioritize companies with multiple openings, recently refreshed listings, and urgent hiring signals.",
    defaultSignals: [
      "multiple openings",
      "priority role",
      "active hiring",
      "recent repost",
      "fast-moving search",
      "quarter-end hiring",
    ],
  },
  {
    key: "transformation_hiring",
    title: "Transformation Hiring",
    description: "Focus on companies investing in systems, finance, operations, or compliance change.",
    defaultObjective: "Find companies staffing around process transformation, systems upgrades, operational change, or compliance pressure.",
    defaultSignals: [
      "transformation program",
      "system migration",
      "erp rollout",
      "internal controls",
      "compliance initiative",
      "finance transformation",
    ],
  },
];

export const defaultObjectiveSignalLibrary = [
  "new budget",
  "new team",
  "product launch",
  "new business unit",
  "regional expansion",
  "partner expansion",
  "backfill",
  "replacement",
  "leadership transition",
  "reorg",
  "new mandate",
  "multiple openings",
  "priority role",
  "active hiring",
  "recent repost",
  "fast-moving search",
  "transformation program",
  "system migration",
  "erp rollout",
  "compliance initiative",
  "internal controls",
  "process ownership",
  "finance transformation",
  "forecasting upgrade",
  "cost optimization",
  "audit readiness",
  "m&a activity",
  "fundraising",
  "ipo readiness",
];
