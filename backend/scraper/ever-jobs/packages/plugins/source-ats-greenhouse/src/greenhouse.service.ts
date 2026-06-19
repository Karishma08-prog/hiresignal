import { SourcePlugin } from '@ever-jobs/plugin';

import { Injectable, Logger } from '@nestjs/common';
import {
  IScraper,
  ScraperInputDto,
  JobResponseDto,
  JobPostDto,
  LocationDto,
  Site,
  DescriptionFormat,
} from '@ever-jobs/models';
import {
  createHttpClient,
  htmlToPlainText,
  extractEmails,
} from '@ever-jobs/common';
import { GREENHOUSE_API_URL, GREENHOUSE_HARVEST_API_URL, GREENHOUSE_HEADERS } from './greenhouse.constants';
import { GreenhouseJob, GreenhouseResponse, GreenhouseHarvestJob } from './greenhouse.types';

@SourcePlugin({
  site: Site.GREENHOUSE,
  name: 'Greenhouse',
  category: 'ats',
  isAts: true,
})
@Injectable()
export class GreenhouseService implements IScraper {
  private readonly logger = new Logger(GreenhouseService.name);

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const companySlug = input.companySlug;
    if (!companySlug) {
      this.logger.warn('No companySlug provided for Greenhouse scraper');
      return new JobResponseDto([]);
    }

    // ── Authenticated Harvest API path ──────────────────────────────
    const apiKey = input.auth?.greenhouse?.apiKey ?? process.env.GREENHOUSE_API_KEY;
    if (apiKey) {
      try {
        return await this.scrapeWithApi(apiKey, input, companySlug);
      } catch (err: any) {
        this.logger.warn(
          `Greenhouse Harvest API failed for ${companySlug}, falling back to public board: ${err.message}`,
        );
      }
    }

    // ── Public board scraping (existing behaviour) ──────────────────
    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(GREENHOUSE_HEADERS);

    const url = `${GREENHOUSE_API_URL}/${encodeURIComponent(companySlug)}/jobs?content=true`;

    try {
      this.logger.log(`Fetching Greenhouse jobs for company: ${companySlug}`);
      const response = await client.get(url);
      const data: GreenhouseResponse = response.data ?? { jobs: [] };
      const jobs = data.jobs ?? [];

      this.logger.log(`Greenhouse: found ${jobs.length} raw jobs for ${companySlug}`);

      const resultsWanted = input.resultsWanted ?? 100;
      const jobPosts: JobPostDto[] = [];

      for (const job of jobs) {
        if (jobPosts.length >= resultsWanted) break;

        try {
          const post = this.processJob(job, companySlug, input.descriptionFormat);
          if (post) {
            jobPosts.push(post);
          }
        } catch (err: any) {
          this.logger.warn(`Error processing Greenhouse job ${job.id}: ${err.message}`);
        }
      }

      return new JobResponseDto(jobPosts);
    } catch (err: any) {
      this.logger.error(`Greenhouse scrape error for ${companySlug}: ${err.message}`);
      return new JobResponseDto([]);
    }
  }

  private processJob(
    job: GreenhouseJob,
    companySlug: string,
    format?: DescriptionFormat,
  ): JobPostDto | null {
    const title = job.title;
    if (!title) return null;

    // Description is HTML content
    let description: string | null = null;
    if (job.content) {
      if (format === DescriptionFormat.HTML) {
        description = job.content;
      } else {
        description = htmlToPlainText(job.content);
      }
    }

    // Location from location object or offices
    const locationName = job.location?.name ?? null;
    const officeName = job.offices?.[0]?.name ?? null;
    const locationStr = locationName ?? officeName;
    const location = locationStr
      ? new LocationDto({ city: locationStr })
      : null;

    // Remote detection
    const isRemote =
      locationStr?.toLowerCase().includes('remote') ?? false;

    // Department
    const department = job.departments?.[0]?.name ?? null;

    // Date posted
    const datePosted = job.first_published ?? job.updated_at ?? null;

    return new JobPostDto({
      id: `gh-${job.id}`,
      title,
      companyName: job.company_name ?? companySlug,
      jobUrl: job.absolute_url ?? `https://boards.greenhouse.io/${companySlug}/jobs/${job.id}`,
      location,
      description,
      datePosted: datePosted
        ? new Date(datePosted).toISOString().split('T')[0]
        : null,
      isRemote,
      emails: extractEmails(description),
      site: Site.GREENHOUSE,
      // ATS-specific fields
      atsId: job.id?.toString() ?? null,
      atsType: 'greenhouse',
      department,
    });
  }

  // ─── Harvest API (authenticated) ───────────────────────────────────

  /**
   * Scrape jobs using the official Greenhouse Harvest API.
   *
   * The Harvest API returns richer data than the public board API:
   * full HTML descriptions, departments, offices with addresses,
   * custom fields, confidential flags, and more.
   *
   * Uses Basic Auth with the API key as the username and an empty password.
   *
   * @see https://developers.greenhouse.io/harvest.html#list-jobs
   */
  private async scrapeWithApi(
    apiKey: string,
    input: ScraperInputDto,
    companySlug: string,
  ): Promise<JobResponseDto> {
    this.logger.log(
      `Using authenticated Greenhouse Harvest API for company: ${companySlug}`,
    );

    const authHeader = `Basic ${Buffer.from(apiKey + ':').toString('base64')}`;

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders({
      ...GREENHOUSE_HEADERS,
      Authorization: authHeader,
    });

    const resultsWanted = input.resultsWanted ?? 100;
    const jobPosts: JobPostDto[] = [];
    let page = 1;

    while (jobPosts.length < resultsWanted) {
      const perPage = Math.min(100, resultsWanted - jobPosts.length);
      const url = `${GREENHOUSE_HARVEST_API_URL}/jobs?per_page=${perPage}&page=${page}`;

      this.logger.log(`Harvest API: fetching page ${page} (per_page=${perPage})`);
      const response = await client.get<GreenhouseHarvestJob[]>(url);

      const rawJobs: GreenhouseHarvestJob[] = response.data ?? [];
      if (rawJobs.length === 0) {
        this.logger.log('Harvest API: no more jobs available');
        break;
      }

      this.logger.log(`Harvest API: received ${rawJobs.length} jobs on page ${page}`);

      for (const job of rawJobs) {
        if (jobPosts.length >= resultsWanted) break;

        try {
          const post = this.processHarvestJob(job, companySlug, input.descriptionFormat);
          if (post) {
            jobPosts.push(post);
          }
        } catch (err: any) {
          this.logger.warn(`Error processing Harvest job ${job.id}: ${err.message}`);
        }
      }

      // If we got fewer results than requested per_page, we've hit the last page
      if (rawJobs.length < perPage) break;
      page++;
    }

    this.logger.log(
      `Harvest API: returning ${jobPosts.length} jobs for ${companySlug}`,
    );
    return new JobResponseDto(jobPosts);
  }

  /**
   * Map a Greenhouse Harvest API job object to a `JobPostDto`.
   */
  private processHarvestJob(
    job: GreenhouseHarvestJob,
    companySlug: string,
    format?: DescriptionFormat,
  ): JobPostDto | null {
    const title = job.name;
    if (!title) return null;

    // Skip template and non-open jobs
    if (job.is_template) return null;
    if (job.status && job.status !== 'open') return null;

    // The Harvest API does not return description/content on the
    // list endpoint — use notes if available (often HTML)
    let description: string | null = null;
    if (job.notes) {
      if (format === DescriptionFormat.HTML) {
        description = job.notes;
      } else {
        description = htmlToPlainText(job.notes);
      }
    }

    // Location: prefer first office name, fall back to office location name
    const office = job.offices?.[0] ?? null;
    const locationStr = office?.name ?? office?.location?.name ?? null;
    const location = locationStr
      ? new LocationDto({ city: locationStr })
      : null;

    // Remote detection
    const isRemote = locationStr?.toLowerCase().includes('remote') ?? false;

    // Department
    const department = job.departments?.[0]?.name ?? null;

    // Date posted: prefer opened_at, fall back to created_at / updated_at
    const datePosted = job.opened_at ?? job.created_at ?? job.updated_at ?? null;

    return new JobPostDto({
      id: `gh-${job.id}`,
      title,
      companyName: companySlug,
      jobUrl: `https://boards.greenhouse.io/${companySlug}/jobs/${job.id}`,
      location,
      description,
      datePosted: datePosted
        ? new Date(datePosted).toISOString().split('T')[0]
        : null,
      isRemote,
      emails: extractEmails(description),
      site: Site.GREENHOUSE,
      // ATS-specific fields
      atsId: job.id?.toString() ?? null,
      atsType: 'greenhouse',
      department,
    });
  }
}
