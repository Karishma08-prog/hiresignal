# HireSignal Backend API Contract

This contract is the recommended first backend shape for the current frontend.
It is designed around the existing workflow:

1. create campaign
2. run scrape
3. collect jobs from sources
4. apply title and objective filters
5. aggregate target companies
6. generate reports and exports

## Conventions

- Base URL example: `http://localhost:8000/api`
- All timestamps use ISO 8601 UTC strings
- All IDs use strings
- Pagination uses `page`, `pageSize`, `total`, `totalPages`
- List endpoints return:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0,
  "totalPages": 0
}
```

## Enums

### CampaignStatus

```json
["draft", "queued", "running", "completed", "failed", "paused"]
```

### RunStatus

```json
["queued", "running", "completed", "completed_with_errors", "failed", "cancelled"]
```

### SourceHealthStatus

```json
["ready", "degraded", "paused", "failing", "disabled"]
```

### SourceEngine

```json
["ever_jobs_http", "ever_jobs_playwright", "botasaurus", "ats_api", "custom"]
```

### FitLevel

```json
["high", "medium", "low"]
```

### ObjectiveClassification

```json
["likely", "possible", "unlikely"]
```

### ReportStatus

```json
["queued", "generating", "ready", "failed"]
```

## Shared Objects

### Campaign

```json
{
  "id": "cmp_01JX8P2W6R6E9M3A1B2C3D4E5F",
  "name": "India Marketing Leadership Sweep",
  "roleQuery": "Head of Marketing OR VP Marketing OR CMO",
  "country": "INDIA",
  "location": "India",
  "days": 30,
  "remoteOnly": false,
  "resultsPerSource": 40,
  "status": "running",
  "titleFilterConfig": {
    "includeTitles": [
      "Head of Marketing",
      "VP Marketing",
      "Chief Marketing Officer",
      "Demand Generation",
      "Product Marketing"
    ],
    "excludeTitles": [
      "Brand Manager",
      "Content Writer",
      "Social Media Executive"
    ]
  },
  "objectiveFilterConfig": {
    "objective": "Find companies targeting the US market from India",
    "targetMarket": "US",
    "signals": [
      "expand into US",
      "US customers",
      "US market",
      "North America pipeline"
    ]
  },
  "sourceConfig": {
    "searchBoards": [
      "linkedin",
      "google",
      "remotive",
      "arbeitnow",
      "weworkremotely"
    ],
    "browserBoards": [
      "indeed",
      "naukri"
    ],
    "atsBoards": [
      "greenhouse",
      "lever",
      "workday",
      "ashby"
    ]
  },
  "createdAt": "2026-05-27T09:30:00Z",
  "updatedAt": "2026-05-27T09:45:00Z",
  "lastRunId": "run_01JX8P5Z3Y9T2W8K4F6H7J8L9M"
}
```

### CampaignRun

```json
{
  "id": "run_01JX8P5Z3Y9T2W8K4F6H7J8L9M",
  "campaignId": "cmp_01JX8P2W6R6E9M3A1B2C3D4E5F",
  "status": "running",
  "triggeredBy": "manual",
  "startedAt": "2026-05-27T09:32:00Z",
  "finishedAt": null,
  "rawJobCount": 0,
  "matchedJobCount": 0,
  "companyCount": 0,
  "errorCount": 0,
  "sourceSummary": [
    {
      "siteKey": "linkedin",
      "status": "running",
      "jobsFound": 0,
      "durationMs": null,
      "error": null
    },
    {
      "siteKey": "indeed",
      "status": "queued",
      "jobsFound": 0,
      "durationMs": null,
      "error": null
    }
  ]
}
```

### QueueJob

```json
{
  "id": "qj_01JX8P6H6Q0Z1M2N3B4V5C6X7Y",
  "jobType": "campaign_run",
  "status": "queued",
  "runId": "run_01JX8P5Z3Y9T2W8K4F6H7J8L9M",
  "attempts": 0,
  "maxAttempts": 2,
  "availableAt": "2026-05-27T09:31:58Z",
  "startedAt": null,
  "finishedAt": null,
  "lockedAt": null,
  "lastError": null,
  "createdAt": "2026-05-27T09:31:58Z",
  "updatedAt": "2026-05-27T09:31:58Z"
}
```

### Job

```json
{
  "id": "job_01JX8PAXKJ4G0P7T1N2M3Q4R5S",
  "campaignRunId": "run_01JX8P5Z3Y9T2W8K4F6H7J8L9M",
  "site": "linkedin",
  "engine": "ever_jobs_http",
  "externalId": "li-123456789",
  "jobUrl": "https://www.linkedin.com/jobs/view/123456789",
  "title": "Head of Demand Generation",
  "companyName": "Pepper",
  "location": "Remote, India",
  "datePosted": "2026-05-26",
  "jobType": "fulltime",
  "isRemote": true,
  "salaryMin": null,
  "salaryMax": null,
  "currency": null,
  "description": "Own demand generation for the US market...",
  "normalizedHash": "3bc97ddf8a8c4c2b8f18f0a7b5d0d90f",
  "matchedTitle": true,
  "matchedObjective": true,
  "companyId": "com_01JX8PC8K2N5P7Q9R1S3T4U5V6"
}
```

### Company

```json
{
  "id": "com_01JX8PC8K2N5P7Q9R1S3T4U5V6",
  "name": "Pepper",
  "website": "https://www.pepper.inc",
  "domain": "pepper.inc",
  "industry": "AI Content Operations",
  "location": "India / Remote",
  "description": "Hiring demand-generation leadership to build a stronger US-market growth engine from India.",
  "openRoles": 3,
  "status": "active",
  "revEngineerFit": "high",
  "priority": "high",
  "objectiveSignal": "Explicit US-market demand generation motion",
  "titleMatch": "Head of Demand Generation (US Market)",
  "daysActive": 5,
  "source": "LinkedIn + company site",
  "webEvidence": "Public materials and job listings point to a US-market go-to-market motion.",
  "webSources": [
    "https://www.pepper.inc/pepper-ai",
    "https://in.linkedin.com/company/pepperinc/jobs"
  ],
  "jobCount": 3
}
```

### Source

```json
{
  "id": "src_linkedin",
  "siteKey": "linkedin",
  "displayName": "LinkedIn",
  "category": "search_board",
  "engine": "ever_jobs_http",
  "region": "global",
  "requiresCompanySlug": false,
  "requiresApiKey": false,
  "riskLevel": "core",
  "notes": "Broad source, but rate-limit sensitive."
}
```

### SourceHealth

```json
{
  "siteKey": "linkedin",
  "status": "ready",
  "lastSuccessAt": "2026-05-27T08:40:00Z",
  "lastErrorAt": null,
  "lastErrorMessage": null,
  "avgResults7d": 142.4,
  "avgLatencyMs7d": 9130,
  "successRate7d": 0.94,
  "lastRunJobsFound": 166
}
```

### Report

```json
{
  "id": "rep_01JX8PDVQF6M7N8P9R0S1T2U3V",
  "campaignRunId": "run_01JX8P5Z3Y9T2W8K4F6H7J8L9M",
  "name": "US Target Companies Shortlist",
  "type": "company_shortlist",
  "status": "ready",
  "focus": "Company targeting",
  "metric": "16 companies shortlisted",
  "summary": "Companies whose job descriptions and public evidence suggest US expansion or US customer focus.",
  "generatedAt": "2026-05-27T10:15:00Z",
  "artifactIds": [
    "art_01JX8PF1QX2M3N4B5V6C7X8Z9Y"
  ]
}
```

### Artifact

```json
{
  "id": "art_01JX8PF1QX2M3N4B5V6C7X8Z9Y",
  "reportId": "rep_01JX8PDVQF6M7N8P9R0S1T2U3V",
  "kind": "xlsx",
  "fileName": "RevEngineer_India_Marketing_LAST30D.xlsx",
  "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "downloadUrl": "/api/artifacts/art_01JX8PF1QX2M3N4B5V6C7X8Z9Y/download",
  "createdAt": "2026-05-27T10:15:10Z"
}
```

## Endpoints

## `POST /campaigns`

Create a campaign definition.

### Request

```json
{
  "name": "India Marketing Leadership Sweep",
  "roleQuery": "Head of Marketing OR VP Marketing OR CMO",
  "country": "INDIA",
  "location": "India",
  "days": 30,
  "remoteOnly": false,
  "resultsPerSource": 40,
  "titleFilterConfig": {
    "includeTitles": [
      "Head of Marketing",
      "VP Marketing",
      "Chief Marketing Officer",
      "Demand Generation",
      "Product Marketing"
    ],
    "excludeTitles": [
      "Brand Manager",
      "Content Writer"
    ]
  },
  "objectiveFilterConfig": {
    "objective": "Find companies targeting the US market from India",
    "targetMarket": "US",
    "signals": [
      "expand into US",
      "US market",
      "US customers"
    ]
  },
  "sourceConfig": {
    "searchBoards": [
      "linkedin",
      "google",
      "remotive"
    ],
    "browserBoards": [
      "indeed",
      "naukri"
    ],
    "atsBoards": [
      "greenhouse",
      "lever",
      "workday",
      "ashby"
    ]
  }
}
```

### Response `201`

```json
{
  "item": {
    "id": "cmp_01JX8P2W6R6E9M3A1B2C3D4E5F",
    "name": "India Marketing Leadership Sweep",
    "roleQuery": "Head of Marketing OR VP Marketing OR CMO",
    "country": "INDIA",
    "location": "India",
    "days": 30,
    "remoteOnly": false,
    "resultsPerSource": 40,
    "status": "draft",
    "titleFilterConfig": {
      "includeTitles": [
        "Head of Marketing",
        "VP Marketing",
        "Chief Marketing Officer",
        "Demand Generation",
        "Product Marketing"
      ],
      "excludeTitles": [
        "Brand Manager",
        "Content Writer"
      ]
    },
    "objectiveFilterConfig": {
      "objective": "Find companies targeting the US market from India",
      "targetMarket": "US",
      "signals": [
        "expand into US",
        "US market",
        "US customers"
      ]
    },
    "sourceConfig": {
      "searchBoards": [
        "linkedin",
        "google",
        "remotive"
      ],
      "browserBoards": [
        "indeed",
        "naukri"
      ],
      "atsBoards": [
        "greenhouse",
        "lever",
        "workday",
        "ashby"
      ]
    },
    "createdAt": "2026-05-27T09:30:00Z",
    "updatedAt": "2026-05-27T09:30:00Z",
    "lastRunId": null
  }
}
```

## `GET /campaigns`

### Response `200`

```json
{
  "items": [
    {
      "id": "cmp_01JX8P2W6R6E9M3A1B2C3D4E5F",
      "name": "India Marketing Leadership Sweep",
      "roleQuery": "Head of Marketing OR VP Marketing OR CMO",
      "country": "INDIA",
      "location": "India",
      "days": 30,
      "remoteOnly": false,
      "resultsPerSource": 40,
      "status": "running",
      "createdAt": "2026-05-27T09:30:00Z",
      "updatedAt": "2026-05-27T09:45:00Z",
      "lastRunId": "run_01JX8P5Z3Y9T2W8K4F6H7J8L9M"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1
}
```

## `GET /campaigns/:id`

### Response `200`

```json
{
  "item": {
    "id": "cmp_01JX8P2W6R6E9M3A1B2C3D4E5F",
    "name": "India Marketing Leadership Sweep",
    "roleQuery": "Head of Marketing OR VP Marketing OR CMO",
    "country": "INDIA",
    "location": "India",
    "days": 30,
    "remoteOnly": false,
    "resultsPerSource": 40,
    "status": "running",
    "titleFilterConfig": {
      "includeTitles": [
        "Head of Marketing",
        "VP Marketing"
      ],
      "excludeTitles": [
        "Brand Manager"
      ]
    },
    "objectiveFilterConfig": {
      "objective": "Find companies targeting the US market from India",
      "targetMarket": "US",
      "signals": [
        "expand into US",
        "US market"
      ]
    },
    "sourceConfig": {
      "searchBoards": [
        "linkedin",
        "google",
        "remotive"
      ],
      "browserBoards": [
        "indeed",
        "naukri"
      ],
      "atsBoards": [
        "greenhouse",
        "lever",
        "workday",
        "ashby"
      ]
    },
    "createdAt": "2026-05-27T09:30:00Z",
    "updatedAt": "2026-05-27T09:45:00Z",
    "lastRunId": "run_01JX8P5Z3Y9T2W8K4F6H7J8L9M"
  }
}
```

## `PATCH /campaigns/:id`

Update editable campaign fields before or between runs.

### Request

```json
{
  "days": 21,
  "location": "Remote, India",
  "sourceConfig": {
    "searchBoards": [
      "linkedin",
      "google"
    ],
    "browserBoards": [
      "indeed",
      "naukri"
    ],
    "atsBoards": [
      "greenhouse",
      "lever"
    ]
  }
}
```

### Response `200`

```json
{
  "item": {
    "id": "cmp_01JX8P2W6R6E9M3A1B2C3D4E5F",
    "days": 21,
    "location": "Remote, India",
    "updatedAt": "2026-05-27T10:00:00Z"
  }
}
```

## `POST /campaigns/:id/run`

Create and queue a run.

### Request

```json
{
  "triggeredBy": "manual"
}
```

### Response `202`

```json
{
  "item": {
    "id": "run_01JX8P5Z3Y9T2W8K4F6H7J8L9M",
    "campaignId": "cmp_01JX8P2W6R6E9M3A1B2C3D4E5F",
    "status": "queued",
    "triggeredBy": "manual",
    "startedAt": null,
    "finishedAt": null,
    "rawJobCount": 0,
    "matchedJobCount": 0,
    "companyCount": 0,
    "errorCount": 0,
    "sourceSummary": []
  }
}
```

## `GET /campaign-runs/:id`

### Response `200`

```json
{
  "item": {
    "id": "run_01JX8P5Z3Y9T2W8K4F6H7J8L9M",
    "campaignId": "cmp_01JX8P2W6R6E9M3A1B2C3D4E5F",
    "status": "completed",
    "triggeredBy": "manual",
    "startedAt": "2026-05-27T09:32:00Z",
    "finishedAt": "2026-05-27T10:14:00Z",
    "rawJobCount": 412,
    "matchedJobCount": 231,
    "companyCount": 16,
    "errorCount": 1,
    "sourceSummary": [
      {
        "siteKey": "linkedin",
        "status": "completed",
        "jobsFound": 166,
        "durationMs": 18400,
        "error": null
      },
      {
        "siteKey": "indeed",
        "status": "completed",
        "jobsFound": 40,
        "durationMs": 32100,
        "error": null
      },
      {
        "siteKey": "glassdoor",
        "status": "failed",
        "jobsFound": 0,
        "durationMs": 10900,
        "error": "Cloudflare challenge"
      }
    ]
  }
}
```

## `GET /campaign-runs`

List recent run history across campaigns, optionally filtered by `campaignId`.

### Response `200`

```json
{
  "items": [
    {
      "id": "run_01JX8P5Z3Y9T2W8K4F6H7J8L9M",
      "campaignId": "cmp_01JX8P2W6R6E9M3A1B2C3D4E5F",
      "status": "completed",
      "triggeredBy": "manual",
      "startedAt": "2026-05-27T09:32:00Z",
      "finishedAt": "2026-05-27T10:14:00Z",
      "rawJobCount": 412,
      "matchedJobCount": 231,
      "companyCount": 16,
      "errorCount": 1,
      "sourceSummary": []
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1
}
```

## `GET /campaign-runs/:id/queue`

### Response `200`

```json
{
  "item": {
    "id": "qj_01JX8P6H6Q0Z1M2N3B4V5C6X7Y",
    "jobType": "campaign_run",
    "status": "completed",
    "runId": "run_01JX8P5Z3Y9T2W8K4F6H7J8L9M",
    "attempts": 1,
    "maxAttempts": 2,
    "availableAt": "2026-05-27T09:31:58Z",
    "startedAt": "2026-05-27T09:32:00Z",
    "finishedAt": "2026-05-27T10:14:00Z",
    "lockedAt": null,
    "lastError": null,
    "createdAt": "2026-05-27T09:31:58Z",
    "updatedAt": "2026-05-27T10:14:00Z"
  }
}
```

## `GET /campaign-runs/:id/jobs`

### Response `200`

```json
{
  "items": [
    {
      "id": "job_01JX8PAXKJ4G0P7T1N2M3Q4R5S",
      "campaignRunId": "run_01JX8P5Z3Y9T2W8K4F6H7J8L9M",
      "site": "linkedin",
      "engine": "ever_jobs_http",
      "externalId": "li-123456789",
      "jobUrl": "https://www.linkedin.com/jobs/view/123456789",
      "title": "Head of Demand Generation",
      "companyName": "Pepper",
      "location": "Remote, India",
      "datePosted": "2026-05-26",
      "jobType": "fulltime",
      "isRemote": true,
      "salaryMin": null,
      "salaryMax": null,
      "currency": null,
      "description": "Own demand generation for the US market...",
      "normalizedHash": "3bc97ddf8a8c4c2b8f18f0a7b5d0d90f",
      "matchedTitle": true,
      "matchedObjective": true,
      "companyId": "com_01JX8PC8K2N5P7Q9R1S3T4U5V6"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 231,
  "totalPages": 12
}
```

## `GET /campaign-runs/:id/companies`

### Response `200`

```json
{
  "items": [
    {
      "id": "com_01JX8PC8K2N5P7Q9R1S3T4U5V6",
      "name": "Pepper",
      "website": "https://www.pepper.inc",
      "domain": "pepper.inc",
      "industry": "AI Content Operations",
      "location": "India / Remote",
      "description": "Hiring demand-generation leadership to build a stronger US-market growth engine from India.",
      "openRoles": 3,
      "status": "active",
      "revEngineerFit": "high",
      "priority": "high",
      "objectiveSignal": "Explicit US-market demand generation motion",
      "titleMatch": "Head of Demand Generation (US Market)",
      "daysActive": 5,
      "source": "LinkedIn + company site",
      "webEvidence": "Public materials and job listings point to a US-market go-to-market motion.",
      "webSources": [
        "https://www.pepper.inc/pepper-ai"
      ],
      "jobCount": 3
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 16,
  "totalPages": 1
}
```

## `GET /companies`

### Query params

- `campaignRunId`
- `fit`
- `priority`
- `search`

### Response `200`

```json
{
  "items": [
    {
      "id": "com_01JX8PC8K2N5P7Q9R1S3T4U5V6",
      "name": "Pepper",
      "website": "https://www.pepper.inc",
      "domain": "pepper.inc",
      "industry": "AI Content Operations",
      "location": "India / Remote",
      "description": "Hiring demand-generation leadership to build a stronger US-market growth engine from India.",
      "openRoles": 3,
      "status": "active",
      "revEngineerFit": "high",
      "priority": "high",
      "objectiveSignal": "Explicit US-market demand generation motion",
      "titleMatch": "Head of Demand Generation (US Market)",
      "daysActive": 5,
      "source": "LinkedIn + company site",
      "webEvidence": "Public materials and job listings point to a US-market go-to-market motion.",
      "webSources": [
        "https://www.pepper.inc/pepper-ai"
      ],
      "jobCount": 3
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 16,
  "totalPages": 1
}
```

## `GET /companies/:id`

### Response `200`

```json
{
  "item": {
    "company": {
      "id": "com_01JX8PC8K2N5P7Q9R1S3T4U5V6",
      "name": "Pepper",
      "website": "https://www.pepper.inc",
      "domain": "pepper.inc",
      "industry": "AI Content Operations",
      "location": "India / Remote",
      "description": "Hiring demand-generation leadership to build a stronger US-market growth engine from India.",
      "openRoles": 3,
      "status": "active",
      "revEngineerFit": "high",
      "priority": "high",
      "objectiveSignal": "Explicit US-market demand generation motion",
      "titleMatch": "Head of Demand Generation (US Market)",
      "daysActive": 5,
      "source": "LinkedIn + company site",
      "webEvidence": "Public materials and job listings point to a US-market go-to-market motion.",
      "webSources": [
        "https://www.pepper.inc/pepper-ai"
      ],
      "jobCount": 3
    },
    "jobs": [
      {
        "id": "job_01JX8PAXKJ4G0P7T1N2M3Q4R5S",
        "title": "Head of Demand Generation",
        "site": "linkedin",
        "jobUrl": "https://www.linkedin.com/jobs/view/123456789",
        "datePosted": "2026-05-26",
        "matchedTitle": true,
        "matchedObjective": true
      }
    ],
    "signals": {
      "objectiveScore": 9,
      "objectiveClassification": "likely",
      "matchedSignals": [
        "Expand into US",
        "US customers/clients"
      ],
      "evidenceSnippet": "Own pipeline growth for US customers from our India team..."
    }
  }
}
```

## `GET /sources`

### Response `200`

```json
{
  "items": [
    {
      "id": "src_linkedin",
      "siteKey": "linkedin",
      "displayName": "LinkedIn",
      "category": "search_board",
      "engine": "ever_jobs_http",
      "region": "global",
      "requiresCompanySlug": false,
      "requiresApiKey": false,
      "riskLevel": "core",
      "notes": "Broad source, but rate-limit sensitive."
    },
    {
      "id": "src_indeed",
      "siteKey": "indeed",
      "displayName": "Indeed",
      "category": "search_board",
      "engine": "botasaurus",
      "region": "global",
      "requiresCompanySlug": false,
      "requiresApiKey": false,
      "riskLevel": "core",
      "notes": "Stealth browser path in current backend."
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 2,
  "totalPages": 1
}
```

## `GET /sources/health`

### Response `200`

```json
{
  "items": [
    {
      "siteKey": "linkedin",
      "status": "ready",
      "lastSuccessAt": "2026-05-27T08:40:00Z",
      "lastErrorAt": null,
      "lastErrorMessage": null,
      "avgResults7d": 142.4,
      "avgLatencyMs7d": 9130,
      "successRate7d": 0.94,
      "lastRunJobsFound": 166
    },
    {
      "siteKey": "glassdoor",
      "status": "failing",
      "lastSuccessAt": "2026-05-24T05:10:00Z",
      "lastErrorAt": "2026-05-27T09:50:00Z",
      "lastErrorMessage": "Cloudflare challenge",
      "avgResults7d": 0.8,
      "avgLatencyMs7d": 12100,
      "successRate7d": 0.12,
      "lastRunJobsFound": 0
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 2,
  "totalPages": 1
}
```

## `GET /reports`

### Response `200`

```json
{
  "items": [
    {
      "id": "rep_01JX8PDVQF6M7N8P9R0S1T2U3V",
      "campaignRunId": "run_01JX8P5Z3Y9T2W8K4F6H7J8L9M",
      "name": "US Target Companies Shortlist",
      "type": "company_shortlist",
      "status": "ready",
      "focus": "Company targeting",
      "metric": "16 companies shortlisted",
      "summary": "Companies whose job descriptions and public evidence suggest US expansion or US customer focus.",
      "generatedAt": "2026-05-27T10:15:00Z",
      "artifactIds": [
        "art_01JX8PF1QX2M3N4B5V6C7X8Z9Y"
      ]
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1
}
```

## `GET /reports/:id`

### Response `200`

```json
{
  "item": {
    "id": "rep_01JX8PDVQF6M7N8P9R0S1T2U3V",
    "campaignRunId": "run_01JX8P5Z3Y9T2W8K4F6H7J8L9M",
    "name": "US Target Companies Shortlist",
    "type": "company_shortlist",
    "status": "ready",
    "focus": "Company targeting",
    "metric": "16 companies shortlisted",
    "summary": "Companies whose job descriptions and public evidence suggest US expansion or US customer focus.",
    "generatedAt": "2026-05-27T10:15:00Z",
    "artifactIds": [
      "art_01JX8PF1QX2M3N4B5V6C7X8Z9Y"
    ]
  }
}
```

## `GET /artifacts/:id/download`

Returns the file stream for CSV or XLSX.

### Response `200`

- Binary file response
- Recommended headers:

```text
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="RevEngineer_India_Marketing_LAST30D.xlsx"
```

## Frontend Mapping

Current frontend pages map to these endpoints:

- `Scraper`
  - `POST /campaigns`
  - `POST /campaigns/:id/run`
- `Campaigns`
  - `GET /campaigns`
  - `GET /campaign-runs`
  - `GET /campaign-runs/:id`
  - `GET /campaign-runs/:id/queue`
- `Company`
  - `GET /campaign-runs/:id/companies`
  - `GET /companies/:id`
- `Job Boards`
  - `GET /sources`
  - `GET /sources/health`
- `Reports`
  - `GET /reports`
  - `GET /reports/:id`
- `Dashboard`
  - `GET /campaigns`
  - `GET /campaign-runs`
  - `GET /campaign-runs/:id/queue`
  - `GET /sources/health`
  - `GET /reports`
  - `GET /campaign-runs/:id/companies`

## Recommended Backend Sequence

Implement in this order:

1. `campaigns`
2. `campaign-runs`
3. `jobs`
4. `companies`
5. `sources + source health`
6. `reports + artifacts`

That order matches the current frontend build and lets you wire real data into
the UI incrementally.
