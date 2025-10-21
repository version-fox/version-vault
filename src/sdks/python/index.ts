import { Hono } from "hono";
import pythonPyenvVersions from "./pyenv-versions";
import pythonFtpVersions from "./ftp-versions";
import uvBuildVersions from "./uv-build-versions";

const app = new Hono<HonoEnv>();

app.route("/pyenv", pythonPyenvVersions);
app.route("/ftp", pythonFtpVersions);
app.route("/uv-build", uvBuildVersions);

export default app;