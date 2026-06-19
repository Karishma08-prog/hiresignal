import { SourcePlugin } from '@ever-jobs/plugin';

import { Injectable, Logger } from '@nestjs/common';
import {
  IScraper,
  ScraperInputDto,
  JobResponseDto,
  JobPostDto,
  LocationDto,
  CompensationDto,
  Site,
  DescriptionFormat,
  getCompensationInterval,
} from '@ever-jobs/models';
import {
  createHttpClient,
  htmlToPlainText,
  extractEmails,
} from '@ever-jobs/common';
import { ASHBY_API_URL, ASHBY_HEADERS } from './ashby.constants';
import { AshbyJob, AshbyResponse, AshbyCompensationTier } from './ashby.types';

@SourcePlugin({
  site: Site.ASHBY,
  name: 'Ashby',
  category: 'ats',
  isAts: true,
})
@Injectable()
export class AshbyService implements IScraper {
  private readonly logger = new Logger(AshbyService.name);

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const companySlug = input.companySlug;
    if (!companySlug) {
      this.logger.warn('No companySlug provided for Ashby scraper');
      return new JobResponseDto([]);
    }

    // Check for API key: per-request auth overrides env var
    const apiKey = input.auth?.ashby?.apiKey ?? process.env.ASHBY_API_KEY;
    if (apiKey) {
      try {
        const result = await this.scrapeWithApi(apiKey, companySlug, input);
        return result;
      } catch (err: any) {
        this.logger.warn(
          `Ashby authenticated API failed for ${companySlug}: ${err.message}. Falling back to public scraping.`,
        );
      }
    }

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(ASHBY_HEADERS);

    const url = `${ASHBY_API_URL}/${encodeURIComponent(companySlug)}`;

    try {
      this.logger.log(`Fetching Ashby jobs for company: ${companySlug}`);
      const response = await client.get(url);
      const data: AshbyResponse = response.data ?? { jobs: [] };
      const jobs = data.jobs ?? [];

      this.logger.log(`Ashby: found ${jobs.length} raw jobs for ${companySlug}`);

      const resultsWanted = input.resultsWanted ?? 100;
      const jobPosts: JobPostDto[] = [];

      for (const job of jobs) {
        if (jobPosts.length >= resultsWanted) break;
        if (job.isListed === false) continue;

        try {
          const post = this.processJob(job, companySlug, input.descriptionFormat);
          if (post) {
            jobPosts.push(post);
          }
        } catch (err: any) {
          this.logger.warn(`Error processing Ashby job ${job.id}: ${err.message}`);
        }
      }

      return new JobResponseDto(jobPosts);
    } catch (err: any) {
      this.logger.error(`Ashby scrape error for ${companySlug}: ${err.message}`);
      return new JobResponseDto([]);
    }
  }

  /**
   * Fetch jobs using the authenticated Ashby Posting API.
   * Uses Basic Auth with the API key and reuses processJob() for mapping.
   */
  private async scrapeWithApi(
    apiKey: string,
    companySlug: string,
    input: ScraperInputDto,
  ): Promise<JobResponseDto> {
    this.logger.log(
      `Ashby: using authenticated API for company: ${companySlug}`,
    );

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });

    const url = `${ASHBY_API_URL}/${encodeURIComponent(companySlug)}`;
    const authToken = Buffer.from(`${apiKey}:`).toString('base64');

    const response = await client.post(url, undefined, {
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${authToken}`,
      },
    });

    const data: AshbyResponse = response.data ?? { jobs: [] };
    const jobs = data.jobs ?? [];

    this.logger.log(
      `Ashby (authenticated): found ${jobs.length} jobs for ${companySlug}`,
    );

    const resultsWanted = input.resultsWanted ?? 100;
    const jobPosts: JobPostDto[] = [];

    for (const job of jobs) {
      if (jobPosts.length >= resultsWanted) break;
      if (job.isListed === false) continue;

      try {
        const post = this.processJob(job, companySlug, input.descriptionFormat);
        if (post) {
          jobPosts.push(post);
        }
      } catch (err: any) {
        this.logger.warn(
          `Error processing Ashby API job ${job.id}: ${err.message}`,
        );
      }
    }

    return new JobResponseDto(jobPosts);
  }

  private processJob(
    job: AshbyJob,
    companySlug: string,
    format?: DescriptionFormat,
  ): JobPostDto | null {
    const title = job.title;
    if (!title) return null;

    // Description
    let description: string | null = null;
    if (format === DescriptionFormat.HTML && job.descriptionHtml) {
      description = job.descriptionHtml;
    } else if (job.descriptionPlain) {
      description = job.descriptionPlain;
    } else if (job.descriptionHtml) {
      description = htmlToPlainText(job.descriptionHtml);
    }

    // Location
    const addr = job.address?.postalAddress;
    const location = new LocationDto({
      city: addr?.addressLocality ?? job.location ?? null,
      state: addr?.addressRegion ?? null,
      country: addr?.addressCountry ?? null,
    });

    // Compensation - extract from the rich tier structure
    const compensation = this.extractCompensation(job);

    return new JobPostDto({
      id: `ashby-${job.id}`,
      title,
      companyName: companySlug,
      jobUrl: job.jobUrl ?? `https://jobs.ashbyhq.com/${companySlug}/${job.id}`,
      location,
      description,
      compensation,
      datePosted: job.publishedDate
        ? new Date(job.publishedDate).toISOString().split('T')[0]
        : null,
      isRemote: job.isRemote ?? false,
      emails: extractEmails(description),
      site: Site.ASHBY,
      // ATS-specific fields
      atsId: job.id ?? null,
      atsType: 'ashby',
      department: job.departmentName ?? null,
      team: job.teamName ?? null,
      employmentType: job.employmentType ?? null,
      applyUrl: job.applyUrl ?? null,
    });
  }

  /**
   * Extract compensation from Ashby's nested tier structure.
   * Ashby provides compensation as components with tiers (floor/ceiling).
   */
  private extractCompensation(job: AshbyJob): CompensationDto | null {
    const comp = job.compensation;
    if (!comp) return null;

    // Try compensationComponents first, then summaryComponents
    const components = comp.compensationComponents ?? comp.summaryComponents ?? [];
    if (components.length === 0) return null;

    // Find the base salary component (first component or one labeled 'salary'/'base')
    const salaryComponent = components.find(
      (c) =>
        c.compensationType?.toLowerCase().includes('salary') ||
        c.compensationType?.toLowerCase() === 'base' ||
        c.label?.toLowerCase().includes('salary'),
    ) ?? components[0];

    const tiers = salaryComponent?.tiers ?? [];
    if (tiers.length === 0) return null;

    // Use the first tier's floor/ceiling
    const tier: AshbyCompensationTier = tiers[0];
    if (tier.tierFloor == null && tier.tierCeiling == null) return null;

    const rawInterval = tier.interval?.toLowerCase() ?? '';
    const interval = getCompensationInterval(rawInterval);

    return new CompensationDto({
      interval: interval ?? undefined,
      minAmount: tier.tierFloor ?? undefined,
      maxAmount: tier.tierCeiling ?? undefined,
      currency: tier.currency ?? 'USD',
    });
  }
}
