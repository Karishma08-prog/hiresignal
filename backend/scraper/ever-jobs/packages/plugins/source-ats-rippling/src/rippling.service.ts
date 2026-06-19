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
import { createHttpClient, extractEmails } from '@ever-jobs/common';
import { RIPPLING_BASE_URL, RIPPLING_HEADERS } from './rippling.constants';
import { RipplingJob, RipplingNextData, RipplingPayRangeDetail } from './rippling.types';

@SourcePlugin({
  site: Site.RIPPLING,
  name: 'Rippling',
  category: 'ats',
  isAts: true,
})
@Injectable()
export class RipplingService implements IScraper {
  private readonly logger = new Logger(RipplingService.name);

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const companySlug = input.companySlug;
    if (!companySlug) {
      this.logger.warn('No companySlug provided for Rippling scraper');
      return new JobResponseDto([]);
    }

    const client = createHttpClient({
      proxies: input.proxies,
      caCert: input.caCert,
      timeout: input.requestTimeout,
    });
    client.setHeaders(RIPPLING_HEADERS);

    const url = `${RIPPLING_BASE_URL}/${encodeURIComponent(companySlug)}/jobs`;

    try {
      this.logger.log(`Fetching Rippling jobs for company: ${companySlug}`);
      const response = await client.get(url);
      const html: string = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);

      // Extract __NEXT_DATA__ from HTML
      const jobs = this.extractJobsFromHtml(html);

      this.logger.log(`Rippling: found ${jobs.length} raw jobs for ${companySlug}`);

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
          this.logger.warn(`Error processing Rippling job ${job.id}: ${err.message}`);
        }
      }

      return new JobResponseDto(jobPosts);
    } catch (err: any) {
      this.logger.error(`Rippling scrape error for ${companySlug}: ${err.message}`);
      return new JobResponseDto([]);
    }
  }

  /**
   * Extract job data from HTML page by finding and parsing the __NEXT_DATA__ script tag.
   * Rippling uses Next.js SSR which embeds the initial data as JSON in a script tag.
   */
  private extractJobsFromHtml(html: string): RipplingJob[] {
    // Find __NEXT_DATA__ script content using regex (no DOM parser needed)
    const nextDataMatch = html.match(
      /<script\s+id="__NEXT_DATA__"\s+type="application\/json"[^>]*>([\s\S]*?)<\/script>/i,
    );

    if (!nextDataMatch?.[1]) {
      this.logger.warn('Could not find __NEXT_DATA__ in Rippling HTML');
      return [];
    }

    try {
      const nextData: RipplingNextData = JSON.parse(nextDataMatch[1]);

      // Navigate the nested structure to find job items
      const queries = nextData.props?.pageProps?.dehydratedState?.queries ?? [];

      for (const query of queries) {
        const items = query.state?.data?.items;
        if (Array.isArray(items) && items.length > 0) {
          return items as RipplingJob[];
        }
      }

      // Fallback: try other common paths in the data structure
      const pageProps = nextData.props?.pageProps;
      if (pageProps) {
        // Some Rippling boards use a different structure
        const jobs = (pageProps as Record<string, unknown>).jobs;
        if (Array.isArray(jobs)) {
          return jobs as RipplingJob[];
        }
      }

      this.logger.warn('No job items found in Rippling __NEXT_DATA__');
      return [];
    } catch (err: any) {
      this.logger.error(`Error parsing Rippling __NEXT_DATA__: ${err.message}`);
      return [];
    }
  }

  private processJob(
    job: RipplingJob,
    companySlug: string,
    _format?: DescriptionFormat,
  ): JobPostDto | null {
    const title = job.title ?? job.name;
    if (!title) return null;

    // Description from description object { company?: string, role?: string }
    let description: string | null = null;
    if (job.description) {
      const parts: string[] = [];
      if (job.description.role) parts.push(job.description.role);
      if (job.description.company) parts.push(job.description.company);
      description = parts.join('\n\n') || null;
    }

    // Location from structured locations array
    const primaryLoc = job.locations?.[0];
    const location = primaryLoc
      ? new LocationDto({
          city: primaryLoc.city ?? null,
          state: primaryLoc.state ?? null,
          country: primaryLoc.country ?? null,
        })
      : null;

    // Remote detection
    const isRemote =
      primaryLoc?.workplaceType?.toLowerCase() === 'remote' ||
      job.workLocations?.some((loc) => loc.toLowerCase().includes('remote')) ||
      false;

    // Compensation from payRangeDetails
    const compensation = this.extractCompensation(job.payRangeDetails);

    // Employment type
    const employmentType = job.employmentType?.label ?? null;

    // Department
    const dept = job.department;
    const department = dept
      ? (dept as Record<string, string>).name ?? null
      : null;

    return new JobPostDto({
      id: `rippling-${job.uuid ?? job.id}`,
      title,
      companyName: job.companyName ?? companySlug,
      jobUrl: job.url ?? `${RIPPLING_BASE_URL}/${companySlug}/jobs/${job.uuid ?? job.id}`,
      location,
      description,
      compensation,
      datePosted: job.createdOn
        ? new Date(job.createdOn).toISOString().split('T')[0]
        : null,
      isRemote,
      emails: extractEmails(description),
      site: Site.RIPPLING,
      // ATS-specific fields
      atsId: job.uuid ?? job.id ?? null,
      atsType: 'rippling',
      department,
      employmentType,
    });
  }

  private extractCompensation(
    payRangeDetails?: RipplingPayRangeDetail[] | null,
  ): CompensationDto | null {
    if (!payRangeDetails || payRangeDetails.length === 0) return null;

    const detail = payRangeDetails[0];
    if (detail.min_value == null && detail.max_value == null) return null;

    const rawInterval = detail.interval?.toLowerCase() ?? '';
    const interval = getCompensationInterval(rawInterval);

    return new CompensationDto({
      interval: interval ?? undefined,
      minAmount: detail.min_value ?? undefined,
      maxAmount: detail.max_value ?? undefined,
      currency: detail.currency ?? 'USD',
    });
  }
}
