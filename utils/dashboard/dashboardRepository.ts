import { clients, indices } from "../constant";
import logger from "../logger";
import { MetricsQuery } from "../typeDefinitions";

const resolveTimeRange = (
  filter: MetricsQuery,
): { from: string; to: string } => {
  const to = new Date().toISOString();

  if (filter.preset) {
    const presetMap: Record<"1h" | "24h" | "7d" | "30d", number> = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const from = new Date(Date.now() - presetMap[filter.preset]).toISOString();
    return { from, to };
  }

  return {
    from:
      filter.from ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    to: filter.to ?? to,
  };
};

const getMetricsV1 = async (filter: MetricsQuery) => {
  try {
    if (!clients.elastic) {
      throw new Error("elastic client not initialized");
    }
    const { from, to } = resolveTimeRange(filter);
    const client = clients.elastic;
    const index = indices.elasticIndex;

    const timeFilter = {
      range: {
        timestamp: { gte: from, lte: to },
      },
    };

    // 1. hits over time
    const hitsOverTime = await client.search({
      index,
      body: {
        query: { bool: { filter: [timeFilter] } },
        aggs: {
          hits_over_time: {
            date_histogram: {
              field: "timestamp",
              calendar_interval: "1h",
            },
          },
        },
        size: 0,
      },
    });

    // 2. status distribution
    const statusDist = await client.search({
      index,
      body: {
        query: { bool: { filter: [timeFilter] } },
        aggs: {
          status_distribution: {
            terms: { field: "status", size: 20 },
          },
        },
        size: 0,
      },
    });

    // 3. slowest endpoints
    const slowestEndpoints = await client.search({
      index,
      body: {
        query: { bool: { filter: [timeFilter] } },
        aggs: {
          by_url: {
            terms: { field: "url.keyword", size: 10 },
            aggs: {
              avg_response_time: {
                avg: { field: "responseTimeMs" },
              },
            },
          },
        },
        size: 0,
      },
    });

    // 4. most hit endpoints
    const mostHit = await client.search({
      index,
      body: {
        query: { bool: { filter: [timeFilter] } },
        aggs: {
          most_hit: {
            terms: {
              field: "url.keyword",
              size: 10,
              order: { _count: "desc" },
            },
          },
        },
        size: 0,
      },
    });

    // 5. error rate
    const errorRate = await client.search({
      index,
      body: {
        query: { bool: { filter: [timeFilter] } },
        aggs: {
          total: { value_count: { field: "status" } },
          errors: {
            filter: {
              range: { status: { gte: 400 } },
            },
          },
        },
        size: 0,
      },
    });

    // parse responses
    const hitsOverTimeBuckets =
      (hitsOverTime.aggregations?.hits_over_time as any)?.buckets ?? [];
    const statusBuckets =
      (statusDist.aggregations?.status_distribution as any)?.buckets ?? [];
    const slowestBuckets =
      (slowestEndpoints.aggregations?.by_url as any)?.buckets ?? [];
    const mostHitBuckets =
      (mostHit.aggregations?.most_hit as any)?.buckets ?? [];
    const total = (errorRate.aggregations?.total as any)?.value ?? 0;
    const errors = (errorRate.aggregations?.errors as any)?.doc_count ?? 0;

    return {
      appliedFilter: { from, to },
      hitsOverTime: hitsOverTimeBuckets.map((b: any) => ({
        timestamp: b.key_as_string,
        count: b.doc_count,
      })),
      statusDistribution: statusBuckets.map((b: any) => ({
        status: String(b.key),
        count: b.doc_count,
      })),
      slowestEndpoints: slowestBuckets
        .map((b: any) => ({
          url: b.key,
          avgResponseTimeMs: Math.round(b.avg_response_time.value ?? 0),
        }))
        .sort((a: any, b: any) => b.avgResponseTimeMs - a.avgResponseTimeMs),
      mostHitEndpoints: mostHitBuckets.map((b: any) => ({
        url: b.key,
        count: b.doc_count,
      })),
      errorRate:
        total > 0 ? parseFloat(((errors / total) * 100).toFixed(2)) : 0,
    };
  } catch (error) {
    logger.error("[apivault] Error fetching metrics:", error);
    throw error;
  }
};

export { getMetricsV1 };
