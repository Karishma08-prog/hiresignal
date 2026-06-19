import { SourcePlugin } from '@ever-jobs/plugin';

import { Injectable, Logger } from '@nestjs/common';
import {
  IScraper, ScraperInputDto, JobResponseDto, JobPostDto, Site, LocationDto,
} from '@ever-jobs/models';
import { createHttpClient, stripHtmlTags } from '@ever-jobs/common';

@SourcePlugin({
  site: Site.BREEZYHR,
  name: 'BreezyHR',
  category: 'ats',
  isAts: true,
})
@Injectable()
export class BreezyHRService implements IScraper {
  private readonly logger = new Logger(BreezyHRService.name);

  async scrape(input: ScraperInputDto): Promise<JobResponseDto> {
    const company = input.companySlug;
    if (!company) {
      this.logger.warn('No companySlug provided for Breezy HR scraper');
      return new JobResponseDto([]);
    }

    const jobs: JobPostDto[] = [];
    const resultsWanted = input.resultsWanted ?? 100;

    try {
      const client = createHttpClient({
        proxies: input.proxies,
        timeout: input.requestTimeout ?? 30,
      });

      const url = `https://${company}.breezy.hr/json`;
      this.logger.log(`BreezyHR: fetching ${url}`);

      const { data } = await client.get<any[]>(url);
      const listings = Array.isArray(data) ? data : [];

      for (const listing of listings) {
        if (jobs.length >= resultsWanted) break;

        const title = listing.name ?? listing.title ?? '';
        if (!title) continue;

        const jobId = listing.id ?? listing.friendly_id ?? '';
        const id = `breezyhr-${company}-${jobId}`;

        const locationParts: string[] = [];
        if (listing.location?.city) locationParts.push(listing.location.city);
        if (listing.location?.state) locationParts.push(listing.location.state);
        if (listing.location?.country) locationParts.push(listing.location.country);
        const locationStr = locationParts.length > 0
          ? locationParts.join(', ')
          : null;

        const location = locationStr
          ? new LocationDto({ city: locationStr })
          : null;

        jobs.push(
          new JobPostDto({
            id,
            site: Site.BREEZYHR,
            title,
            companyName: company,
            jobUrl: listing.url ?? `https://${company}.breezy.hr/p/${listing.friendly_id ?? jobId}`,
            location,
            description: listing.description
              ? stripHtmlTags(listing.description)
              : null,
            datePosted: listing.published_date ?? listing.creation_date ?? null,
            isRemote: listing.location?.is_remote ?? false,
            department: listing.department ?? listing.category?.name ?? null,
            atsId: jobId,
            atsType: 'breezyhr',
          }),
        );
      }

      this.logger.log(`BreezyHR: scraped ${jobs.length} jobs for ${company}`);
    } catch (err: any) {
      this.logger.error(`BreezyHR scrape failed for ${company}: ${err.message}`);
    }

    return { jobs };
  }
}
