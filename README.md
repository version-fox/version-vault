# version-vault

## Usage
Get sdk versions

### pyenv versions

```sh
curl https://vault.vfox.dev/python/pyenv
```

### uv-build versions

Fetch Python Build Standalone release assets from [`astral-sh/python-build-standalone`](https://github.com/astral-sh/python-build-standalone/releases).

```sh
curl https://vault.vfox.dev/python/uv-build
```

The response contains an `items` array. Each item includes parsed build fields, the release tag, filename, download URL, platform details, and GitHub release asset metadata such as `sha256` when GitHub provides an asset digest.

You can narrow down the result by passing query parameters. Filtering happens server-side, so the response is smaller and faster to consume.

| Query | Description | Example values |
| ----- | ----------- | -------------- |
| `os`   | Operating system / platform | `darwin`, `linux`, `windows` |
| `arch` | CPU architecture family     | `x86_64`, `aarch64`, `armv7` |
| `libc` | C library type              | `none`, `gnu`, `musl` |

Examples:

```sh
# Linux + aarch64 + glibc builds only
curl "https://vault.vfox.dev/python/uv-build?os=linux&arch=aarch64&libc=gnu"

# All macOS builds
curl "https://vault.vfox.dev/python/uv-build?os=darwin"
```

Pass `force=1` to bypass the cache for this endpoint.

## Development

Install dependencies:

```sh
pnpm install
```

### Node.js

Simply run:
```sh
pnpm run dev
```

### Workers

Login to CloudFlare:

```sh
pnpx wrangler login
```

Create .env:
```
echo "GITHUB_TOKEN=$GITHUB_TOKEN" >> .env
```

Run dev:

```sh
pnpm run workers:dev
```
