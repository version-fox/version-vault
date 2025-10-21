import { CACHE_CONTROL, LAST_MODIFIED } from "@/constants";
import type { Context } from "hono";

export interface CacheOptions {
  /**
   * Cache name for caches.open()
   */
  cacheName: string;
  /**
   * Whether to skip cache (from query param "force")
   */
  skipCache: boolean;
  /**
   * Cache key request object
   */
  cacheKey: Request;
}

export interface CacheResponse<T> {
  /**
   * Response data to be returned
   */
  data: T;
  /**
   * Updated timestamp
   */
  updated: string;
}

/**
 * Generic cache wrapper for API endpoints
 * @param ctx Hono context
 * @param options Cache options
 * @param fetcher Function that fetches the data when cache miss
 * @returns Response with cache handling
 */
export async function withCache<T>(
  ctx: Context,
  options: CacheOptions,
  fetcher: () => Promise<CacheResponse<T>>
): Promise<Response> {
  const { cacheName, skipCache, cacheKey } = options;

  const cache = await caches.open(cacheName);

  // Check cache first
  if (!skipCache) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  // Fetch data
  const { data, updated } = await fetcher();

  // Build response
  const resp = ctx.json(data, 200, {
    [LAST_MODIFIED]: updated,
    [CACHE_CONTROL]: "max-age=1200, s-maxage=1200",
  });

  // Store in cache asynchronously
  ctx.executionCtx.waitUntil(cache.put(cacheKey, resp.clone()));

  return resp;
}

/**
 * Create cache key from request, ignoring query params
 */
export function createCacheKey(request: Request): Request {
  const cacheUrl = new URL(request.url);
  cacheUrl.search = "";
  return new Request(cacheUrl.toString(), request);
}
