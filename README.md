# version-vault

## Usage
Get sdk versions

### pyenv versions

```sh
curl https://version-vault.cdn.dog/python/pyenv
```

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