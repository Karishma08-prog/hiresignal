/**
 * ADP career site job search API endpoint.
 * The slug is interpolated at runtime to build the company's career page URL.
 */
export const ADP_CAREERS_URL = 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html';

/**
 * ADP job search REST API endpoint.
 * Uses a JSON-based search API behind the career portal.
 */
export const ADP_API_URL = 'https://workforcenow.adp.com/mascsr/default/careercenter/public/events/staffing/v1/job-requisitions';

/** Default headers for ADP career site requests */
export const ADP_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};
