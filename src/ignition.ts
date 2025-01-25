import { Hono } from "hono";
import { Variables } from "./types";
import { assert } from "./utils/assert";

export const ignition = () => {
  const app = new Hono<{ Bindings: Variables }>();

  app.get("/pyenv-versions", async (ctx) => {
    assert(ctx.env.GITHUB_TOKEN, "GITHUB_TOKEN is not set");
    const request = ctx.req.raw;
    const cacheUrl = new URL(request.url);

    // Construct the cache key from the cache URL
    const cacheKey = new Request(cacheUrl.toString(), request);

    const cache = await caches.open("pyenv-versions");

    // Check whether the value is already available in the cache
    // if not, you will need to fetch it from origin, and store it in the cache
    const response = await cache.match(cacheKey);

    if (response) {
      // check last-modified header is not older than 25 minutes
      const lastModified = response.headers.get("Last-Modified");

      if (lastModified) {
        const lastModifiedDate = new Date(lastModified);
        const now = new Date();
        const diff = now.getTime() - lastModifiedDate.getTime();
        const diffMinutes = Math.round(diff / 60000);

        if (diffMinutes < 25) {
          return response;
        }
      }

      cache.delete(cacheKey);
    }

    const repo = "pyenv/pyenv";
    const result = await fetch(
      `https://api.github.com/repos/${repo}/releases/latest`,
      {
        headers: {
          authorization: `Bearer ${ctx.env.GITHUB_TOKEN}`,
        },
      }
    );

    if (!result.ok) {
      console.log(await result.json());
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

    const files = await fetch(
      `https://api.github.com/repos/${repo}/contents/${path}`,
      {
        headers: {
          authorization: `Bearer ${ctx.env.GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": " 2022-11-28",
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!files.ok) {
      console.log(await files.json());
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

    const resp = ctx.json(
      {
        tagName,
        versions,
      },
      200,
      {
        // Set cache control headers to cache on browser for 25 minutes
        "Cache-Control": "max-age=1500",
        "Last-Modified": new Date().toUTCString(),
      }
    );

    ctx.executionCtx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  });

  return app;
};
