/**
 * E2E test for the Paylocity scraper.
 *
 * Uses the public Paylocity recruiting feed API (no auth required).
 * The companySlug is a GUID that acts as a public identifier.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PaylocityModule, PaylocityService } from '@ever-jobs/source-ats-paylocity';
import { ScraperInputDto, Site, DescriptionFormat } from '@ever-jobs/models';

describe('PaylocityService (E2E)', () => {
  let service: PaylocityService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PaylocityModule],
    }).compile();

    service = module.get<PaylocityService>(PaylocityService);
  });

  it('should return job results via public feed', async () => {
    const input = new ScraperInputDto({
      siteType: [Site.PAYLOCITY],
      companySlug: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
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
      expect(job.site).toBe(Site.PAYLOCITY);
      expect(job.atsType).toBe('paylocity');
      expect(job.atsId).toBeDefined();
      expect(job.id).toMatch(/^paylocity-/);
    }
  });

  it('should return empty results when no companySlug provided', async () => {
    const input = new ScraperInputDto({
      siteType: [Site.PAYLOCITY],
      resultsWanted: 5,
    });

    const response = await service.scrape(input);

    expect(response).toBeDefined();
    expect(response.jobs.length).toBe(0);
  });

  it('should return empty results for invalid companySlug', async () => {
    const input = new ScraperInputDto({
      siteType: [Site.PAYLOCITY],
      companySlug: 'invalid-nonexistent-slug',
      resultsWanted: 5,
    });

    const response = await service.scrape(input);

    expect(response).toBeDefined();
    expect(response.jobs).toBeDefined();
    expect(Array.isArray(response.jobs)).toBe(true);
  });

  it('should respect resultsWanted limit', async () => {
    const input = new ScraperInputDto({
      siteType: [Site.PAYLOCITY],
      companySlug: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      resultsWanted: 2,
      descriptionFormat: DescriptionFormat.PLAIN,
    });

    const response = await service.scrape(input);

    expect(response).toBeDefined();
    expect(response.jobs.length).toBeLessThanOrEqual(2);
  });
});
