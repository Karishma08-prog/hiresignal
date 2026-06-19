/**
 * TypeScript interfaces for JazzHR career page job listings.
 * Parsed from HTML via cheerio.
 */

export interface JazzHRJobListing {
  title: string;
  jobUrl: string;
  location: string | null;
  department: string | null;
}
