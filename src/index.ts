import { ignition } from "./ignition";

const app = ignition();

export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
} as ExportedHandler<Variables>;
