# version-vault

## Usage
Get sdk versions

### pyenv versions

```sh
curl https://version-vault.cdn.dog/python/pyenv
```

### uv-build versions

Fetch the Python builds list provided by [`astral-sh/uv`](https://github.com/astral-sh/uv) (sourced from `crates/uv-python/download-metadata.json` of the latest release).

```sh
curl https://version-vault.cdn.dog/python/uv-build
```

You can narrow down the result by passing query parameters. Filtering happens server-side, so the response is smaller and faster to consume.

| Query | Description | Example values |
| ----- | ----------- | -------------- |
| `os`   | Operating system / platform | `darwin`, `linux`, `windows` |
| `arch` | CPU architecture family     | `x86_64`, `aarch64`, `armv7` |
| `libc` | C library type              | `none`, `gnu`, `musl` |

Examples:

```sh
# Linux + aarch64 + glibc builds only
curl "https://version-vault.cdn.dog/python/uv-build?os=linux&arch=aarch64&libc=gnu"

# All macOS builds
curl "https://version-vault.cdn.dog/python/uv-build?os=darwin"
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