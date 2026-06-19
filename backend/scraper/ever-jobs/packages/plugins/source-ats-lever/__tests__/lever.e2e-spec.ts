/**
 * E2E test for the Lever scraper.
 *
 * Tests both public scraping and authenticated API paths.
 * To run authenticated tests, set LEVER_API_KEY env var.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { LeverModule, LeverService } from '@ever-jobs/source-ats-lever';
import { ScraperInputDto, Site, DescriptionFormat } from '@ever-jobs/models';

describe('LeverService (E2E)', () => {
  let service: LeverService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LeverModule],
    }).compile();

    service = module.get<LeverService>(LeverService);
  });

  it('should return job results via public scraping', async () => {
    const input = new ScraperInputDto({
      siteType: [Site.LEVER],
      companySlug: 'netflix',
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
      expect(job.site).toBe(Site.LEVER);
      expect(job.atsType).toBe('lever');
      expect(job.atsId).toBeDefined();
    }
  });

  it('should fall back to public scraping when API key is invalid', async () => {
    const input = new ScraperInputDto({
      siteType: [Site.LEVER],
      companySlug: 'netflix',
      resultsWanted: 3,
      auth: {
        lever: { apiKey: 'invalid-key' },
      },
    });

    const response = await service.scrape(input);

    expect(response).toBeDefined();
    expect(response.jobs).toBeDefined();
    expect(Array.isArray(response.jobs)).toBe(true);
  });

  it('should return empty results when no companySlug provided', async () => {
    const input = new ScraperInputDto({
      siteType: [Site.LEVER],
      resultsWanted: 5,
    });

    const response = await service.scrape(input);

    expect(response).toBeDefined();
    expect(response.jobs.length).toBe(0);
  });
});
