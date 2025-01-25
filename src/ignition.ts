import { Hono } from "hono";
import pythonPyenvVersions from "./sdks/python/pyenv-versions";
import pythonFtpVersions from "./sdks/python/ftp-versions";

export const ignition = () => {
  const app = new Hono<HonoEnv>();

  app.route("/pyenv-versions", pythonPyenvVersions);
  app.route("/python/pyenv", pythonPyenvVersions);
  app.route("/python/ftp", pythonFtpVersions);

  return app;
};
