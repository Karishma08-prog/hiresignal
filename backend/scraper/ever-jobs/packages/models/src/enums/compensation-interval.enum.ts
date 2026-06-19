export enum CompensationInterval {
  YEARLY = 'yearly',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
  DAILY = 'daily',
  HOURLY = 'hourly',
}

const INTERVAL_MAPPING: Record<string, CompensationInterval> = {
  YEAR: CompensationInterval.YEARLY,
  ANNUAL: CompensationInterval.YEARLY,
  HOUR: CompensationInterval.HOURLY,
  DAY: CompensationInterval.DAILY,
  WEEK: CompensationInterval.WEEKLY,
  MONTH: CompensationInterval.MONTHLY,
};

/**
 * Resolve a pay-period string (e.g. "YEAR", "HOUR") to a CompensationInterval.
 */
export function getCompensationInterval(payPeriod: string): CompensationInterval | null {
  const upper = payPeriod.toUpperCase();
  if (INTERVAL_MAPPING[upper]) {
    return INTERVAL_MAPPING[upper];
  }
  const member = CompensationInterval[upper as keyof typeof CompensationInterval];
  return member ?? null;
}
