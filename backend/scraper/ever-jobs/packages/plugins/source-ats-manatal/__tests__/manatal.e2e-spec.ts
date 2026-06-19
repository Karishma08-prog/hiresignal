/**
 * E2E test for the Manatal scraper.
 *
 * Tests public career page scraping via the Manatal Open API.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ManatalModule, ManatalService } from '@ever-jobs/source-ats-manatal';
import { ScraperInputDto, Site, DescriptionFormat } from '@ever-jobs/models';

describe('ManatalService (E2E)', () => {
  let service: ManatalService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ManatalModule],
    }).compile();

    service = module.get<ManatalService>(ManatalService);
  });

  it('should return job results via public scraping', async () => {
    const input = new ScraperInputDto({
      siteType: [Site.MANATAL],
      companySlug: 'manatal',
      resultsWanted: 5,
      descriptionFormat: DescriptionFormat.MARKDOWN,
    });

    const response = await service.scrape(input);

    expect(response).toBeDefined();
    expect(response.jobs).toBeDefined();
    expect(Array.isArray(response.jobs)).toBe(true);

    if (response.jobs.length > 0) {
      const job = response.jobs[0];
      expect(job.title).toBeDefined();
      expect(typeof job.title).toBe('string');
      expect(job.site).toBe(Site.MANATAL);
      expect(job.atsType).toBe('manatal');
    }
  });

  it('should return empty results when no companySlug provided', async () => {
    const input = new ScraperInputDto({
      siteType: [Site.MANATAL],
      resultsWanted: 5,
    });

    const response = await service.scrape(input);

    expect(response).toBeDefined();
    expect(response.jobs.length).toBe(0);
  });
});
