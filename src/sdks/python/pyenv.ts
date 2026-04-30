import { assert } from "@/utils/assert";
import { Octokit } from "@/utils/octokit";
import { Hono } from "hono";
import { env } from 'hono/adapter'
import { withCache, createCacheKey } from "../../utils/cache-helper";
import { fetchUvBuilds, filterBuilds, toVersionList } from "./uv-build";

const app = new Hono<HonoEnv>();

/**
 * Enable uv-build mode for truthy rollout flag values.
 */
function isUvBuildEnabled(value?: string): boolean {
  return ["1", "true", "yes", "on", "uv-build", "uv_build"].includes(
    value?.toLowerCase() ?? ""
  );
}

app.get("/", async (ctx) => {
  const { GITHUB_TOKEN: githubToken, PYTHON_USE_UV_BUILD } = env(ctx);
  assert(githubToken, "GITHUB_TOKEN is not set", 503);

  const useUvBuild = isUvBuildEnabled(PYTHON_USE_UV_BUILD);
  const cacheKey = createCacheKey(ctx.req.raw);
  const skipCache = Boolean(ctx.req.query("force"));

  return withCache(
    ctx,
    {
      cacheName: useUvBuild ? "pyenv-versions-from-uv-build" : "pyenv-versions",
      skipCache,
      cacheKey,
    },
    async () => {
      if (useUvBuild) {
        const { tagName, versions } = await fetchUvBuilds(githubToken);
        const filteredVersions = filterBuilds(versions, {
          os: ctx.req.query("os"),
          arch: ctx.req.query("arch"),
          libc: ctx.req.query("libc"),
        });
        const now = new Date().toUTCString();

        return {
          data: {
            updated: now,
            tagName,
            versions: toVersionList(filteredVersions),
          },
          updated: now,
        };
      }

      const repo = "pyenv/pyenv";
      const octokit = new Octokit(githubToken);

      const result = await octokit.getLatestRelease(repo);

      if (!result.ok) {
        throw new Error(`Failed to fetch latest release: ${await result.text()}`);
      }

      const json = (await result.json()) as any;
      const tagName = json.tag_name;

      // /repos/{owner}/{repo}/contents/{path}
      // https://github.com/pyenv/pyenv/tree/master/plugins/python-build/share/python-build
      const path = "plugins/python-build/share/python-build";

      const files = await octokit.listPath(repo, path, tagName);

      if (!files.ok) {
        throw new Error(`Failed to fetch files: ${await files.text()}`);
      }

      const _versions = (await files.json()) as any[];
      const versions = _versions
        .map((v) => {
          if (v.type === "dir") {
            return;
          }

          return v.name;
        })
        .filter(Boolean);

      const now = new Date().toUTCString();

      return {
        data: {
          updated: now,
          tagName,
          versions,
        },
        updated: now,
      };
    }
  );
});

export default app;
