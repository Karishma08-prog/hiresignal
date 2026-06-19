/** BambooHR public careers list endpoint (slug interpolated at runtime) */
export const BAMBOOHR_CAREERS_URL = 'https://{slug}.bamboohr.com/careers/list';

/** Default headers for BambooHR careers requests */
export const BAMBOOHR_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129 Safari/537.36',
};
