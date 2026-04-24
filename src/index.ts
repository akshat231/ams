import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { logPayload, indexNames, clientNames } from "../utils/typeDefinitions";
import { getAllClients } from "../utils/connectDB";
import { ingestElastic } from "../utils/elastic";
import { clients, indices } from "../utils/constant";
import { spinUpExpressApp } from "../utils/dashboard/dashboardRoute";

const pushMetrics = async (payload: logPayload) => {
  try {
    if (clients.elastic !== null) {
      await ingestElastic(payload, clients.elastic, indices.elasticIndex);
    }
  } catch (error) {
    throw error;
  }
};

const startTracking = async () => {
  try {
    const clientInfo = await getAllClients();
    clients.elastic = clientInfo.clientObject.elastic;
    indices.elasticIndex = clientInfo.indexObject.elasticIndex;
  } catch (error) {
    logger.error("Error occured in configuring the tracking: ", error);
  }
};

const setTracking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!clients.elastic) {
      next();
      return;
    }
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;

      const payload: logPayload = {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        responseTimeMs: duration,
        userAgent: req.headers["user-agent"],
        ip: req.ip === "::1" ? "127.0.0.1" : req.ip,
        contentLength: res.get("content-length"),
        timestamp: new Date().toISOString(),
        query: Object.keys(req.query || {}).length ? req.query : undefined,
        params: Object.keys(req.params || {}).length ? req.params : undefined,
        body: req.body && Object.keys(req.body).length ? req.body : undefined,
      };
      pushMetrics(payload).catch((err) =>
        logger.error("Failed to push metrics:", err),
      );
    });
    next();
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error("Error occured: ", error.message);
    } else {
      logger.error("error occured: ", error);
    }
    next();
  }
};

const loadDashboard = async () => {
  try {
    if (!clients.elastic) {
      logger.error("Cannot load dashboard — run startTracking() first");
      return;
    }
    await spinUpExpressApp();
  } catch (error) {
    logger.error("Error Loading Dashboard:: ", error);
    return;
  }
};
export { setTracking, startTracking, loadDashboard };
