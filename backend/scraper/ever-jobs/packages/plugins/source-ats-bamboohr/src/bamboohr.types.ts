/**
 * TypeScript interfaces for BambooHR public careers API responses.
 */

export interface BambooHRResponse {
  result: BambooHRJob[];
}

export interface BambooHRJob {
  id: number;
  jobOpeningName: string;
  departmentLabel: string | null;
  location: {
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
  employmentStatusLabel: string | null;
  minimumExperience: string | null;
  compensation: string | null;
  description: string | null;
}

/**
 * TypeScript interfaces for BambooHR authenticated Applicant Tracking API responses.
 * Uses the Job Summaries endpoint which returns job openings directly.
 *
 * @see https://documentation.bamboohr.com/reference/get-job-summaries
 */

export interface BambooHRApiJobOpening {
  id: number;
  title: string | null;
  department: {
    id: number;
    label: string;
  } | null;
  location: {
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
  status: {
    id: number;
    label: string;
  } | null;
  employmentStatus: string | null;
  description: string | null;
  compensation: string | null;
  minimumExperience: string | null;
  jobOpeningUrl: string | null;
  dateCreated: string | null;
  numberOfOpenings: number | null;
}

export interface BambooHRApiResponse {
  jobOpenings: BambooHRApiJobOpening[];
}

/**
 * @deprecated Kept for backward compatibility. Use BambooHRApiJobOpening instead.
 */
export type BambooHRApiApplication = BambooHRApiJobOpening;
