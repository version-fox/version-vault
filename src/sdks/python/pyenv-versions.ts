import { CACHE_CONTROL, LAST_MODIFIED } from "@/constants";
import { assert } from "@/utils/assert";
import { Octokit } from "@/utils/octokit";
import { Hono } from "hono";

const app = new Hono<HonoEnv>();

const CACHE_KEY = "python/pyenv/versions-cache";

app.get("/", async (ctx) => {
  assert(ctx.env.GITHUB_TOKEN, "GITHUB_TOKEN is not set");
  let skipCache = Boolean(ctx.req.query("force"));

  const cache = await ctx.env.STORAGE.get(CACHE_KEY, 'json');
  if (!skipCache && cache) {
    return response(cache);
  }

  const repo = "pyenv/pyenv";

  const octokit = new Octokit(ctx.env.GITHUB_TOKEN);

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
  // https://github.com/pyenv/pyenv/tree/master/plugins/python-build/share/python-build
  const path = "plugins/python-build/share/python-build";

  const files = await octokit.getContents(repo, path, tagName);

  if (!files.ok) {
    return ctx.json({
      error: "Failed to fetch files",
      json: await result.json(),
    });
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

  const versionJson = {
    updated: now,
    tagName,
    versions,
  };

  ctx.executionCtx.waitUntil(ctx.env.STORAGE.put(CACHE_KEY, JSON.stringify(versionJson), {
    // seconds
    expirationTtl: 1200,
  }));

  return response(
    versionJson,
  );

  function response(json: any) {
    return ctx.json(
      json,
      200,
      {
        [LAST_MODIFIED]: now,
        [CACHE_CONTROL]: "max-age=1200, s-maxage=1200",
      }
    );
  }
});

export default app;
