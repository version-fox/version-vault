import { Hono } from "hono";
import pythonRoutes from './sdks/python';
import pythonPyenvVersions from './sdks/python/pyenv';
import { errorHandler } from "@/utils/error-handler";

export const ignition = () => {
  const app = new Hono<HonoEnv>();

  // Apply global error handler
  app.onError(errorHandler);

  app.route("/pyenv-versions", pythonPyenvVersions);
  app.route("/python", pythonRoutes);

  return app;
};
