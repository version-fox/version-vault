import assert from "node:assert/strict";
import test from "node:test";
import { uvBuildTestHelpers } from "../src/sdks/python/uv-build";

const release = "20260501";

function asset(name: string) {
  return {
    name,
    browser_download_url: `https://example.com/${name}`,
    size: 123,
    content_type: "application/gzip",
    digest: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  };
}

test("parses uv-build Linux, macOS, and Windows assets", () => {
  const linux = uvBuildTestHelpers.parseAsset(
    release,
    asset("cpython-3.13.3+20260501-x86_64-unknown-linux-gnu-install_only_stripped.tar.gz")
  );
  const macos = uvBuildTestHelpers.parseAsset(
    release,
    asset("cpython-3.13.3+20260501-aarch64-apple-darwin-install_only.tar.zst")
  );
  const windows = uvBuildTestHelpers.parseAsset(
    release,
    asset("cpython-3.13.3+20260501-x86_64-pc-windows-msvc-shared-install_only.tar.gz")
  );

  assert.equal(linux?.platform.os, "linux");
  assert.equal(linux?.platform.arch, "x86_64");
  assert.equal(linux?.platform.libc, "gnu");
  assert.equal(linux?.asset?.sha256, "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");

  assert.equal(macos?.platform.os, "darwin");
  assert.equal(macos?.platform.arch, "aarch64");
  assert.equal(macos?.platform.libc, null);

  assert.equal(windows?.platform.os, "windows");
  assert.equal(windows?.platform.arch, "x86_64");
  assert.equal(windows?.platform.libc, null);
});

test("parses freethreaded uv-build assets", () => {
  const item = uvBuildTestHelpers.parseAsset(
    release,
    asset("cpython-3.13.3+20260501-aarch64-unknown-linux-musl-freethreaded+pgo-full.tar.gz")
  );

  assert.equal(item?.variant, "freethreaded");
  assert.equal(item?.display_version, "3.13.3t");
  assert.equal(item?.platform.os, "linux");
  assert.equal(item?.platform.arch, "aarch64");
  assert.equal(item?.platform.libc, "musl");
});

test("ignores assets that do not match uv-build naming rules", () => {
  assert.equal(
    uvBuildTestHelpers.parseAsset(
      release,
      asset("cpython-3.13.3+20260501-x86_64-unknown-linux-gnu.tar.gz")
    ),
    null
  );
  assert.equal(
    uvBuildTestHelpers.parseAsset(
      release,
      asset("cpython-3.13.3+20260501-x86_64-unknown-linux-install_only.tar.gz")
    ),
    null
  );
});

test("filters uv-build items by os, arch, and libc", () => {
  const items = [
    "cpython-3.13.3+20260501-x86_64-unknown-linux-gnu-install_only_stripped.tar.gz",
    "cpython-3.13.3+20260501-aarch64-unknown-linux-musl-install_only_stripped.tar.gz",
    "cpython-3.13.3+20260501-aarch64-apple-darwin-install_only.tar.zst",
    "cpython-3.13.3+20260501-x86_64-pc-windows-msvc-shared-install_only.tar.gz",
  ].map((name) => uvBuildTestHelpers.parseAsset(release, asset(name))).filter((item) => item !== null);

  assert.deepEqual(
    uvBuildTestHelpers.filterItems(items, { os: "linux", arch: "aarch64", libc: "musl" }).map((item) => item.filename),
    ["cpython-3.13.3+20260501-aarch64-unknown-linux-musl-install_only_stripped.tar.gz"]
  );
  assert.deepEqual(
    uvBuildTestHelpers.filterItems(items, { os: "darwin" }).map((item) => item.platform.os),
    ["darwin"]
  );
  assert.deepEqual(
    uvBuildTestHelpers.filterItems(items, { os: "windows", arch: "x86_64" }).map((item) => item.platform.os),
    ["windows"]
  );
});
