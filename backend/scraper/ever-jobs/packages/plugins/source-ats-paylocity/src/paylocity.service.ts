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
import { PAYLOCITY_API_BASE, PAYLOCITY_HEADERS } from './paylocity.constants';
import { PaylocityJob } from './paylocity.types';

@SourcePlugin({
  site: Site.PAYLOCITY,
  name: 'Paylocity',
  category: 'ats',
  isAts: true,
})
@Injectable()
export class PaylocityService implements IScraper {
  private readonly logger = new Logger(PaylocityService.name);

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const companySlug = input.companySlug;
    if (!companySlug) {
      this.logger.warn('No companySlug provided for Paylocity scraper');
      return new JobResponseDto([]);
    }

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(PAYLOCITY_HEADERS);

    const url = `${PAYLOCITY_API_BASE}/${encodeURIComponent(companySlug)}`;

    try {
      this.logger.log(`Fetching Paylocity jobs for company: ${companySlug}`);
      const response = await client.get(url);
      const jobs: PaylocityJob[] = Array.isArray(response.data)
        ? response.data
        : [];

      this.logger.log(`Paylocity: found ${jobs.length} raw jobs for ${companySlug}`);

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
          this.logger.warn(`Error processing Paylocity job ${job.JobId}: ${err.message}`);
        }
      }

      return new JobResponseDto(jobPosts);
    } catch (err: any) {
      this.logger.error(`Paylocity scrape error for ${companySlug}: ${err.message}`);
      return new JobResponseDto([]);
    }
  }

  private processJob(
    job: PaylocityJob,
    companySlug: string,
    format?: DescriptionFormat,
  ): JobPostDto | null {
    const title = job.JobTitle;
    if (!title) return null;

    // Description is HTML
    let description: string | null = null;
    if (job.Description) {
      if (format === DescriptionFormat.HTML) {
        description = job.Description;
      } else if (format === DescriptionFormat.MARKDOWN) {
        description = markdownConverter(job.Description) ?? job.Description;
      } else {
        description = htmlToPlainText(job.Description);
      }
    }

    // Location from city/state/country fields
    const location = new LocationDto({
      city: job.City ?? null,
      state: job.State ?? null,
      country: job.Country ?? null,
    });

    // Job URL: use the provided JobUrl or construct a fallback
    const jobUrl = job.JobUrl
      ?? `${PAYLOCITY_API_BASE}/${encodeURIComponent(companySlug)}`;

    // Date posted
    const datePosted = job.PostedDate
      ? new Date(job.PostedDate).toISOString().split('T')[0]
      : null;

    return new JobPostDto({
      id: `paylocity-${job.JobId}`,
      title,
      companyName: job.Company ?? companySlug,
      jobUrl,
      location,
      description,
      datePosted,
      emails: extractEmails(description),
      site: Site.PAYLOCITY,
      // ATS-specific fields
      atsId: String(job.JobId),
      atsType: 'paylocity',
      department: job.Department ?? null,
      employmentType: job.JobType ?? null,
    });
  }
}
