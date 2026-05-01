import assert from "node:assert/strict";
import test from "node:test";
import { ignition } from "../src/ignition";

test("root route renders landing page with examples and endpoint links", async () => {
  const response = await ignition().request("/");
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html/);
  assert.match(body, /https:\/\/github\.com\/version-fox\/version-vault/);
  assert.match(body, /\$ curl https:\/\/vault\.vfox\.dev\/python\/pyenv/);
  assert.match(body, /\$ curl https:\/\/vault\.vfox\.dev\/python\/uv-build/);
  assert.match(body, /https:\/\/vault\.vfox\.dev\/python\/uv-build\?os=linux&amp;arch=aarch64&amp;libc=gnu/);
  assert.match(body, /\/python\/pyenv/);
  assert.doesNotMatch(body, /<form/);
  assert.doesNotMatch(body, /<input/);
});
