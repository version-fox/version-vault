import { assert } from "@/utils/assert";
import { Octokit } from "@/utils/octokit";
import { Hono } from "hono";
import { env } from 'hono/adapter'
import { PythonBuilds, PythonBuildInfo } from "./types";
import { withCache, createCacheKey } from "../../utils/cache-helper";

const app = new Hono<HonoEnv>();

/**
 * Build version string from Python build info
 * @example buildVersion({ major: 3, minor: 15, patch: 0, prerelease: "a1" }) => "3.15.0a1"
 * @example buildVersion({ major: 3, minor: 12, patch: 1, prerelease: null }) => "3.12.1"
 */
function buildVersion(info: PythonBuildInfo): string {
  const version = `${info.major}.${info.minor}.${info.patch}`;
  return info.prerelease ? `${version}${info.prerelease}` : version;
}

/**
 * Filter Python builds based on query parameters
 */
function filterBuilds(
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
function transformBuilds(builds: PythonBuilds) {
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

app.get("/", async (ctx) => {
  const githubToken = env(ctx).GITHUB_TOKEN;
  assert(githubToken, "GITHUB_TOKEN is not set");

  const cacheKey = createCacheKey(ctx.req.raw);
  const skipCache = Boolean(ctx.req.query("force"));

  return withCache(
    ctx,
    { cacheName: "uv-build-versions", skipCache, cacheKey },
    async () => {
      const repo = "astral-sh/uv";
      const octokit = new Octokit(githubToken);

      const result = await octokit.getLatestRelease(repo);

      if (!result.ok) {
        throw new Error(`Failed to fetch latest release: ${await result.text()}`);
      }

      const json = (await result.json()) as any;
      const tagName = json.tag_name;

      // /repos/{owner}/{repo}/contents/{path}
      // https://github.com/astral-sh/uv/blob/main/crates/uv-python/download-metadata.json
      const path = "crates/uv-python/download-metadata.json";

      const files = await octokit.downloadFile(repo, path, tagName);

      if (!files.ok) {
        throw new Error(`Failed to fetch files: ${await files.text()}`);
      }

      const versions = (await files.json()) as PythonBuilds;

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
          dataSource: path,
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
