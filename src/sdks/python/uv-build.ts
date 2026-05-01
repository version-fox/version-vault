import { assert } from "@/utils/assert";
import { Octokit } from "@/utils/octokit";
import { Hono } from "hono";
import { env } from 'hono/adapter'
import {
  PythonBuildStandaloneAsset,
  PythonBuildStandaloneItem,
  PythonBuildStandalonePlatform,
  PythonBuildStandaloneVariant,
} from "./types";
import { withCache, createCacheKey } from "../../utils/cache-helper";

const app = new Hono<HonoEnv>();

interface GitHubReleaseAsset {
  name?: string;
  browser_download_url?: string;
  size?: number;
  content_type?: string;
  created_at?: string;
  updated_at?: string;
  digest?: string;
}

interface GitHubRelease {
  tag_name?: string;
  assets?: GitHubReleaseAsset[];
}

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
}

function isBuildMarker(segment: string): boolean {
  return (
    segment === "install_only" ||
    segment === "install_only_stripped" ||
    segment === "debug" ||
    segment === "pgo" ||
    segment === "pgo+lto" ||
    segment === "lto" ||
    segment === "noopt" ||
    segment.startsWith("freethreaded")
  );
}

function parsePlatform(parts: string[]): PythonBuildStandalonePlatform | null {
  if (parts.length < 2) {
    return null;
  }

  const arch = parts[0];
  const linuxIndex = parts.indexOf("linux");

  if (linuxIndex !== -1) {
    const libc = parts[linuxIndex + 1];

    if (!libc) {
      return null;
    }

    return { os: "linux", arch, libc };
  }

  if (parts.includes("darwin")) {
    return { os: "darwin", arch, libc: null };
  }

  if (parts.includes("windows")) {
    return { os: "windows", arch, libc: null };
  }

  return null;
}

function getSha256FromDigest(digest?: string): string | undefined {
  const match = digest?.match(/^sha256:([a-fA-F0-9]{64})$/);
  return match?.[1];
}

function buildAssetMetadata(asset: GitHubReleaseAsset): PythonBuildStandaloneAsset | undefined {
  const metadata: PythonBuildStandaloneAsset = {};
  const sha256 = getSha256FromDigest(asset.digest);

  if (typeof asset.size === "number") metadata.size = asset.size;
  if (asset.content_type) metadata.content_type = asset.content_type;
  if (asset.created_at) metadata.created_at = asset.created_at;
  if (asset.updated_at) metadata.updated_at = asset.updated_at;
  if (sha256) metadata.sha256 = sha256;

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function parseAsset(
  release: string,
  asset: GitHubReleaseAsset
): PythonBuildStandaloneItem | null {
  if (!asset.name || !asset.browser_download_url) {
    return null;
  }

  const filenamePattern =
    // implementation-version+release-platform-and-build-suffix.archive
    /^([A-Za-z0-9_]+)-([0-9]+\.[0-9]+\.[0-9]+[A-Za-z0-9]*)\+([0-9]{8})-(.+)\.(tar\.gz|tar\.zst)$/;
  const match = asset.name.match(filenamePattern);

  if (!match) {
    return null;
  }

  const [, implementation, version, , rest] = match;
  const segments = rest.split("-");
  const buildMarkerIndex = segments.findIndex(isBuildMarker);

  if (buildMarkerIndex <= 0) {
    return null;
  }

  const platform = parsePlatform(segments.slice(0, buildMarkerIndex));

  if (!platform) {
    return null;
  }

  const buildSegments = segments.slice(buildMarkerIndex);
  const variant: PythonBuildStandaloneVariant = buildSegments.some((segment) =>
    segment.startsWith("freethreaded")
  )
    ? "freethreaded"
    : "default";
  const assetMetadata = buildAssetMetadata(asset);

  return {
    implementation,
    version,
    display_version: variant === "freethreaded" ? `${version}t` : version,
    variant,
    release,
    filename: asset.name,
    url: asset.browser_download_url,
    platform,
    ...(assetMetadata ? { asset: assetMetadata } : {}),
  };
}

function parseVersion(version: string): ParsedVersion {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);

  if (!match) {
    return { major: 0, minor: 0, patch: 0, prerelease: null };
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || null,
  };
}

function prereleaseRank(prerelease: string | null): number {
  if (!prerelease) return 4;
  if (prerelease.startsWith("rc")) return 3;
  if (prerelease.startsWith("b")) return 2;
  if (prerelease.startsWith("a")) return 1;
  return 0;
}

function compareVersionsDesc(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  const parts = ["major", "minor", "patch"] as const;

  for (const part of parts) {
    if (left[part] !== right[part]) {
      return right[part] - left[part];
    }
  }

  const rankDiff = prereleaseRank(right.prerelease) - prereleaseRank(left.prerelease);

  if (rankDiff !== 0) {
    return rankDiff;
  }

  return (right.prerelease ?? "").localeCompare(left.prerelease ?? "");
}

function sortItems(items: PythonBuildStandaloneItem[]): PythonBuildStandaloneItem[] {
  return items.sort((a, b) => {
    const versionOrder = compareVersionsDesc(a.version, b.version);

    if (versionOrder !== 0) {
      return versionOrder;
    }

    if (a.variant !== b.variant) {
      return a.variant === "default" ? -1 : 1;
    }

    const releaseOrder = b.release.localeCompare(a.release);

    if (releaseOrder !== 0) {
      return releaseOrder;
    }

    return a.filename.localeCompare(b.filename);
  });
}

function filterItems(
  items: PythonBuildStandaloneItem[],
  filters: { os?: string; arch?: string; libc?: string }
): PythonBuildStandaloneItem[] {
  return items.filter((item) => {
    if (filters.os && item.platform.os !== filters.os) return false;
    if (filters.arch && item.platform.arch !== filters.arch) return false;
    if (filters.libc && item.platform.libc !== filters.libc) return false;
    return true;
  });
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
      const repo = "astral-sh/python-build-standalone";
      const octokit = new Octokit(githubToken);
      const result = await octokit.getLatestRelease(repo);

      if (!result.ok) {
        throw new Error(`Failed to fetch latest release: ${await result.text()}`);
      }

      const release = (await result.json()) as GitHubRelease;
      const tagName = release.tag_name;
      let items: PythonBuildStandaloneItem[] = [];

      if (tagName && release.assets) {
        items = release.assets
          .map((asset) => parseAsset(tagName, asset))
          .filter((item): item is PythonBuildStandaloneItem => Boolean(item));
      }

      // Apply filters
      const filters = {
        os: ctx.req.query("os"),
        arch: ctx.req.query("arch"),
        libc: ctx.req.query("libc"),
      };
      const filteredItems = filterItems(sortItems(items), filters);

      const now = new Date().toUTCString();

      return {
        data: {
          items: filteredItems,
        },
        updated: now,
      };
    }
  );
});

export const uvBuildTestHelpers = {
  parseAsset,
  filterItems,
  sortItems,
};

export default app;
