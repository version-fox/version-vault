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
        color-scheme: light;
        font-family: "Courier New", Courier, monospace;
      }
      body {
        max-width: 920px;
        margin: 0 auto;
        padding: 40px 24px 72px;
        color: #222;
        background: #fff;
        line-height: 1.5;
      }
      h1 {
        margin: 0 0 8px;
        font-size: clamp(28px, 5vw, 44px);
        line-height: 1;
        letter-spacing: -0.08em;
      }
      h1 span {
        letter-spacing: 0;
      }
      .tagline {
        margin: 0 0 44px;
        font-size: 14px;
        text-align: center;
      }
      h2 {
        margin: 36px 0 10px;
        font-size: 16px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        text-transform: uppercase;
      }
      a {
        color: inherit;
      }
      .endpoint {
        margin: 0 0 34px 64px;
      }
      .endpoint-list {
        margin: 0 0 28px;
        padding: 0;
        list-style: none;
        font-size: 14px;
      }
      .endpoint-list li {
        margin: 0 0 6px;
      }
      .endpoint-list a {
        font-weight: 700;
      }
      .curl {
        margin: 0 0 12px;
        color: #000;
        font-size: clamp(14px, 1.8vw, 16px);
        font-weight: 700;
        white-space: pre-wrap;
        word-break: break-word;
      }
      pre {
        margin: 0 0 26px 88px;
        color: #444;
        font-size: clamp(12px, 1.5vw, 14px);
        line-height: 1.45;
        white-space: pre-wrap;
      }
      .links {
        margin-top: 44px;
        font-size: 14px;
      }
      @media (max-width: 640px) {
        body {
          padding: 32px 18px 56px;
        }
        .tagline {
          text-align: left;
        }
        .endpoint {
          margin-left: 0;
        }
        pre {
          margin-left: 24px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>version<span>-</span>vault</h1>
      <p class="tagline">Version metadata responses are JSON-encoded.</p>

      <h2>ENDPOINTS</h2>
      <ul class="endpoint-list">
        <li><a href="/">/</a> This page.</li>
        <li><a href="/python/pyenv">/python/pyenv</a> Pyenv Python versions.</li>
        <li><a href="/python/uv-build">/python/uv-build</a> Python Build Standalone assets.</li>
        <li><a href="/pyenv-versions">/pyenv-versions</a> Legacy pyenv Python versions.</li>
      </ul>

      <h2>Examples</h2>
      <section class="endpoint" aria-label="pyenv Python versions">
        <p class="curl">$ curl https://vault.vfox.dev/python/pyenv</p>
        <pre>{
  "items": [
    {
      "version": "3.13.3",
      "url": "https://www.python.org/ftp/python/3.13.3/Python-3.13.3.tar.xz"
    }
  ]
}</pre>
      </section>

      <section class="endpoint" aria-label="Python Build Standalone assets">
        <p class="curl">$ curl https://vault.vfox.dev/python/uv-build</p>
        <pre>{
  "items": [
    {
      "display_version": "3.13.3",
      "platform": {
        "os": "linux",
        "arch": "x86_64",
        "libc": "gnu"
      }
    }
  ]
}</pre>
      </section>

      <section class="endpoint" aria-label="Filtered Python Build Standalone assets">
        <p class="curl">$ curl "https://vault.vfox.dev/python/uv-build?os=linux&amp;arch=aarch64&amp;libc=gnu"</p>
        <pre>{
  "items": [
    {
      "display_version": "3.13.3",
      "filename": "cpython-3.13.3+20260501-aarch64-unknown-linux-gnu-install_only_stripped.tar.gz"
    }
  ]
}</pre>
      </section>

      <p class="links"><a href="/python/pyenv">/python/pyenv</a> · <a href="/python/uv-build">/python/uv-build</a> · <a href="${repositoryUrl}">GitHub</a></p>
    </main>
  </body>
</html>`);
  });

  app.route("/pyenv-versions", pythonPyenvVersions);
  app.route("/python", pythonRoutes);

  return app;
};
