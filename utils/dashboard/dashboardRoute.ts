import { readConfig } from "../fileRead";
import path from "path";
import express, { Request, Response, NextFunction } from "express";
import logger from "../logger";
import * as dashboardValidators from "./dashboardValidator";
import * as dashboardService from "./dashboardServices";

const metricsApiV1 = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const queryFilter = req.query;
  const result = await dashboardService.fetchAPIMetricsV1(queryFilter);
  return res.status(200).json(result)
};

const spinUpExpressApp = async () => {
  const directory = process.cwd();
  const data = await readConfig(directory);
  const dashboardPort = Number(data.dashboardPort);

  if (!dashboardPort || !Number.isInteger(dashboardPort) || dashboardPort < 1 || dashboardPort > 65535) {
    logger.error(`Invalid dashboardPort: "${data.dashboardPort}". Must be an integer between 1 and 65535.`);
    return;
  }

  const app = express();
  app.use(express.static(path.join(__dirname, "../../public")));
  app.get(
    "/api/v1/config",
    (req: Request, res: Response) => {
      res.json({ port: dashboardPort });
    },
  );
  app.get(
    "/",
    (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, "../../public/index.html"));
    },
  );
  app.get("/api/v1/metrics",
    dashboardValidators.dashboardValidatorV1,
    metricsApiV1,
  );
  app.listen(dashboardPort, () => {
    logger.info(`Dashboard → http://localhost:${dashboardPort}`);
  });
};

export { spinUpExpressApp };
