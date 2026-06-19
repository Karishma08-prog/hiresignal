import { SourcePlugin } from '@ever-jobs/plugin';

import { Injectable, Logger } from '@nestjs/common';
import {
  IScraper,
  ScraperInputDto,
  JobResponseDto,
  JobPostDto,
  LocationDto,
  CompensationDto,
  CompensationInterval,
  Site,
  DescriptionFormat,
} from '@ever-jobs/models';
import {
  createHttpClient,
  htmlToPlainText,
  markdownConverter,
  extractEmails,
} from '@ever-jobs/common';
import { MANATAL_API_BASE, MANATAL_HEADERS } from './manatal.constants';
import { ManatalJob, ManatalResponse } from './manatal.types';

@SourcePlugin({
  site: Site.MANATAL,
  name: 'Manatal',
  category: 'ats',
  isAts: true,
})
@Injectable()
export class ManatalService implements IScraper {
  private readonly logger = new Logger(ManatalService.name);

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const companySlug = input.companySlug;
    if (!companySlug) {
      this.logger.warn('No companySlug provided for Manatal scraper');
      return new JobResponseDto([]);
    }

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(MANATAL_HEADERS);

    const url = `${MANATAL_API_BASE}/${encodeURIComponent(companySlug)}/jobs/`;

    try {
      this.logger.log(`Fetching Manatal jobs for company: ${companySlug}`);
      const response = await client.get(url);
      const data: ManatalResponse = response.data ?? { results: [], count: 0, next: null };
      const jobs = data.results ?? [];

      this.logger.log(`Manatal: found ${jobs.length} raw jobs for ${companySlug}`);

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
          this.logger.warn(`Error processing Manatal job ${job.id}: ${err.message}`);
        }
      }

      return new JobResponseDto(jobPosts);
    } catch (err: any) {
      this.logger.error(`Manatal scrape error for ${companySlug}: ${err.message}`);
      return new JobResponseDto([]);
    }
  }

  private processJob(
    job: ManatalJob,
    companySlug: string,
    format?: DescriptionFormat,
  ): JobPostDto | null {
    const title = job.position_name;
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

    // Location from job.location object
    const location = new LocationDto({
      city: job.location?.city ?? null,
      state: job.location?.state ?? null,
      country: job.location?.country ?? null,
    });

    // Compensation from salary_min/salary_max
    const compensation = this.extractCompensation(job);

    // Job URL: prefer apply_url, fall back to career_page_url
    const jobUrl = job.apply_url ?? job.career_page_url ?? null;

    // Date posted
    const datePosted = job.created_at
      ? new Date(job.created_at).toISOString().split('T')[0]
      : null;

    return new JobPostDto({
      id: `manatal-${job.id}`,
      title,
      companyName: companySlug,
      jobUrl: jobUrl ?? `${MANATAL_API_BASE}/${encodeURIComponent(companySlug)}/jobs/${job.id}/`,
      location,
      description,
      compensation,
      datePosted,
      emails: extractEmails(description),
      site: Site.MANATAL,
      // ATS-specific fields
      atsId: String(job.id),
      atsType: 'manatal',
      department: job.department ?? null,
    });
  }

  /**
   * Extract compensation from Manatal salary fields.
   * Skips if both salary_min and salary_max are null.
   */
  private extractCompensation(job: ManatalJob): CompensationDto | null {
    if (job.salary_min == null && job.salary_max == null) {
      return null;
    }

    return new CompensationDto({
      interval: CompensationInterval.YEARLY,
      minAmount: job.salary_min ?? undefined,
      maxAmount: job.salary_max ?? undefined,
      currency: job.salary_currency ?? 'USD',
    });
  }
}
