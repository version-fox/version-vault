import { Hono } from "hono";
import pythonPyenvVersions from "./pyenv";
import pythonFtpVersions from "./ftp";
import uvBuildVersions from "./uv-build";

const app = new Hono<HonoEnv>();

app.route("/pyenv", pythonPyenvVersions);
app.route("/ftp", pythonFtpVersions);
app.route("/uv-build", uvBuildVersions);

export default app;