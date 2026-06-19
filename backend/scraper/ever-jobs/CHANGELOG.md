# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-02-08

### Added

- **Multi-source job search** across 11 job boards (LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google, Bayt, Naukri, BDJobs, Internshala, Exa, Upwork)
- **POST `/api/jobs/search`** endpoint — wrapped JSON response with `{ count, jobs, cached }`, CSV export (`?format=csv`), pagination support (`?paginate=true`)
- **POST `/api/jobs/analyze`** endpoint — job market analysis with summary stats, company intelligence, and per-site comparison
- **CLI application** with `search` and `compare` commands
- **API key authentication** — optional, configurable via `ENABLE_API_KEY_AUTH`
- **Request throttling** — configurable per-client via `@nestjs/throttler`
- **In-memory response caching** — TTL-based with MD5 key generation
- **Health check endpoints** — `GET /health` and `GET /ping`
- **Request logging interceptor** — request IDs, timing, `X-Request-Id` and `X-Process-Time` headers
- **Global exception filter** — structured JSON error responses with validation details
- **CORS support** — environment-driven origin configuration
- **Swagger / OpenAPI docs** with API key authentication support
- **Docker** — multi-stage Dockerfile, production and development docker-compose files
- **Makefile** — shortcut commands for development, build, test, and Docker operations
- **GitHub Actions CI** — build, type-check, and Docker verification workflow
- **Comprehensive documentation** — README, architecture overview, deployment guide, FAQ, and more
