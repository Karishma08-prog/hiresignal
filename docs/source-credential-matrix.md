# Source Credential Matrix

This matrix is based on the current frontend source list, the backend source metadata, the existing scraper scripts, and the latest local board audits.

Important:
- `Ready` in the frontend does not mean the source has verified credentials.
- Many sources do not need an API key at all.
- Some ATS sources need a `companySlug` plus the Scrappa token for discovery.
- `credential_present` refers to whether the current machine/repo already has the needed credential path available.

Working status labels:
- `working_for_use_case`: working for the current India-marketing workflow
- `working_but_not_for_current_query`: source works, but not for the current India-marketing query
- `working_via_existing_results`: source is producing/importing real rows in saved results, but was not separately live-audited in this pass
- `failing_or_unreliable`: broken, timing out, or returning no usable rows in current setup

| Source | Engine | Needs API Key | Needs Proxy | Needs Company Slug | Credential Present | Working Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LinkedIn | `ever-jobs HTTP` | no | optional | no | n/a | `working_for_use_case` | Works in current audit; proxy exists but is optional. |
| Indeed | `Botasaurus` | no | optional | no | yes | `failing_or_unreliable` | Browser path exists; proxy creds exist; source still times out from this machine. |
| Naukri | `Botasaurus` | no | no | no | n/a | `working_for_use_case` | Botasaurus environment is fixed and Naukri is returning rows. |
| Google Jobs | `ever-jobs HTTP` | no | no | no | n/a | `failing_or_unreliable` | No rows in current audits for both India and smoke tests. |
| Remotive | `ever-jobs HTTP` | no | no | no | n/a | `working_for_use_case` | Returning rows in the India-marketing audit. |
| Arbeitnow | `ever-jobs HTTP` | no | no | no | n/a | `working_but_not_for_current_query` | Works on global smoke query, not current India-marketing query. |
| We Work Remotely | `ever-jobs HTTP` | no | no | no | n/a | `working_for_use_case` | Returning rows in the India-marketing audit. |
| Glassdoor | `Botasaurus` | no | optional | no | yes | `failing_or_unreliable` | Browser path exists; current machine cannot reliably reach Glassdoor. |
| ZipRecruiter | `Botasaurus` | no | optional | no | yes | `working_but_not_for_current_query` | Parser was fixed; now returns rows for global smoke query. |
| JobsDB | `ever-jobs HTTP` | no | no | no | n/a | `failing_or_unreliable` | Current plugin path returns 404. |
| Himalayas | `ever-jobs HTTP` | no | no | no | n/a | `working_for_use_case` | Returning rows in the India-marketing audit. |
| Working Nomads | `ever-jobs HTTP` | no | no | no | n/a | `failing_or_unreliable` | Current path hits ETIMEDOUT. |
| The Muse | `ever-jobs HTTP` | no | no | no | n/a | `working_but_not_for_current_query` | Works on global smoke query. |
| Built In | `ever-jobs HTTP` | no | no | no | n/a | `working_for_use_case` | Returning rows in the India-marketing audit. |
| Landing Jobs | `ever-jobs HTTP` | no | no | no | n/a | `working_but_not_for_current_query` | Works on global smoke query. |
| Virtual Vocations | `ever-jobs HTTP` | no | no | no | n/a | `failing_or_unreliable` | Scraper returns zero/error in current audit. |
| PowerToFly | `ever-jobs HTTP` | no | no | no | n/a | `failing_or_unreliable` | Scraper returns zero/error in current audit. |
| Freelancer.com | `ever-jobs HTTP` | no | no | no | n/a | `failing_or_unreliable` | Current path times out. |
| Real Work From Anywhere | `ever-jobs HTTP` | no | no | no | n/a | `failing_or_unreliable` | Current path times out. |
| Remote First Jobs | `ever-jobs HTTP` | no | no | no | n/a | `failing_or_unreliable` | No usable rows in current audit. |
| Jobspresso | `ever-jobs HTTP` | no | no | no | n/a | `working_but_not_for_current_query` | Works on global smoke query. |
| NoDesk | `ever-jobs HTTP` | no | no | no | n/a | `failing_or_unreliable` | Current plugin path returns 404. |
| 4 Day Week | `ever-jobs HTTP` | no | no | no | n/a | `failing_or_unreliable` | No usable rows in current audit. |
| Startup Jobs | `ever-jobs HTTP` | no | no | no | n/a | `failing_or_unreliable` | Current plugin path gets 403. |
| Get on Board | `ever-jobs HTTP` | no | no | no | n/a | `failing_or_unreliable` | No usable rows in current audit. |
| Greenhouse | `Scrappa + ever-jobs ATS` | yes | no | yes | yes | `working_via_existing_results` | Scrappa token is present; ATS results are present in saved output files. |
| Lever | `Scrappa + ever-jobs ATS` | yes | no | yes | yes | `working_via_existing_results` | Scrappa token is present; ATS results are present in saved output files. |
| Workday | `Scrappa + ever-jobs ATS` | yes | no | yes | yes | `working_via_existing_results` | Scrappa token is present; ATS results are present in saved output files. |
| Ashby | `Scrappa + ever-jobs ATS` | yes | no | yes | yes | `working_via_existing_results` | Scrappa token is present; ATS results are present in saved output files. |
| SmartRecruiters | `Scrappa + ever-jobs ATS` | yes | no | yes | yes | `working_via_existing_results` | Scrappa token is present; ATS results are present in saved output files. |
| Jobvite | `Scrappa + ever-jobs ATS` | yes | no | yes | yes | `working_via_existing_results` | Scrappa token is present; ATS results are present in saved output files. |
| Workable | `Scrappa + ever-jobs ATS` | yes | no | yes | yes | `working_via_existing_results` | Scrappa token is present; ATS results are present in saved output files. |

## Current Credential Reality

Credentials or credential-like dependencies that are present in the current setup:
- Scrappa token: present in `scrappa_ats.mjs`
- Residential proxy credentials: present in `find-jobs.mjs` and `india-marketing.mjs`
- Botasaurus Python environment: present via `C:\Users\HP\botavenv`

Credentials that are not centrally managed yet:
- There is no backend secrets table or `.env`-driven source credential registry
- The frontend `Ready` status is currently not checking actual key presence

## Practical Summary

- Sources that truly need no API key: most `ever-jobs HTTP` boards and the browser boards
- Sources that currently depend on an existing token path: the ATS discovery flow via `scrappa_ats.mjs`
- Sources blocked mostly by code or network, not missing keys: `Indeed`, `Glassdoor`, `JobsDB`, `Working Nomads`, `Startup Jobs`, and several others

## Best Next Backend Improvement

Add a real credential registry with these fields:
- `source`
- `needsApiKey`
- `needsProxy`
- `needsCompanySlug`
- `credentialPresent`
- `credentialVerifiedAt`
- `workingStatus`
- `lastError`

That would let the frontend show real readiness instead of mock `Ready` labels.
