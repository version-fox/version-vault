export interface ArchInfo {
  /**
   * CPU architecture family
   * @example "aarch64"
   * @example "x86_64"
   */
  family: string;
  /**
   * Architecture variant
   * @example null
   * @example "v7"
   */
  variant: string | null;
}

export interface PythonBuildInfo {
  /**
   * Python implementation name
   * @example "cpython"
   */
  name: string;
  /**
   * Architecture information
   * @example { family: "aarch64", variant: null }
   */
  arch: ArchInfo;
  /**
   * Operating system
   * @example "darwin"
   * @example "linux"
   */
  os: string;
  /**
   * C library type
   * @example "none"
   * @example "gnu"
   * @example "musl"
   */
  libc: string;
  /**
   * Python major version
   * @example 3
   */
  major: number;
  /**
   * Python minor version
   * @example 15
   */
  minor: number;
  /**
   * Python patch version
   * @example 0
   */
  patch: number;
  /**
   * Python prerelease identifier
   * @example "a1"
   * @example null
   */
  prerelease: string | null;
  /**
   * Download URL for the build
   * @example "https://github.com/astral-sh/python-build-standalone/releases/download/20251014/cpython-3.15.0a1%2B20251014-aarch64-apple-darwin-install_only_stripped.tar.gz"
   */
  url: string;
  /**
   * SHA256 checksum of the build
   * @example "f18b48b759bdb5e4563b0f158641711081977cf1d328795c0ad85478c97624d5"
   */
  sha256: string;
  /**
   * Build variant
   * @example null
   * @example "debug"
   */
  variant: string | null;
  /**
   * Build date identifier
   * @example "20251014"
   */
  build: string;
}

/**
 * Collection of Python builds indexed by their identifier
 * @example { "cpython-3.15.0a1-darwin-aarch64-none": { name: "cpython", ... } }
 */
export type PythonBuilds = Record<string, PythonBuildInfo>;

export type PythonBuildStandaloneVariant = "default" | "freethreaded";

export interface PythonBuildStandalonePlatform {
  os: string;
  arch: string;
  libc?: string | null;
}

export interface PythonBuildStandaloneAsset {
  size?: number;
  content_type?: string;
  created_at?: string;
  updated_at?: string;
  sha256?: string;
}

export interface PythonBuildStandaloneItem {
  implementation: string;
  version: string;
  display_version: string;
  variant: PythonBuildStandaloneVariant;
  release: string;
  filename: string;
  url: string;
  platform: PythonBuildStandalonePlatform;
  asset?: PythonBuildStandaloneAsset;
}
