import logger from "../logger";
import { MetricsQuery } from "../typeDefinitions";
import * as dashboardRepository from './dashboardRepository'

const fetchAPIMetricsV1 = async (queryFilter: MetricsQuery) => {
  try {
    const { preset, from, to } = queryFilter;

    if (!preset && (!from || !to)) {
      return { error: "Provide either preset or both from and to" }
    }

    const data = await dashboardRepository.getMetricsV1(queryFilter)
    return data
  } catch (error) {
    logger.error("[ams] Failed to fetch metrics:", error)
    return { error: "Failed to fetch metrics" }
  }
};

export { fetchAPIMetricsV1 }