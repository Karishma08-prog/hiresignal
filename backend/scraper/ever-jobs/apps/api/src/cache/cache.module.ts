import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

/**
 * Global cache module with optional Redis support.
 *
 * - When REDIS_URL is set → uses Redis as backing store (scalable, persistent)
 * - When unset → falls back to in-memory store (no extra infra required)
 *
 * Environment variables:
 *   ENABLE_CACHE   – enable/disable caching (default: false)
 *   CACHE_EXPIRY   – TTL in seconds (default: 3600)
 *   REDIS_URL      – Redis connection string (optional, e.g. redis://localhost:6379)
 *   CACHE_MAX_ITEMS – max entries for in-memory store (default: 500)
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>('cache.redisUrl');
        const ttl = config.get<number>('cache.expirySec', 3600) * 1000; // ms
        const max = config.get<number>('cache.maxItems', 500);

        if (redisUrl) {
          // Dynamically import Redis store only when needed
          const { redisStore } = await import('cache-manager-redis-yet');
          return {
            store: await redisStore({ url: redisUrl, ttl }),
            ttl,
          };
        }

        // Default: in-memory store
        return { ttl, max };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService, CacheModule],
})
export class AppCacheModule {}
