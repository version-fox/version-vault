import { Hono } from "hono";
import pyenvVersions from "./pyenv";
import uvBuildVersions from "./uv-build";

const app = new Hono<HonoEnv>();

app.route("/pyenv", pyenvVersions);
app.route("/uv-build", uvBuildVersions);

export default app;