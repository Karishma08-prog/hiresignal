/**
 * Workday uses company-specific subdomains. The URL pattern is:
 *   https://{company}.wd{n}.myworkdayjobs.com/wday/cxs/{company}/{site}/jobs
 *
 * The company slug format for Workday is: {company}:{wd_number}:{site}
 * e.g., "tesla:5:Tesla" or "microsoft:1:External"
 */

/** Default page size for Workday pagination */
export const WORKDAY_PAGE_SIZE = 20;

/** Default headers for Workday API requests */
export const WORKDAY_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};

/**
 * Parse a Workday compound slug into its components.
 * Format: "{company}:{wd_number}:{site}"
 * Defaults: wd_number=5, site=External
 */
export function parseWorkdaySlug(slug: string): {
  company: string;
  wdNumber: string;
  site: string;
} {
  const parts = slug.split(':');
  return {
    company: parts[0],
    wdNumber: parts[1] ?? '5',
    site: parts[2] ?? 'External',
  };
}

/**
 * Build the Workday API URL for a given company.
 */
export function buildWorkdayUrl(company: string, wdNumber: string, site: string): string {
  return `https://${company}.wd${wdNumber}.myworkdayjobs.com/wday/cxs/${company}/${site}/jobs`;
}
