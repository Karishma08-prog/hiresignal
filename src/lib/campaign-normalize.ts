import type { Campaign } from "@/lib/types/campaign";

type NormalizedTitleFilterConfig = {
  includeTitles: string[];
  excludeTitles: string[];
  includeKeywords: string[];
};

type NormalizedObjectiveFilterConfig = {
  objective: string | null;
  targetMarket: string | null;
  signals: string[];
  mode: string | null;
};

type NormalizedSourceConfig = {
  searchBoards: string[];
  browserBoards: string[];
  atsBoards: string[];
};

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

export function normalizeCampaignTitleFilterConfig(campaign: Campaign): NormalizedTitleFilterConfig {
  const raw = campaign.titleFilterConfig ?? {};
  return {
    includeTitles: asStringArray(raw.includeTitles),
    excludeTitles: asStringArray(raw.excludeTitles),
    includeKeywords: asStringArray(raw.includeKeywords),
  };
}

export function normalizeCampaignObjectiveFilterConfig(campaign: Campaign): NormalizedObjectiveFilterConfig {
  const raw = campaign.objectiveFilterConfig ?? {};
  return {
    objective: typeof raw.objective === "string" ? raw.objective : null,
    targetMarket: typeof raw.targetMarket === "string" ? raw.targetMarket : null,
    signals: asStringArray(raw.signals),
    mode: typeof raw.mode === "string" ? raw.mode : null,
  };
}

export function normalizeCampaignSourceConfig(campaign: Campaign): NormalizedSourceConfig {
  const raw = campaign.sourceConfig ?? {};
  return {
    searchBoards: asStringArray(raw.searchBoards),
    browserBoards: asStringArray(raw.browserBoards),
    atsBoards: asStringArray(raw.atsBoards),
  };
}

export function getCampaignBoards(campaign: Campaign) {
  const sourceConfig = normalizeCampaignSourceConfig(campaign);
  return [
    ...sourceConfig.searchBoards,
    ...sourceConfig.browserBoards,
    ...sourceConfig.atsBoards,
  ];
}

export function getCampaignPrimarySource(campaign: Campaign) {
  return getCampaignBoards(campaign)[0] ?? "linkedin";
}
