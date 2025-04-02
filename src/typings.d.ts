declare interface HonoEnv {
  Bindings: Bindings;
}

declare interface Variables {
}

declare interface Bindings {
  GITHUB_TOKEN: string;
  STORAGE: KVNamespace;
}
