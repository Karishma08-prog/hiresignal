/**
 * TypeScript interfaces for Paylocity recruiting feed API responses.
 *
 * The Paylocity feed endpoint returns a JSON array of job objects.
 * Endpoint: GET https://recruiting.paylocity.com/recruiting/api/feed/jobs/{companySlug}
 */

export interface PaylocityJob {
  /** Unique job identifier */
  JobId: string | number;
  /** Job title / position name */
  JobTitle: string;
  /** HTML description of the job */
  Description: string | null;
  /** Full location string (may combine city, state, country) */
  Location: string | null;
  /** City of the job */
  City: string | null;
  /** State or region */
  State: string | null;
  /** Country */
  Country: string | null;
  /** ISO date string when the job was posted */
  PostedDate: string | null;
  /** Direct URL to the job posting on Paylocity */
  JobUrl: string | null;
  /** Company name */
  Company: string | null;
  /** Department or team */
  Department: string | null;
  /** Employment type (Full-time, Part-time, Contract, etc.) */
  JobType: string | null;
}
