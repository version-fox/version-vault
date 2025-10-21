import { CACHE_CONTROL, LAST_MODIFIED } from "@/constants";
import { assert } from "@/utils/assert";
import { Octokit } from "@/utils/octokit";
import { Hono } from "hono";
import { env } from 'hono/adapter'
import { PythonBuilds, PythonBuildInfo } from "./types";

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
  const request = ctx.req.raw;

  const cacheUrl = new URL(request.url);
  // cache ignore query params
  cacheUrl.search = "";
  const cacheKey = new Request(cacheUrl.toString(), request);

  let skipCache = Boolean(ctx.req.query("force"));

  const cache = await caches.open("uv-build-versions");

  // Check whether the value is already available in the cache
  // if not, you will need to fetch it from origin, and store it in the cache
  const response = await cache.match(cacheKey);
  if (!skipCache && response) {
    return response;
  }

  const repo = "astral-sh/uv";

  const octokit = new Octokit(githubToken);

  const result = await octokit.getLatestRelease(repo);

  if (!result.ok) {
    return ctx.json({
      error: "Failed to fetch latest release",
      json: await result.json(),
    });
  }

  const json = (await result.json()) as any;
  const tagName = json.tag_name;

  // /repos/{owner}/{repo}/contents/{path}
  // https://github.com/astral-sh/uv/blob/main/crates/uv-python/download-metadata.json
  const path = "crates/uv-python/download-metadata.json";

  const files = await octokit.downloadFile(repo, path, tagName);

  if (!files.ok) {
    return ctx.json({
      error: "Failed to fetch files",
      json: await result.json(),
    });
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

  const resp = ctx.json(
    {
      repo,
      dataSource: path,
      updated: now,
      tagName,
      versions: transformedVersions,
    },
    200,
    {
      [LAST_MODIFIED]: now,
      [CACHE_CONTROL]: "max-age=1200, s-maxage=1200",
    }
  );

  ctx.executionCtx.waitUntil(cache.put(cacheKey, resp.clone()));
  return resp;
});

export default app;
