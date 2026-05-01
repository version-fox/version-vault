import { Hono } from "hono";
import pythonRoutes from './sdks/python';
import pythonPyenvVersions from './sdks/python/pyenv';
import { errorHandler } from "@/utils/error-handler";

const repositoryUrl = "https://github.com/version-fox/version-vault";

export const ignition = () => {
  const app = new Hono<HonoEnv>();

  // Apply global error handler
  app.onError(errorHandler);

  app.get("/", (ctx) => {
    return ctx.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>version-vault</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        max-width: 760px;
        margin: 0 auto;
        padding: 48px 24px;
        line-height: 1.6;
      }
      code, input {
        font: inherit;
      }
      code {
        border-radius: 6px;
        padding: 2px 6px;
        background: color-mix(in srgb, CanvasText 10%, Canvas);
      }
      form {
        display: grid;
        gap: 12px;
        margin: 24px 0;
        padding: 20px;
        border: 1px solid color-mix(in srgb, CanvasText 20%, Canvas);
        border-radius: 12px;
      }
      label {
        display: grid;
        gap: 4px;
      }
      input, button {
        border: 1px solid color-mix(in srgb, CanvasText 25%, Canvas);
        border-radius: 8px;
        padding: 8px 10px;
      }
      button {
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>version-vault</h1>
      <p>Version metadata service for vfox SDK plugins.</p>
      <p><a href="${repositoryUrl}">View this project on GitHub</a></p>

      <h2>Endpoints</h2>
      <ul>
        <li><a href="/python/pyenv"><code>/python/pyenv</code></a> - pyenv Python versions</li>
        <li><a href="/python/uv-build"><code>/python/uv-build</code></a> - Python Build Standalone assets</li>
      </ul>

      <h2>Try uv-build filters</h2>
      <form action="/python/uv-build" method="get">
        <label>
          OS
          <input name="os" placeholder="linux, darwin, windows">
        </label>
        <label>
          Architecture
          <input name="arch" placeholder="x86_64, aarch64, armv7">
        </label>
        <label>
          libc
          <input name="libc" placeholder="gnu, musl, gnueabihf">
        </label>
        <button type="submit">Fetch versions</button>
      </form>
    </main>
  </body>
</html>`);
  });

  app.route("/pyenv-versions", pythonPyenvVersions);
  app.route("/python", pythonRoutes);

  return app;
};
