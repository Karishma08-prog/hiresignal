/**
 * TypeScript interfaces for ADP Workforce Now career site API responses.
 */

export interface AdpResponse {
  jobRequisitions?: AdpJob[];
  meta?: {
    totalCount?: number;
  };
}

export interface AdpJob {
  /** Unique job requisition ID */
  jobRequisitionId?: string | null;
  /** Requisition number */
  requisitionNumber?: string | null;
  /** Job title */
  jobTitle?: string | null;
  /** Job description (HTML or plain text) */
  jobDescription?: string | null;
  /** Short description / summary */
  shortDescription?: string | null;
  /** Department name */
  departmentName?: string | null;
  /** Location */
  location?: AdpLocation | null;
  /** Multiple locations */
  locations?: AdpLocation[] | null;
  /** Job type (Full-Time, Part-Time, etc.) */
  workerTypeCode?: string | null;
  /** Employment type description */
  employmentType?: string | null;
  /** External posting URL */
  externalUrl?: string | null;
  /** Posted date (ISO format) */
  postedDate?: string | null;
  /** Last updated date */
  lastUpdatedDate?: string | null;
  /** Company name */
  companyName?: string | null;
  /** Compensation info */
  compensation?: {
    minPay?: number | null;
    maxPay?: number | null;
    currency?: string | null;
    frequency?: string | null;
  } | null;
}

export interface AdpLocation {
  /** City */
  city?: string | null;
  /** State / province code */
  stateProvince?: string | null;
  /** Country code */
  country?: string | null;
  /** Full address */
  formattedAddress?: string | null;
}
