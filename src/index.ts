import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { logPayload } from "../utils/typeDefinitions";
import { getAllClients } from "../utils/connectDB";
import { clients, indices, trackingSettings } from "../utils/constant";
import { spinUpExpressApp } from "../utils/dashboard/dashboardRoute";

const MAX_RETRIES = 3;
const BACKOFF_MS = 2000;

interface RetryableBatch {
  docs: logPayload[];
  attempts: number;
}

const metricsBuffer: RetryableBatch[] = [];
let isFlushing = false;
let flushInterval: NodeJS.Timeout | null = null;
let totalFailures = 0;

const flushMetrics = async () => {
  if (isFlushing || metricsBuffer.length === 0 || !clients.elastic) return;
  isFlushing = true;

  const batch = metricsBuffer.shift() as RetryableBatch;

  try {
    const body: any[] = [];
    for (const doc of batch.docs) {
      body.push({ index: { _index: indices.elasticIndex } });
      body.push(doc);
    }
    const resp = await clients.elastic.bulk({ body });
    if (resp.errors) {
      const errored = resp.items.filter((i: any) => i.index?.error);
      logger.error(`Bulk flush: ${errored.length}/${batch.docs.length} failed`);
    } else {
      totalFailures = 0;
      logger.debug(`Flushed ${batch.docs.length} metrics to Elasticsearch`);
    }
  } catch (error) {
    if (batch.attempts < MAX_RETRIES) {
      batch.attempts++;
      const delay = BACKOFF_MS * Math.pow(2, batch.attempts - 1);
      logger.warn(`Flush failed (attempt ${batch.attempts}/${MAX_RETRIES}), retrying in ${delay}ms`);
      setTimeout(() => metricsBuffer.push(batch), delay);
    } else {
      logger.error(`Dropping ${batch.docs.length} metrics after ${MAX_RETRIES} failed attempts`);
    }
    logger.error("Failed to flush metrics buffer:", error);
  } finally {
    isFlushing = false;
  }
};

const startTracking = async () => {
  try {
    const clientInfo = await getAllClients();
    clients.elastic = clientInfo.clientObject.elastic;
    indices.elasticIndex = clientInfo.indexObject.elasticIndex;
    if (flushInterval) clearInterval(flushInterval);
    flushInterval = setInterval(flushMetrics, 5000);

    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received — flushing remaining metrics");
      await flushMetrics();
      if (flushInterval) clearInterval(flushInterval);
      process.exit(0);
    });
    process.on("SIGINT", async () => {
      logger.info("SIGINT received — flushing remaining metrics");
      await flushMetrics();
      if (flushInterval) clearInterval(flushInterval);
      process.exit(0);
    });
  } catch (error) {
    logger.error(`Error occurred in configuring the tracking: ${error}`);
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
      metricsBuffer.push({ docs: [payload], attempts: 0 });

      if (res.statusCode >= 400) {
        totalFailures++;
        if (totalFailures >= trackingSettings.failureThreshold) {
          logger.warn(`${totalFailures} total failures — flushing buffer immediately`);
          totalFailures = 0;
          flushMetrics().catch((err) =>
            logger.error("Failed to flush metrics:", err),
          );
        }
      }

      if (metricsBuffer.length >= trackingSettings.batchSize) {
        flushMetrics().catch((err) =>
          logger.error("Failed to flush metrics:", err),
        );
      }
    });
    next();
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error("Error occurred: ", error.message);
    } else {
      logger.error("error occurred: ", error);
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
