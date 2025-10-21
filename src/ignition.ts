import { Hono } from "hono";
import pythonRoutes from './sdks/python';
import pythonPyenvVersions from './sdks/python/pyenv';

export const ignition = () => {
  const app = new Hono<HonoEnv>();

  app.route("/pyenv-versions", pythonPyenvVersions);
  app.route("/python", pythonRoutes);

  return app;
};
