# Free Zero-Config Board Audit

Audit source: [board-audit-1780052185029.json](c:/Users/HP/Desktop/hiresignal-frontend/tmp/board-audit/board-audit-1780052185029.json:1)
Second-pass source: [board-audit-1780057737774.json](c:/Users/HP/Desktop/hiresignal-frontend/tmp/board-audit/board-audit-1780057737774.json:1)
Focused timeout rerun: [board-audit-1780061632290.json](c:/Users/HP/Desktop/hiresignal-frontend/tmp/board-audit/board-audit-1780061632290.json:1)

Generated: `2026-05-29T10:56:25.030Z`

Dummy query:
- `searchTerm`: `software engineer`
- `country`: `USA`
- `location`: `United States`
- `days`: `14`
- `resultsWanted`: `3`

## Summary

- Total free zero-config boards tested: `30`
- Working for dummy query: `25`
- Working only through fallback/no-search feed mode: `2`
- Still failing in this environment: `3`
- Boards returning all required fields (`title`, `description`, `datePosted`, `location`): all `25` direct-working boards

## Working

- `linkedin`
- `remotive`
- `weworkremotely`
- `himalayas`
- `arbeitnow`
- `themuse`
- `builtin`
- `landingjobs`
- `hackernews`
- `jobspresso`
- `remotefirstjobs`
- `jobsch`
- `pyjobs`
- `pythonjobs`
- `railsjobs`
- `larajobs`
- `functionalworks`
- `virtualvocations`
- `powertofly`
- `freelancercom`
- `realworkfromanywhere`
- `duunitori`
- `mycareersfuture`
- `habrcareer`
- `vuejobs`

## Working Through Feed/No-Search Fallback

- `golangjobs`
- `fossjobs`

## Still Failing In This Environment

- `workingnomads`
- `devopsjobs`
- `androidjobs`

Second-pass result:

- I reran the original `13` problem boards with board-specific queries and regional overrides.
- `10` of those `13` are now working.
- `2` more are working via the feed/no-search fallback.
- The remaining `3` are still blocked in this environment.

## Root Cause For The Remaining 3

| Board | Current state | Root cause |
| --- | --- | --- |
| `workingnomads` | failing | upstream host/DNS unreachable from this machine |
| `devopsjobs` | failing | upstream host/DNS unreachable from this machine |
| `androidjobs` | failing | source responds with no matching rows for the smoke query and still needs deeper scraper-specific investigation |

Latest focused rerun note:

- I patched `WorkingNomads` to the live `.com` API endpoint and improved niche-board error logging and token matching.
- On the latest focused rerun, the stubborn boards now fail with a clearer transport-level reason instead of fake `no rows` results.
- Current timeout-prone boards in this environment are:
  - `workingnomads`
  - `devopsjobs`
  - `androidjobs`
  - `golangjobs`
  - `fossjobs`

## Stored Fields

The current backend `jobs` table already stores:

- `title`
- `description`
- `date_posted`
- `location`
- `company_name`
- `job_url`
- `site`
- `engine`
- `job_type`
- `is_remote`
- `salary_min`
- `salary_max`
- `currency`
- `raw_payload_json`

That matches the minimum data requirement for HireSignal lead discovery.
