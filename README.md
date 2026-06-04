# API Metrics System
[![npm version](https://badge.fury.io/js/api-metrics-system.svg)](https://www.npmjs.com/package/api-metrics-system)

A lightweight middleware for gathering and displaying API metrics.

## Features

- **Express Middleware**: Track request method, URL, status code, response time, user agent, IP, and more.
- **Async Batched Writes**: Buffered in-memory writes via Elasticsearch bulk API (5s interval or 100-item threshold) — no per-request latency overhead.
- **Elasticsearch Storage**: Persist metrics to Elasticsearch for querying.
- **Percentile Metrics**: p50, p95, p99 response times alongside averages per endpoint.
- **Metrics Dashboard**: Built-in Express dashboard to visualize metrics over time.
- **CLI Tool**: Quick config initialization.

## Prerequisites
- Node.js 18+
- Elasticsearch 8.x running locally or remotely

## Installation

```bash
npm install api-metrics-system
```

## Configuration

Initialize the config file in your project:

```bash
npx api-metrics-system init
```

Edit `config/ams.json`:

```json
{
  "batchSize": 100,
  "failureThreshold": 10,
  "dashboardPort": 4322,
  "elastic": {
    "enable": true,
    "node": "http://localhost:9200",
    "username": "elastic",
    "password": "elastic",
    "index": "ams"
  }
}
```

| Key | Default | Description |
|-----|---------|-------------|
| `batchSize` | `100` | Buffer size threshold before a flush is triggered |
| `failureThreshold` | `10` | Total 4xx/5xx responses that trigger an immediate flush so failures appear in Elastic right away |

## Usage

```typescript
import express from 'express';
import { setTracking, startTracking, loadDashboard } from 'api-metrics-system';

const app = express();
app.use(express.json());


// Use the middleware on routes you want to track
app.get('/api/users', setTracking, (req, res) => {
  res.json({ users: [] });
});

app.listen(3000, async() =>{
  // Initialize clients and start async metric flushing (call once at startup)
    await startTracking();

  // Optional: start the metrics dashboard
    await loadDashboard();
});
```

### Async Batched Writes

`setTracking` does **not** write to Elasticsearch on every request. Instead it collects metrics in an in-memory buffer and flushes them via the Elasticsearch bulk API:

- **Interval flush**: every 5 seconds
- **Size flush**: immediately when the buffer reaches `batchSize` (default: 100)
- **Failure flush**: when total 4xx/5xx responses reach `failureThreshold` (default: 10), the buffer flushes immediately so failures are visible without delay
- **Graceful shutdown**: on `SIGTERM`/`SIGINT` the remaining buffer is flushed before the process exits
- **Retry with backoff**: if a flush fails, the batch is retried up to 3 times with exponential backoff (2s → 4s → 8s). After 3 failures, the batch is dropped to prevent infinite retry loops

This removes Elasticsearch latency from your API responses and drastically reduces the number of HTTP calls.

## Metrics Dashboard

Access the dashboard at `http://localhost:<dashboardPort>` (default: 4322).

![AMS Dashboard](https://raw.githubusercontent.com/akshat231/ams/main/assets/ams.png)

### API Endpoint

```
GET /api/v1/metrics
```

**Query Parameters:**

| Parameter | Description |
|-----------|-------------|
| `preset` | Time range preset: `1h`, `24h`, `7d`, `30d` |
| `from` | ISO date string (requires `to`) |
| `to` | ISO date string (requires `from`) |

**Example:**
```
GET /api/v1/metrics?preset=24h
GET /api/v1/metrics?from=2024-01-01T00:00:00Z&to=2024-01-02T00:00:00Z
```

**Response:**

```json
{
  "appliedFilter": { "from": "...", "to": "..." },
  "hitsOverTime": [{ "timestamp": "...", "count": 150 }],
  "statusDistribution": [{ "status": "200", "count": 120 }],
  "slowestEndpoints": [{ "url": "/api/users", "avgResponseTimeMs": 45, "p50": 20, "p95": 180, "p99": 450 }],
  "mostHitEndpoints": [{ "url": "/api/users", "count": 200 }],
  "errorRate": 2.5
}
```

## CLI Commands

```bash
api-metrics-system init     # Initialize config/ams.json in current directory
```

## License

ISC