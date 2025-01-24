import { Hono } from "hono";
import { Variables } from "./types";

export const ignition = () => {
  const app = new Hono<{ Bindings: Variables }>();

  app.get("/pyenv-versions", async (ctx) => {
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
      return ctx.json({
        error: "Failed to fetch latest release",
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
      return ctx.json({
        error: "Failed to fetch files",
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

    const response = {
      tagName,
      versions,
      //   _versions,
    };

    return ctx.json(response);
  });

  return app;
};
