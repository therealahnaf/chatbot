# Monitoring and Observability Guide

## Overview

The AI Agent Platform includes comprehensive monitoring and observability through Prometheus and
Grafana, providing real-time insights into system health, performance, and usage patterns.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Application                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Prometheus Instrumentator                         │    │
│  │  - Auto-instruments HTTP requests                  │    │
│  │  - Tracks request/response metrics                 │    │
│  │  - Exposes /metrics endpoint                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Custom Metrics (app/core/metrics.py)              │    │
│  │  - Agent queries                                   │    │
│  │  - Token usage                                     │    │
│  │  - Tool calls                                      │    │
│  │  - Business metrics                                │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTP GET /metrics
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Prometheus                              │
│  - Scrapes /metrics every 15s                               │
│  - Stores time-series data                                  │
│  - Evaluates alert rules                                    │
│  - Retains data for 30 days                                 │
└──────────────────────┬───────────────────────────────────────┘
                       │ PromQL Queries
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                       Grafana                                │
│  - Visualizes metrics in dashboards                         │
│  - Provides alerting UI                                     │
│  - Supports custom queries                                  │
│  - Enables data exploration                                 │
└─────────────────────────────────────────────────────────────┘
```

## Metrics Categories

### 1. HTTP Metrics (Auto-instrumented)

These metrics are automatically collected by `prometheus-fastapi-instrumentator`:

| Metric                          | Type      | Description                                     |
| ------------------------------- | --------- | ----------------------------------------------- |
| `http_requests_total`           | Counter   | Total HTTP requests by method, endpoint, status |
| `http_request_duration_seconds` | Histogram | Request duration in seconds                     |
| `http_request_size_bytes`       | Histogram | Request body size                               |
| `http_response_size_bytes`      | Histogram | Response body size                              |
| `http_requests_in_progress`     | Gauge     | Currently processing requests                   |

**Labels**: `method`, `endpoint`, `status`

### 2. Agent Metrics (Custom)

Business metrics specific to the AI agent:

| Metric                            | Type      | Description                 |
| --------------------------------- | --------- | --------------------------- |
| `agent_queries_total`             | Counter   | Total agent queries         |
| `agent_response_duration_seconds` | Histogram | Agent response time         |
| `agent_tokens_used_total`         | Counter   | Total tokens consumed       |
| `agent_tool_calls_total`          | Counter   | Tool invocations            |
| `agent_conversations_total`       | Counter   | Total conversations created |
| `agent_messages_total`            | Counter   | Total messages sent         |

**Labels**: `user_role`, `intent`, `status`, `model`, `tool_name`

### 3. Knowledge Base Metrics

| Metric                        | Type      | Description            |
| ----------------------------- | --------- | ---------------------- |
| `kb_documents_uploaded_total` | Counter   | Documents uploaded     |
| `kb_documents_total`          | Gauge     | Current document count |
| `kb_chunks_total`             | Gauge     | Total chunks indexed   |
| `kb_searches_total`           | Counter   | Search operations      |
| `kb_search_duration_seconds`  | Histogram | Search latency         |

**Labels**: `file_type`, `status`

### 4. Infrastructure Metrics

| Metric                      | Type      | Description                 |
| --------------------------- | --------- | --------------------------- |
| `db_connections_active`     | Gauge     | Active database connections |
| `db_connections_idle`       | Gauge     | Idle database connections   |
| `db_query_duration_seconds` | Histogram | Database query time         |
| `cache_hits_total`          | Counter   | Cache hits                  |
| `cache_misses_total`        | Counter   | Cache misses                |
| `cache_hit_rate`            | Gauge     | Cache hit rate (calculated) |

**Labels**: `operation`, `status`

## Grafana Dashboards

### 1. System Overview Dashboard

**Purpose**: High-level system health and performance

**Key Panels**:

- **Request Rate**: Requests per second across all endpoints
- **Error Rate**: Percentage of 5xx errors
- **Response Time**: p50, p95, p99 latencies
- **Active Users**: Currently authenticated users
- **Service Health**: Up/down status of all services

**Use Cases**:

- Quick health check
- Identify system-wide issues
- Monitor overall performance trends

### 2. API Performance Dashboard

**Purpose**: Detailed API endpoint analysis

**Key Panels**:

- **Requests by Endpoint**: Traffic distribution
- **Response Time by Endpoint**: Identify slow endpoints
- **Error Rate by Endpoint**: Problematic endpoints
- **Request/Response Size**: Data transfer patterns
- **Slow Queries**: Requests taking >2 seconds

**Use Cases**:

- Optimize slow endpoints
- Identify traffic patterns
- Debug performance issues

### 3. Agent Analytics Dashboard

**Purpose**: AI agent usage and performance

**Key Panels**:

- **Queries per Minute**: Agent usage rate
- **Token Usage by Model**: Cost tracking
- **Tool Usage Distribution**: Which tools are used most
- **Intent Classification**: Query type breakdown
- **Success Rate**: Percentage of successful queries
- **Average Response Time**: Agent performance
- **Conversations & Messages**: User engagement

**Use Cases**:

- Monitor AI costs (token usage)
- Understand user behavior
- Optimize tool selection
- Track agent performance

### 4. Infrastructure Monitoring Dashboard

**Purpose**: System resource utilization

**Key Panels**:

- **CPU Usage**: Processor utilization
- **Memory Usage**: RAM consumption
- **Database Connections**: Connection pool status
- **Cache Hit Rate**: Redis performance
- **Vector Store Operations**: Qdrant performance
- **Disk I/O**: Storage performance

**Use Cases**:

- Capacity planning
- Resource optimization
- Identify bottlenecks

## Alert Rules

### Critical Alerts

#### High Error Rate

```yaml
alert: HighErrorRate
expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
for: 5m
severity: critical
```

**Trigger**: Error rate > 5% for 5 minutes  
**Action**: Immediate investigation required

#### Service Down

```yaml
alert: ServiceDown
expr: up{job="ai-agent-api"} == 0
for: 1m
severity: critical
```

**Trigger**: Service unreachable for 1 minute  
**Action**: Check service logs, restart if needed

### Warning Alerts

#### Slow Response Time

```yaml
alert: SlowResponseTime
expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
for: 5m
severity: warning
```

**Trigger**: 95th percentile response time > 2 seconds  
**Action**: Investigate slow endpoints, check database

#### High Agent Failure Rate

```yaml
alert: HighAgentFailureRate
expr: rate(agent_queries_total{status="error"}[5m]) / rate(agent_queries_total[5m]) > 0.1
for: 5m
severity: warning
```

**Trigger**: Agent failure rate > 10%  
**Action**: Check LLM API status, review error logs

#### High Token Usage

```yaml
alert: HighTokenUsage
expr: rate(agent_tokens_used_total[1h]) > 1000000
for: 10m
severity: warning
```

**Trigger**: Token usage > 1M tokens/hour  
**Action**: Review usage patterns, check for abuse

#### High Database Connections

```yaml
alert: HighDatabaseConnections
expr: db_connections_active > 18
for: 5m
severity: warning
```

**Trigger**: Active connections > 18 (out of 20 max)  
**Action**: Check for connection leaks, scale if needed

#### Low Cache Hit Rate

```yaml
alert: LowCacheHitRate
expr: cache_hits_total / (cache_hits_total + cache_misses_total) < 0.7
for: 10m
severity: warning
```

**Trigger**: Cache hit rate < 70%  
**Action**: Review caching strategy, adjust TTLs

## Accessing the Monitoring Stack

### Prometheus

**URL**: http://localhost:9090

**Features**:

- Query metrics using PromQL
- View active alerts
- Check target health
- Explore time-series data

**Common Queries**:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Agent queries per minute
rate(agent_queries_total[1m]) * 60

# Token usage by model
sum by (model) (rate(agent_tokens_used_total[5m]))
```

### Grafana

**URL**: http://localhost:3000  
**Default Credentials**: admin / (set via GRAFANA_ADMIN_PASSWORD env var)

**Features**:

- Pre-configured dashboards
- Custom dashboard creation
- Alert management
- Data exploration
- Dashboard sharing

**Navigation**:

1. **Home** → View all dashboards
2. **Dashboards** → Browse by category
3. **Explore** → Ad-hoc queries
4. **Alerting** → Manage alerts

## Best Practices

### 1. Metric Naming

Follow Prometheus naming conventions:

- Use snake_case: `agent_queries_total`
- Include unit suffix: `_seconds`, `_bytes`, `_total`
- Use descriptive names: `http_request_duration_seconds` not `req_time`

### 2. Label Usage

- Keep cardinality low (avoid user IDs as labels)
- Use consistent label names across metrics
- Include relevant dimensions: `status`, `method`, `endpoint`
- Avoid high-cardinality labels (e.g., request_id)

### 3. Dashboard Design

- Start with overview, drill down to details
- Use consistent time ranges
- Include context (what's normal?)
- Add annotations for deployments
- Use appropriate visualization types

### 4. Alert Configuration

- Set appropriate thresholds
- Use `for` clause to avoid flapping
- Include actionable descriptions
- Test alerts before production
- Document runbooks

### 5. Performance

- Use recording rules for expensive queries
- Set appropriate retention periods
- Monitor Prometheus itself
- Use federation for large deployments

## Troubleshooting

### Metrics Not Appearing

**Check**:

1. Is the `/metrics` endpoint accessible?
   ```bash
   curl http://localhost:8000/metrics
   ```
2. Is Prometheus scraping the target?
   - Go to Prometheus → Status → Targets
3. Are there any scrape errors?
   - Check Prometheus logs

### High Cardinality Issues

**Symptoms**: Prometheus using excessive memory

**Solutions**:

- Remove high-cardinality labels (user_id, request_id)
- Use label_replace to aggregate
- Implement metric relabeling
- Increase Prometheus resources

### Dashboard Not Loading

**Check**:

1. Is Grafana running?
   ```bash
   docker ps | grep grafana
   ```
2. Is the data source configured?
   - Grafana → Configuration → Data Sources
3. Are there query errors?
   - Check dashboard panel errors

### Alerts Not Firing

**Check**:

1. Is the alert rule valid?
   - Prometheus → Alerts
2. Is the condition met?
   - Test the PromQL query
3. Is the `for` duration too long?
4. Are alert receivers configured?

## Integration with Existing Observability

### Correlation with Logs

All requests include a `request_id` that appears in:

- Structured logs (JSON)
- Prometheus metrics (short version)
- Langfuse traces

**Example**:

```python
# In middleware
request_id = str(uuid.uuid4())

# In logs
logger.info("Processing request", extra={"request_id": request_id})

# In metrics (use short version to avoid high cardinality)
agent_queries_total.labels(request_id=request_id[:8]).inc()

# In Langfuse
trace = langfuse.trace(id=request_id)
```

### Correlation with Traces

Langfuse traces include:

- Request ID
- User ID
- Token usage
- Tool calls
- Response time

These can be correlated with Prometheus metrics for deep analysis.

## Maintenance

### Regular Tasks

**Daily**:

- Check dashboard for anomalies
- Review active alerts
- Monitor resource usage

**Weekly**:

- Review slow queries
- Analyze usage patterns
- Check alert effectiveness

**Monthly**:

- Review retention policies
- Update dashboards
- Optimize queries
- Review alert thresholds

### Backup

**Prometheus Data**:

```bash
# Backup Prometheus data
docker cp prometheus:/prometheus ./prometheus-backup

# Restore
docker cp ./prometheus-backup prometheus:/prometheus
```

**Grafana Dashboards**:

- Export dashboards as JSON
- Store in version control
- Use provisioning for automation

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
