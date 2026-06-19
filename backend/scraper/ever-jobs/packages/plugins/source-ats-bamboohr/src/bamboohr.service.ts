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
  markdownConverter,
  extractEmails,
} from '@ever-jobs/common';
import { BAMBOOHR_HEADERS } from './bamboohr.constants';
import {
  BambooHRResponse,
  BambooHRJob,
  BambooHRApiResponse,
  BambooHRApiJobOpening,
} from './bamboohr.types';

@SourcePlugin({
  site: Site.BAMBOOHR,
  name: 'BambooHR',
  category: 'ats',
  isAts: true,
})
@Injectable()
export class BambooHRService implements IScraper {
  private readonly logger = new Logger(BambooHRService.name);

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const companySlug = input.companySlug;
    if (!companySlug) {
      this.logger.warn('No companySlug provided for BambooHR scraper');
      return new JobResponseDto([]);
    }

    // Check for API key: per-request auth overrides env var
    const apiKey = input.auth?.bamboohr?.apiKey ?? process.env.BAMBOOHR_API_KEY;
    if (apiKey) {
      try {
        const result = await this.scrapeWithApi(apiKey, companySlug, input);
        return result;
      } catch (err: any) {
        this.logger.warn(
          `BambooHR authenticated API failed for ${companySlug}: ${err.message}. Falling back to public scraping.`,
        );
      }
    }

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(BAMBOOHR_HEADERS);

    const url = `https://${encodeURIComponent(companySlug)}.bamboohr.com/careers/list`;

    try {
      this.logger.log(`Fetching BambooHR jobs for company: ${companySlug}`);
      const response = await client.get(url);
      const data: BambooHRResponse = response.data ?? { result: [] };
      const jobs = data.result ?? [];

      this.logger.log(`BambooHR: found ${jobs.length} raw jobs for ${companySlug}`);

      const resultsWanted = input.resultsWanted ?? 100;
      const jobPosts: JobPostDto[] = [];

      for (const job of jobs) {
        if (jobPosts.length >= resultsWanted) break;

        try {
          const post = this.mapJob(job, companySlug, input.descriptionFormat);
          if (post) {
            jobPosts.push(post);
          }
        } catch (err: any) {
          this.logger.warn(`Error processing BambooHR job ${job.id}: ${err.message}`);
        }
      }

      return new JobResponseDto(jobPosts);
    } catch (err: any) {
      this.logger.error(`BambooHR scrape error for ${companySlug}: ${err.message}`);
      return new JobResponseDto([]);
    }
  }

  /**
   * Fetch jobs using the authenticated BambooHR Job Summaries API.
   * Uses Basic Auth with the API key as username and 'x' as password.
   * Returns job openings directly (not applications), ensuring all open
   * positions are captured regardless of whether they have applications.
   *
   * @see https://documentation.bamboohr.com/reference/get-job-summaries
   */
  private async scrapeWithApi(
    apiKey: string,
    companySlug: string,
    input: ScraperInputDto,
  ): Promise<JobResponseDto> {
    this.logger.log(
      `BambooHR: using authenticated API for company: ${companySlug}`,
    );

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });

    const url = `https://api.bamboohr.com/api/gateway.php/${encodeURIComponent(companySlug)}/v1/applicant_tracking/job_summaries`;
    const authToken = Buffer.from(`${apiKey}:x`).toString('base64');

    const response = await client.get<BambooHRApiResponse>(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${authToken}`,
      },
      params: {
        statusGroups: 'Open',
      },
    });

    const data = response.data ?? { jobOpenings: [] };
    const openings = data.jobOpenings ?? [];

    this.logger.log(
      `BambooHR (authenticated): found ${openings.length} job openings for ${companySlug}`,
    );

    const resultsWanted = input.resultsWanted ?? 100;
    const jobPosts: JobPostDto[] = [];

    for (const opening of openings) {
      if (jobPosts.length >= resultsWanted) break;

      try {
        const post = this.mapApiJobOpening(opening, companySlug, input.descriptionFormat);
        if (post) {
          jobPosts.push(post);
        }
      } catch (err: any) {
        this.logger.warn(
          `Error processing BambooHR API job opening ${opening.id}: ${err.message}`,
        );
      }
    }

    return new JobResponseDto(jobPosts);
  }

  /**
   * Map a BambooHR API job opening to a JobPostDto.
   */
  private mapApiJobOpening(
    opening: BambooHRApiJobOpening,
    companySlug: string,
    format?: DescriptionFormat,
  ): JobPostDto | null {
    const title = opening.title;
    if (!title) return null;

    // Description is HTML from the API
    let description: string | null = null;
    if (opening.description) {
      if (format === DescriptionFormat.HTML) {
        description = opening.description;
      } else if (format === DescriptionFormat.MARKDOWN) {
        description = markdownConverter(opening.description) ?? opening.description;
      } else {
        description = htmlToPlainText(opening.description);
      }
    }

    // Location from the job opening
    const location = new LocationDto({
      city: opening.location?.city ?? null,
      state: opening.location?.state ?? null,
      country: opening.location?.country ?? null,
    });

    // Job URL
    const jobUrl = opening.jobOpeningUrl
      ?? `https://${encodeURIComponent(companySlug)}.bamboohr.com/careers/${opening.id}`;

    return new JobPostDto({
      id: `bamboohr-${opening.id}`,
      title,
      companyName: companySlug,
      jobUrl,
      location,
      description,
      isRemote: false,
      emails: extractEmails(description),
      site: Site.BAMBOOHR,
      atsId: String(opening.id),
      atsType: 'bamboohr',
      department: opening.department?.label ?? null,
      datePosted: opening.dateCreated
        ? new Date(opening.dateCreated).toISOString().split('T')[0]
        : null,
    });
  }

  private mapJob(
    job: BambooHRJob,
    companySlug: string,
    format?: DescriptionFormat,
  ): JobPostDto | null {
    const title = job.jobOpeningName;
    if (!title) return null;

    // Description is HTML
    let description: string | null = null;
    if (job.description) {
      if (format === DescriptionFormat.HTML) {
        description = job.description;
      } else if (format === DescriptionFormat.MARKDOWN) {
        description = markdownConverter(job.description) ?? job.description;
      } else {
        description = htmlToPlainText(job.description);
      }
    }

    // Location
    const location = new LocationDto({
      city: job.location?.city ?? null,
      state: job.location?.state ?? null,
      country: job.location?.country ?? null,
    });

    // Job URL
    const jobUrl = `https://${encodeURIComponent(companySlug)}.bamboohr.com/careers/${job.id}`;

    return new JobPostDto({
      id: `bamboohr-${job.id}`,
      title,
      companyName: companySlug,
      jobUrl,
      location,
      description,
      isRemote: false,
      emails: extractEmails(description),
      site: Site.BAMBOOHR,
      atsId: String(job.id),
      atsType: 'bamboohr',
      department: job.departmentLabel ?? null,
    });
  }
}
