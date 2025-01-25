import { Hono } from "hono";
import { Variables } from "./types";
import { assert } from "./utils/assert";
import { Octokit } from "./utils/octokit";
import { LAST_MODIFIED } from "./constants";

export const ignition = () => {
  const app = new Hono<{ Bindings: Variables }>();

  app.get("/pyenv-versions", async (ctx) => {
    assert(ctx.env.GITHUB_TOKEN, "GITHUB_TOKEN is not set");
    const request = ctx.req.raw;

    const useCache =
      request.headers.get("Cache-Control") === "no-cache" ||
      !Boolean(ctx.req.query("force"));

    console.log("🚀 ~ app.get ~ useCache:", useCache);

    const cacheUrl = new URL(request.url);
    cacheUrl.search = "";

    console.log("🚀 ~ app.get ~ cacheUrl:", cacheUrl, cacheUrl.toString());

    // Construct the cache key from the cache URL
    const cacheKey = new Request(cacheUrl.toString());
    const cache = await caches.open("pyenv-versions");

    if (useCache) {
      // Check whether the value is already available in the cache
      // if not, you will need to fetch it from origin, and store it in the cache
      const response = await cache.match(cacheKey);
      console.log("🚀 ~ app.get ~ response:", response);

      if (response) {
        console.log("Cache hit");
        // check last-modified header is not older than 25 minutes
        const lastModified = response.headers.get(LAST_MODIFIED);

        if (lastModified) {
          const lastModifiedDate = new Date(lastModified);
          const now = new Date();
          const diff = now.getTime() - lastModifiedDate.getTime();
          const diffMinutes = Math.round(diff / 60000);

          if (diffMinutes < 25) {
            console.log("Cache hit in 25 minutes");
            return response;
          }
        }

        // delete the cache
        console.log("Cache hit but older than 25 minutes");
        cache.delete(cacheKey);
      }
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
      }
    );

    ctx.executionCtx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  });

  return app;
};
