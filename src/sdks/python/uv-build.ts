import { assert } from "@/utils/assert";
import { Octokit } from "@/utils/octokit";
import { Hono } from "hono";
import { env } from 'hono/adapter'
import { PythonBuilds, PythonBuildInfo } from "./types";
import { withCache, createCacheKey } from "../../utils/cache-helper";

const app = new Hono<HonoEnv>();
const UV_BUILD_REPO = "astral-sh/uv";
const UV_BUILD_METADATA_PATH = "crates/uv-python/download-metadata.json";

interface UvBuildsResult {
  repo: string;
  dataSource: string;
  tagName: string;
  versions: PythonBuilds;
}

/**
 * Build version string from Python build info
 * @example buildVersion({ major: 3, minor: 15, patch: 0, prerelease: "a1" }) => "3.15.0a1"
 * @example buildVersion({ major: 3, minor: 12, patch: 1, prerelease: null }) => "3.12.1"
 */
export function buildVersion(info: PythonBuildInfo): string {
  const version = `${info.major}.${info.minor}.${info.patch}`;
  return info.prerelease ? `${version}${info.prerelease}` : version;
}

/**
 * Filter Python builds based on query parameters
 */
export function filterBuilds(
  builds: PythonBuilds,
  filters: { os?: string; arch?: string; libc?: string }
): PythonBuilds {
  const filtered: PythonBuilds = {};

  for (const [key, build] of Object.entries(builds)) {
    if (filters.os && build.os !== filters.os) continue;
    if (filters.arch && build.arch.family !== filters.arch) continue;
    if (filters.libc && build.libc !== filters.libc) continue;
    
    filtered[key] = build;
  }

  return filtered;
}

/**
 * Transform PythonBuilds to include version field
 */
export function transformBuilds(builds: PythonBuilds) {
  const transformed: Array<Omit<PythonBuildInfo, 'major' | 'minor' | 'patch' | 'prerelease'> & { key: string; version: string }> = [];

  for (const [key, build] of Object.entries(builds)) {
    const { major, minor, patch, prerelease, ...rest } = build;
    transformed.push({
      key,
      ...rest,
      version: buildVersion(build),
    });
  }

  return transformed;
}

/**
 * Convert build metadata into a deduplicated, descending version list for
 * pyenv-compatible endpoints.
 */
export function toVersionList(builds: PythonBuilds): string[] {
  return Array.from(
    new Set(Object.values(builds).map((build) => buildVersion(build)))
  ).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
}

/**
 * Fetch the latest uv Python download metadata from the uv GitHub release.
 */
export async function fetchUvBuilds(githubToken: string): Promise<UvBuildsResult> {
  const octokit = new Octokit(githubToken);

  const result = await octokit.getLatestRelease(UV_BUILD_REPO);

  if (!result.ok) {
    throw new Error(`Failed to fetch latest release: ${await result.text()}`);
  }

  const json = (await result.json()) as any;
  const tagName = json.tag_name;

  const files = await octokit.downloadFile(UV_BUILD_REPO, UV_BUILD_METADATA_PATH, tagName);

  if (!files.ok) {
    throw new Error(`Failed to fetch files: ${await files.text()}`);
  }

  return {
    repo: UV_BUILD_REPO,
    dataSource: UV_BUILD_METADATA_PATH,
    tagName,
    versions: (await files.json()) as PythonBuilds,
  };
}

app.get("/", async (ctx) => {
  const githubToken = env(ctx).GITHUB_TOKEN;
  assert(githubToken, "GITHUB_TOKEN is not set", 503);

  const cacheKey = createCacheKey(ctx.req.raw);
  const skipCache = Boolean(ctx.req.query("force"));

  return withCache(
    ctx,
    { cacheName: "uv-build-versions", skipCache, cacheKey },
    async () => {
      const { repo, dataSource, tagName, versions } = await fetchUvBuilds(githubToken);

      // Apply filters
      const filters = {
        os: ctx.req.query("os"),
        arch: ctx.req.query("arch"),
        libc: ctx.req.query("libc"),
      };
      const filteredVersions = filterBuilds(versions, filters);

      // Transform to include version field
      const transformedVersions = transformBuilds(filteredVersions);

      const now = new Date().toUTCString();

      return {
        data: {
          repo,
          dataSource,
          updated: now,
          tagName,
          versions: transformedVersions,
        },
        updated: now,
      };
    }
  );
});

export default app;
