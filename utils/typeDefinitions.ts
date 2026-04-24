import { ParsedQs } from "qs";
import { ParamsDictionary } from "express-serve-static-core";
import { Client } from "@elastic/elasticsearch";


type elasticConfig = {
  node: string;
  username: string;
  password: string;
  index: string;
};


type logPayload = {
  method: string;
  url: string;
  status: number;
  responseTimeMs: number;
  userAgent?: string | undefined;
  ip?: string | undefined;
  contentLength?: string | undefined;
  timestamp: string;
  query?: ParsedQs | undefined;
  params?: ParamsDictionary | undefined;
  body?: unknown;
};

type indexNames = {
  elasticIndex: string
}

type clientNames = {
  elastic: Client | null
}

type MetricsQuery = {
  preset?: "1h" | "24h" | "7d" | "30d"
  from?: string
  to?: string
}

export type { logPayload, elasticConfig, indexNames, clientNames, MetricsQuery };
