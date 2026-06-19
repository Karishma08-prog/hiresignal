/**
 * TypeScript interfaces for Ashby API responses.
 * Ported from ats-scrapers/models/ashby.py
 */

export interface AshbyAddress {
  postalAddress?: {
    addressLocality?: string | null;
    addressRegion?: string | null;
    addressCountry?: string | null;
  } | null;
}

export interface AshbyCompensationTier {
  title?: string | null;
  tierFloor?: number | null;
  tierCeiling?: number | null;
  currency?: string | null;
  tierType?: string | null;
  interval?: string | null;
}

export interface AshbyCompensationComponent {
  compensationType?: string | null;
  tiers?: AshbyCompensationTier[] | null;
  label?: string | null;
}

export interface AshbyCompensation {
  compensationComponents?: AshbyCompensationComponent[] | null;
  summaryComponents?: AshbyCompensationComponent[] | null;
}

export interface AshbyJob {
  id?: string | null;
  title?: string | null;
  departmentName?: string | null;
  teamName?: string | null;
  employmentType?: string | null;
  location?: string | null;
  address?: AshbyAddress | null;
  secondaryLocations?: Array<{
    location?: string | null;
    address?: AshbyAddress | null;
  }> | null;
  isRemote?: boolean | null;
  publishedDate?: string | null;
  descriptionHtml?: string | null;
  descriptionPlain?: string | null;
  jobUrl?: string | null;
  applyUrl?: string | null;
  compensation?: AshbyCompensation | null;
  isListed?: boolean | null;
}

export interface AshbyResponse {
  jobs: AshbyJob[];
  apiVersion?: string;
}
