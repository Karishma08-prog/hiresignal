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
  getJobTypeFromString,
} from '@ever-jobs/models';
import { createHttpClient, extractEmails } from '@ever-jobs/common';
import { WORKABLE_API_URL, WORKABLE_HEADERS } from './workable.constants';
import {
  WorkableJob,
  WorkableResponse,
  WorkableApiV3Job,
  WorkableApiV3Response,
} from './workable.types';

@SourcePlugin({
  site: Site.WORKABLE,
  name: 'Workable',
  category: 'ats',
  isAts: true,
})
@Injectable()
export class WorkableService implements IScraper {
  private readonly logger = new Logger(WorkableService.name);

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const companySlug = input.companySlug;
    if (!companySlug) {
      this.logger.warn('No companySlug provided for Workable scraper');
      return new JobResponseDto([]);
    }

    // Check for API token: per-request auth overrides env var
    const accessToken =
      input.auth?.workable?.accessToken ?? process.env.WORKABLE_API_TOKEN;
    const subdomain =
      input.auth?.workable?.subdomain ??
      process.env.WORKABLE_SUBDOMAIN ??
      companySlug;

    if (accessToken) {
      try {
        const result = await this.scrapeWithApi(
          accessToken,
          subdomain,
          companySlug,
          input,
        );
        return result;
      } catch (err: any) {
        this.logger.warn(
          `Workable authenticated API failed for ${companySlug}: ${err.message}. Falling back to public scraping.`,
        );
      }
    }

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(WORKABLE_HEADERS);

    const url = `${WORKABLE_API_URL}/${encodeURIComponent(companySlug)}`;

    try {
      this.logger.log(`Fetching Workable jobs for company: ${companySlug}`);
      const response = await client.get(url);
      const data: WorkableResponse = response.data ?? { jobs: [] };
      const jobs = data.jobs ?? [];

      this.logger.log(`Workable: found ${jobs.length} raw jobs for ${companySlug}`);

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
          this.logger.warn(`Error processing Workable job ${job.shortcode}: ${err.message}`);
        }
      }

      return new JobResponseDto(jobPosts);
    } catch (err: any) {
      this.logger.error(`Workable scrape error for ${companySlug}: ${err.message}`);
      return new JobResponseDto([]);
    }
  }

  /**
   * Fetch jobs using the authenticated Workable API v3.
   * Uses Bearer token auth and returns published jobs.
   * @see https://workable.readme.io/reference/jobs
   */
  private async scrapeWithApi(
    accessToken: string,
    subdomain: string,
    companySlug: string,
    input: ScraperInputDto,
  ): Promise<JobResponseDto> {
    this.logger.log(
      `Workable: using authenticated API v3 for subdomain: ${subdomain}`,
    );

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });

    const resultsWanted = input.resultsWanted ?? 100;
    const limit = Math.min(resultsWanted, 100);
    const baseUrl = `https://${encodeURIComponent(subdomain)}.workable.com/spi/v3/jobs`;
    const jobPosts: JobPostDto[] = [];
    let sinceId: string | null = null;

    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    while (jobPosts.length < resultsWanted) {
      let url = `${baseUrl}?state=published&limit=${limit}`;
      if (sinceId) {
        url += `&since_id=${encodeURIComponent(sinceId)}`;
      }

      const response = await client.get<WorkableApiV3Response>(url, { headers });

      const data = response.data ?? { jobs: [] };
      const jobs = data.jobs ?? [];

      if (jobs.length === 0) break;

      this.logger.log(
        `Workable (authenticated): fetched ${jobs.length} jobs for ${subdomain}`,
      );

      for (const job of jobs) {
        if (jobPosts.length >= resultsWanted) break;

        try {
          const post = this.processApiJob(job, companySlug);
          if (post) {
            jobPosts.push(post);
          }
        } catch (err: any) {
          this.logger.warn(
            `Error processing Workable API job ${job.shortcode}: ${err.message}`,
          );
        }
      }

      // Workable API uses cursor-based pagination via paging.next
      sinceId = data.paging?.next ?? null;
      if (!sinceId) break;
    }

    this.logger.log(
      `Workable (authenticated) total: ${jobPosts.length} jobs for ${subdomain}`,
    );
    return new JobResponseDto(jobPosts);
  }

  /**
   * Map a Workable API v3 job to JobPostDto.
   */
  private processApiJob(
    job: WorkableApiV3Job,
    companySlug: string,
  ): JobPostDto | null {
    const title = job.full_title ?? job.title;
    if (!title) return null;

    const loc = job.location;
    const location = new LocationDto({
      city: loc?.city ?? null,
      state: loc?.region ?? null,
      country: loc?.country ?? null,
    });

    const isRemote = loc?.telecommuting ?? false;

    const jobType = job.employment_type
      ? (() => {
          const mapped = getJobTypeFromString(job.employment_type!);
          return mapped ? [mapped] : null;
        })()
      : null;

    const datePosted = job.published_on ?? job.created_at ?? null;

    return new JobPostDto({
      id: `workable-${job.shortcode ?? job.id}`,
      title,
      companyName: companySlug,
      jobUrl:
        job.url ??
        job.shortlink ??
        `https://apply.workable.com/${companySlug}/j/${job.shortcode}`,
      location,
      datePosted: datePosted
        ? new Date(datePosted).toISOString().split('T')[0]
        : null,
      isRemote,
      jobType,
      site: Site.WORKABLE,
      // ATS-specific fields
      atsId: job.shortcode ?? job.id ?? null,
      atsType: 'workable',
      department: job.department ?? null,
      employmentType: job.employment_type ?? null,
      applyUrl: job.application_url ?? null,
    });
  }

  private processJob(
    job: WorkableJob,
    companySlug: string,
    _format?: DescriptionFormat,
  ): JobPostDto | null {
    const title = job.title;
    if (!title) return null;

    // Location
    const primaryLoc = job.locations?.[0];
    const location = new LocationDto({
      city: primaryLoc?.city ?? job.city ?? null,
      state: primaryLoc?.region ?? job.state ?? null,
      country: primaryLoc?.country ?? job.country ?? null,
    });

    // Remote detection
    const isRemote = job.telecommuting ?? false;

    // Job type
    const jobType = job.employment_type
      ? (() => {
          const mapped = getJobTypeFromString(job.employment_type!);
          return mapped ? [mapped] : null;
        })()
      : null;

    // Date
    const datePosted = job.published_on ?? job.created_at ?? null;

    return new JobPostDto({
      id: `workable-${job.shortcode}`,
      title,
      companyName: companySlug,
      jobUrl: job.url ?? job.shortlink ?? `https://apply.workable.com/${companySlug}/j/${job.shortcode}`,
      location,
      datePosted: datePosted
        ? new Date(datePosted).toISOString().split('T')[0]
        : null,
      isRemote,
      jobType,
      site: Site.WORKABLE,
      // ATS-specific fields
      atsId: job.shortcode ?? null,
      atsType: 'workable',
      department: job.department ?? null,
      employmentType: job.employment_type ?? null,
      applyUrl: job.application_url ?? null,
    });
  }
}
