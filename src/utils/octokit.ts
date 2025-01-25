export class Octokit {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  protected fetch(url: string, options?: RequestInit) {
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "User-Agent": "Octokit",
        ...options?.headers,
      },
    });
  }

  async getLatestRelease(repo: string): Promise<any> {
    const url = `https://api.github.com/repos/${repo}/releases/latest`;
    const response = await this.fetch(url);
    return response;
  }

  async getContents(repo: string, path: string, ref: string): Promise<any> {
    const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${ref}`;
    const response = await this.fetch(url, {
      headers: {
        "X-GitHub-Api-Version": " 2022-11-28",
        Accept: "application/vnd.github+json",
      },
    });

    return response;
  }
}
