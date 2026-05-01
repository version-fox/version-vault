export class Octokit {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  fetch(url: string, options?: RequestInit) {
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "User-Agent": "version-fox/version-vault Octokit",
        ...options?.headers,
      },
    });
  }

  async getLatestRelease(repo: string): Promise<any> {
    const url = `https://api.github.com/repos/${repo}/releases/latest`;
    const response = await this.fetch(url);
    return response;
  }

  async listPath(repo: string, path: string, ref: string): Promise<any> {
    const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`;
    const response = await this.fetch(url, {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
        Accept: "application/vnd.github+json",
      },
    });

    return response;
  }

  async downloadFile(repo: string, path: string, ref: string): Promise<Response> {
    // https://raw.githubusercontent.com/astral-sh/uv/0.9.4/crates/uv-python/download-metadata.json
    const url = `https://raw.githubusercontent.com/${repo}/${ref}/${path}`;
    const response = await this.fetch(url, {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
        Accept: "application/vnd.github.raw",
      },
    });
    return response;
  }
}
