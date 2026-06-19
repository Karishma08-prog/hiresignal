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
  CompensationInterval,
} from '@ever-jobs/models';
import {
  createHttpClient,
  htmlToPlainText,
  markdownConverter,
  extractEmails,
} from '@ever-jobs/common';
import { WORKINGNOMADS_API_URL, WORKINGNOMADS_HEADERS } from './workingnomads.constants';
import { WorkingNomadsJob } from './workingnomads.types';

@SourcePlugin({
  site: Site.WORKINGNOMADS,
  name: 'WorkingNomads',
  category: 'remote',
})
@Injectable()
export class WorkingNomadsService implements IScraper {
  private readonly logger = new Logger(WorkingNomadsService.name);

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    this.logger.log(
      `WorkingNomads scrape: search="${input.searchTerm ?? ''}"`,
    );

    try {
      const client = createHttpClient({
        proxies: input.proxies,
        caCert: input.caCert,
        timeout: input.requestTimeout,
      });
      client.setHeaders(WORKINGNOMADS_HEADERS);

      const response = await client.get<WorkingNomadsJob[]>(WORKINGNOMADS_API_URL);

      const data = response.data;
      if (!data || !Array.isArray(data)) {
        this.logger.warn('WorkingNomads returned empty or invalid response');
        return new JobResponseDto([]);
      }

      this.logger.log(`WorkingNomads returned ${data.length} jobs`);

      let rawJobs = data;

      // Filter by search term if provided (match title or tags)
      if (input.searchTerm) {
        const term = input.searchTerm.toLowerCase();
        const termParts = this.tokenizeSearchTerm(input.searchTerm);
        rawJobs = rawJobs.filter((job) => {
          const title = (job.title ?? '').toLowerCase();
          const tags = (job.tags ?? '').toLowerCase();
          const description = (job.description ?? '').toLowerCase();
          if (title.includes(term) || tags.includes(term) || description.includes(term)) {
            return true;
          }
          return termParts.some((part) =>
            title.includes(part) || tags.includes(part) || description.includes(part),
          );
        });
      }

      const jobs: JobPostDto[] = [];

      for (let i = 0; i < rawJobs.length; i++) {
        const entry = rawJobs[i];
        try {
          const job = this.mapJob(entry, i, input.descriptionFormat);
          if (job) {
            jobs.push(job);
          }
        } catch (err: any) {
          this.logger.warn(
            `Error mapping WorkingNomads job at index ${i}: ${err.message}`,
          );
        }
      }

      return new JobResponseDto(jobs);
    } catch (err: any) {
      this.logger.error(`WorkingNomads scrape error: ${this.describeError(err)}`);
      return new JobResponseDto([]);
    }
  }

  private tokenizeSearchTerm(searchTerm: string): string[] {
    return searchTerm
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4);
  }

  private describeError(err: any): string {
    return (
      err?.message ||
      err?.code ||
      err?.cause?.code ||
      err?.response?.statusText ||
      err?.name ||
      String(err)
    );
  }

  /**
   * Map a raw WorkingNomads API job object to a JobPostDto.
   */
  private mapJob(
    entry: WorkingNomadsJob,
    index: number,
    descriptionFormat?: DescriptionFormat,
  ): JobPostDto | null {
    if (!entry.title || !entry.url) {
      return null;
    }

    // Process description (WorkingNomads returns HTML)
    let description: string | null = entry.description ?? null;
    if (description) {
      if (descriptionFormat === DescriptionFormat.PLAIN) {
        description = htmlToPlainText(description);
      } else if (descriptionFormat === DescriptionFormat.MARKDOWN) {
        description = markdownConverter(description) ?? description;
      }
    }

    // Build location
    const location = this.parseLocation(entry.location);

    // Parse date (extract date part from ISO 8601)
    const datePosted = entry.pub_date
      ? entry.pub_date.split('T')[0]
      : null;

    // Parse skills from comma-separated tags
    const skills = entry.tags
      ? entry.tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
      : null;

    return new JobPostDto({
      id: `workingnomads-${index}`,
      title: entry.title,
      companyName: entry.company_name ?? null,
      jobUrl: entry.url,
      location,
      description,
      compensation: null,
      datePosted,
      isRemote: true,
      emails: extractEmails(description),
      site: Site.WORKINGNOMADS,
      skills: skills && skills.length > 0 ? skills : null,
    });
  }

  /**
   * Parse location string into a LocationDto.
   */
  private parseLocation(locationStr: string | null | undefined): LocationDto {
    if (!locationStr) {
      return new LocationDto({});
    }

    const parts = locationStr.split(',').map((p) => p.trim());

    return new LocationDto({
      city: parts[0] ?? null,
      state: parts[1] ?? null,
      country: parts[2] ?? null,
    });
  }
}
