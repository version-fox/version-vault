import "dotenv/config";

import { serve } from "@hono/node-server";
import { ignition } from "..";
import { Variables } from "@/types";
const app = ignition();

const port = process.env.PORT || 8787;

serve({
  fetch: (request) => {
    const env = {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    } as Variables;
    return app.fetch(request, env);
  },
  port,
});

console.log(`Server started in http://localhost:${port}`);
