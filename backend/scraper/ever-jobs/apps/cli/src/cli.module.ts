import { Module } from '@nestjs/common';
import { PluginModule, CircuitBreakerModule } from '@ever-jobs/plugin';
import { ALL_SOURCE_MODULES } from '@ever-jobs/plugin-sources';
import { AnalyticsModule } from '@ever-jobs/analytics';
import { AppConfigModule } from '../../api/src/config/config.module';
import { MetricsModule } from '../../api/src/metrics/metrics.module';
import { JobsService } from '../../api/src/jobs/jobs.service';
import { SearchCommand } from './commands/search.command';
import { CompareCommand } from './commands/compare.command';

/**
 * CLI module — a lean bootstrap for the `search` / `compare` commands.
 *
 * It wires only what JobsService needs to scrape, without the API's HTTP/GraphQL
 * surface (no controllers, resolver, cache, or cron):
 *   - AppConfigModule  → global ConfigService (loads .env)
 *   - MetricsModule    → global MetricsService
 *   - PluginModule     → PluginRegistry + plugin auto-discovery (registers every source)
 *   - CircuitBreakerModule → the @Optional CircuitBreakerInterceptor JobsService wraps calls in
 *   - ALL_SOURCE_MODULES   → every job-board / ATS / company source plugin
 *   - AnalyticsModule  → AnalyticsService used by the --analyze / --bd flags
 */
@Module({
  imports: [
    AppConfigModule,
    MetricsModule,
    PluginModule,
    CircuitBreakerModule,
    ...ALL_SOURCE_MODULES,
    AnalyticsModule,
  ],
  providers: [JobsService, SearchCommand, CompareCommand],
})
export class CliModule {}
