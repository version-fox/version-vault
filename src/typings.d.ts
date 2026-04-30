declare interface HonoEnv {
  Bindings: Variables;
}

declare interface Variables {
  GITHUB_TOKEN: string;
  PYTHON_USE_UV_BUILD?: string;
}
