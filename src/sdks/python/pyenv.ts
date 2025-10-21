import { assert } from "@/utils/assert";
import { Octokit } from "@/utils/octokit";
import { Hono } from "hono";
import { env } from 'hono/adapter'
import { withCache, createCacheKey } from "../../utils/cache-helper";

const app = new Hono<HonoEnv>();

app.get("/", async (ctx) => {
  const githubToken = env(ctx).GITHUB_TOKEN;
  assert(githubToken, "GITHUB_TOKEN is not set", 503);

  const cacheKey = createCacheKey(ctx.req.raw);
  const skipCache = Boolean(ctx.req.query("force"));

  return withCache(
    ctx,
    { cacheName: "pyenv-versions", skipCache, cacheKey },
    async () => {
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
