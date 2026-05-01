import assert from "node:assert/strict";
import test from "node:test";
import { ignition } from "../src/ignition";

test("root route renders landing page with project and demo links", async () => {
  const response = await ignition().request("/");
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html/);
  assert.match(body, /https:\/\/github\.com\/version-fox\/version-vault/);
  assert.match(body, /action="\/python\/uv-build"/);
  assert.match(body, /\/python\/pyenv/);
});
