# API Metrics System

A lightweight middleware for gathering and displaying API metrics.

## Features

- **Express Middleware**: Track request method, URL, status code, response time, user agent, IP, and more.
- **Elasticsearch Storage**: Persist metrics to Elasticsearch for querying.
- **Metrics Dashboard**: Built-in Express dashboard to visualize metrics over time.
- **CLI Tool**: Quick config initialization.

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

## Usage

```typescript
import express from 'express';
import { setTracking, startTracking, loadDashboard } from 'api-metrics-system';

const app = express();
app.use(express.json());

// Initialize clients (call once at startup)
await startTracking();

// Optional: start the metrics dashboard
await loadDashboard();

// Use the middleware on routes you want to track
app.get('/api/users', setTracking, (req, res) => {
  res.json({ users: [] });
});

app.listen(3000);
```

## Metrics Dashboard

Access the dashboard at `http://localhost:<dashboardPort>` (default: 4322).

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
  "slowestEndpoints": [{ "url": "/api/users", "avgResponseTimeMs": 45 }],
  "mostHitEndpoints": [{ "url": "/api/users", "count": 200 }],
  "errorRate": 2.5
}
```

## CLI Commands

```bash
ams-cli init     # Initialize config/ams.json in current directory
```

## License

ISC