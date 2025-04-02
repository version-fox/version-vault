import { CACHE_CONTROL, LAST_MODIFIED } from "@/constants";
import { assert } from "@/utils/assert";
import { Octokit } from "@/utils/octokit";
import { Hono } from "hono";

const app = new Hono<HonoEnv>();

app.get("/", async (ctx) => {
  assert(ctx.env.GITHUB_TOKEN, "GITHUB_TOKEN is not set");
  const request = ctx.req.raw;

  const cacheUrl = new URL(request.url);
  // cache ignore query params
  cacheUrl.search = "";
  const cacheKey = new Request(cacheUrl.toString(), request);

  let skipCache = Boolean(ctx.req.query("force"));

  const cache = await caches.open("pyenv-versions");

  // Check whether the value is already available in the cache
  // if not, you will need to fetch it from origin, and store it in the cache
  const response = await cache.match(cacheKey);
  if (!skipCache && response) {
    return response;
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

  const resp = ctx.json(
    {
      updated: now,
      tagName,
      versions,
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
