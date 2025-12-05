# Dashboard Plan - AI Agent Platform

## Executive Summary

This plan outlines an efficient and optimized dashboard strategy that leverages:
- **PostgreSQL**: Business data, user interactions, tickets, documents
- **Langfuse**: LLM-specific observability (traces, token usage, model performance)
- **Prometheus**: System metrics, performance, infrastructure health

**Key Principle**: Each data source serves its optimal purpose to avoid redundancy and ensure efficient data retrieval.

---

## Data Source Strategy

### PostgreSQL - Business & User Data
**Best For:**
- User management (registration, activity, roles)
- Conversations and messages
- Support tickets (status, priority, assignment)
- Knowledge base documents
- User feedback and ratings
- Business analytics (trends, patterns, user behavior)

**Query Pattern**: Aggregated queries with time-based filtering, JOINs for relationships

### Langfuse - LLM Observability
**Best For:**
- LLM call traces and spans
- Token usage (input/output) per model
- Model performance (latency, errors)
- Prompt/response analysis
- Cost tracking (token-based)
- LLM-specific debugging

**Query Pattern**: Trace-based queries, generation analysis, cost calculations

### Prometheus - System Metrics
**Best For:**
- Real-time system health
- Request rates and latencies
- Error rates
- Infrastructure metrics (DB connections, cache hits)
- Performance trends (histograms, percentiles)
- Alerting thresholds

**Query Pattern**: PromQL queries, time-series aggregations, rate calculations

---

## Dashboard Structure

### 1. Overview Dashboard (Main Landing Page)

**Purpose**: High-level system health and key business metrics

#### PostgreSQL Data:
- **Total Users** (count, with growth trend)
- **Active Users** (last 7/30 days)
- **Total Conversations** (count, with trend)
- **Total Tickets** (by status: open, in-progress, closed)
- **Knowledge Base Documents** (total, by status)

#### Prometheus Data:
- **Request Rate** (requests/sec, last 1h)
- **Error Rate** (% of 5xx errors, last 1h)
- **Average Response Time** (p50, p95, p99, last 1h)
- **System Health Status** (green/yellow/red indicators)

#### Langfuse Data:
- **Total LLM Calls** (last 24h)
- **Average Token Usage** (per call, last 24h)
- **Model Distribution** (which models used most)

**Refresh Rate**: 30 seconds (Prometheus), 5 minutes (PostgreSQL), 1 minute (Langfuse)

---

### 2. Agent Performance Dashboard

**Purpose**: Deep dive into AI agent performance and usage

#### Langfuse Data (Primary):
- **LLM Call Volume** (line chart, last 7 days)
- **Token Usage Over Time** (stacked area: input vs output tokens)
- **Model Performance** (latency by model: gpt-4o-mini, etc.)
- **Cost Tracking** (estimated cost per day/week, based on token usage)
- **Error Rate by Model** (% of failed LLM calls)
- **Average Tokens per Call** (by model)

#### Prometheus Data (Supporting):
- **Agent Query Rate** (queries/min, by status: success/error)
- **Agent Response Duration** (histogram, p50/p95/p99)
- **Tool Call Distribution** (which tools used most)
- **Tool Success Rate** (by tool name)

#### PostgreSQL Data (Context):
- **Conversations by Intent** (if tracked in metadata)
- **User Satisfaction** (average feedback rating)

**Refresh Rate**: 1 minute (Langfuse), 30 seconds (Prometheus), 5 minutes (PostgreSQL)

---

### 3. User Analytics Dashboard

**Purpose**: User behavior, engagement, and business metrics

#### PostgreSQL Data (Primary):
- **User Growth** (new registrations over time, line chart)
- **Active Users** (daily/weekly/monthly active users)
- **User Roles Distribution** (pie chart: admin, user, etc.)
- **Conversations per User** (histogram, average)
- **Messages per Conversation** (average, distribution)
- **Top Users by Activity** (table: user, conversations, messages)
- **User Retention** (cohort analysis: % returning users)

#### Prometheus Data (Supporting):
- **Login Rate** (logins per hour/day)
- **Authentication Success Rate** (% successful logins)
- **Active Sessions** (gauge, current)

#### Langfuse Data (Optional):
- **LLM Usage by User** (if user_id tracked in traces)

**Refresh Rate**: 5 minutes (PostgreSQL), 1 minute (Prometheus)

---

### 4. Support Tickets Dashboard

**Purpose**: Support ticket management and analytics

#### PostgreSQL Data (Primary):
- **Tickets by Status** (pie chart: open, in-progress, resolved, closed)
- **Tickets by Priority** (bar chart: low, medium, high, urgent)
- **Tickets Over Time** (line chart: created vs resolved, last 30 days)
- **Average Resolution Time** (by priority, by status)
- **Tickets by Category** (if category tracked)
- **Assignment Status** (unassigned vs assigned)
- **Top Ticket Creators** (table: user, ticket count)
- **Ticket Resolution Rate** (% resolved within SLA, if SLA defined)

#### Prometheus Data (Optional):
- **Ticket Creation Rate** (if tracked as metric)

**Refresh Rate**: 1 minute (PostgreSQL)

---

### 5. Knowledge Base Dashboard

**Purpose**: Document management and search analytics

#### PostgreSQL Data (Primary):
- **Total Documents** (count, by status: processing, done, failed)
- **Documents by File Type** (pie chart: PDF, DOCX, TXT, MD)
- **Documents Over Time** (line chart: uploads per day)
- **Total Chunks** (aggregate count)
- **Documents by User** (top uploaders)

#### Prometheus Data (Supporting):
- **KB Search Rate** (searches per minute)
- **KB Search Duration** (p50, p95, p99)
- **KB Search Results Count** (average results per search)
- **Document Upload Success Rate** (% successful uploads)

**Refresh Rate**: 5 minutes (PostgreSQL), 30 seconds (Prometheus)

---

### 6. System Health Dashboard

**Purpose**: Infrastructure monitoring and performance

#### Prometheus Data (Primary):
- **HTTP Request Rate** (by endpoint, requests/sec)
- **HTTP Error Rate** (by status code: 4xx, 5xx)
- **Response Time by Endpoint** (p95, p99)
- **Database Connection Pool** (active, idle, total)
- **Database Query Duration** (p50, p95, p99, by operation)
- **Cache Hit Rate** (% cache hits vs misses)
- **Cache Operations** (get/set/delete rates)
- **Vector Store Operations** (search/insert rates, duration)
- **Redis Health** (if Redis exporter available)

#### PostgreSQL Data (Optional):
- **Database Size** (if queryable)

**Refresh Rate**: 15 seconds (Prometheus)

---

### 7. Cost & Usage Dashboard

**Purpose**: Track LLM costs and resource usage

#### Langfuse Data (Primary):
- **Daily Token Usage** (input + output, stacked area chart)
- **Cost Estimation** (based on model pricing, line chart)
- **Cost by Model** (pie chart: which models cost most)
- **Average Cost per Query** (trend over time)
- **Token Efficiency** (output tokens / input tokens ratio)

#### Prometheus Data (Supporting):
- **Agent Query Volume** (correlate with costs)
- **Tool Usage** (which tools drive most queries)

#### PostgreSQL Data (Context):
- **Queries by User** (if needed for billing)

**Refresh Rate**: 5 minutes (Langfuse), 1 minute (Prometheus)

---

### 8. Feedback & Quality Dashboard

**Purpose**: User satisfaction and response quality

#### PostgreSQL Data (Primary):
- **Feedback Distribution** (rating 1-5, bar chart)
- **Average Rating Over Time** (line chart, last 30 days)
- **Feedback by Conversation** (average rating per conversation)
- **Feedback Comments** (word cloud, sentiment analysis if available)
- **Response Rate** (% of messages with feedback)

#### Langfuse Data (Optional):
- **Correlate Ratings with LLM Performance** (if trace_id linked to feedback)

**Refresh Rate**: 5 minutes (PostgreSQL)

---

## Implementation Recommendations

### 1. Data Aggregation Strategy

**PostgreSQL:**
- Use materialized views for expensive aggregations (user stats, ticket stats)
- Refresh materialized views every 5-15 minutes
- Create indexes on time-based columns (created_at, updated_at)
- Use window functions for trends

**Langfuse:**
- Use Langfuse API for aggregated queries (don't query raw traces)
- Cache expensive queries (cost calculations, token aggregations)
- Query by time ranges (last 24h, 7d, 30d)

**Prometheus:**
- Use recording rules for complex PromQL queries
- Pre-aggregate common queries (rate calculations, percentiles)
- Set appropriate retention (15 days for detailed, 90 days for aggregated)

### 2. Caching Strategy

- **PostgreSQL Aggregations**: Cache for 5 minutes (Redis)
- **Langfuse Queries**: Cache for 2-5 minutes (Redis)
- **Prometheus Queries**: No caching needed (Prometheus handles this)

### 3. Query Optimization

**PostgreSQL:**
```sql
-- Example: User activity query (optimized)
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as conversations
FROM conversations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
```

**Prometheus:**
```promql
# Example: Agent query rate
rate(agent_queries_total[5m])

# Example: Error rate
rate(agent_queries_total{status="error"}[5m]) / rate(agent_queries_total[5m])
```

**Langfuse:**
- Use Langfuse SDK/API for queries
- Filter by time range, user_id, model
- Aggregate at query time (don't fetch all traces)

### 4. Real-time vs Batch Updates

| Metric Type | Update Frequency | Data Source |
|------------|------------------|-------------|
| System Health | 15-30 seconds | Prometheus |
| Request Rates | 30 seconds | Prometheus |
| LLM Performance | 1 minute | Langfuse |
| Business Metrics | 5 minutes | PostgreSQL |
| User Analytics | 5-15 minutes | PostgreSQL |
| Cost Tracking | 5 minutes | Langfuse |

### 5. Dashboard Technology Stack

**Recommended:**
- **Grafana** (already in stack) for Prometheus dashboards
- **Custom React/Vue Dashboard** for PostgreSQL + Langfuse data
- **API Layer**: FastAPI endpoints that aggregate data from all sources

**Alternative:**
- Use Grafana with PostgreSQL and Langfuse data sources (if connectors available)
- Or build unified API that queries all sources and serves JSON

---

## API Endpoints Needed

### PostgreSQL Endpoints:
```
GET /api/v1/analytics/users/stats
GET /api/v1/analytics/conversations/stats
GET /api/v1/analytics/tickets/stats
GET /api/v1/analytics/documents/stats
GET /api/v1/analytics/feedback/stats
```

### Langfuse Endpoints:
```
GET /api/v1/analytics/langfuse/token-usage
GET /api/v1/analytics/langfuse/cost-estimation
GET /api/v1/analytics/langfuse/model-performance
GET /api/v1/analytics/langfuse/trace-stats
```

### Prometheus Endpoints:
- Use Grafana directly or Prometheus query API
- Or create wrapper: `GET /api/v1/analytics/metrics/{metric_name}`

---

## Performance Considerations

1. **Avoid N+1 Queries**: Use JOINs and aggregations in SQL
2. **Limit Time Ranges**: Default to last 24h/7d, allow user selection
3. **Pagination**: For large datasets (top users, conversations)
4. **Background Jobs**: Pre-calculate expensive aggregations
5. **Connection Pooling**: Ensure proper DB connection limits
6. **Rate Limiting**: Protect API endpoints from abuse

---

## Security & Access Control

- **Admin Only**: System health, cost tracking, all user analytics
- **User-Specific**: Users can see their own stats (conversations, usage)
- **Role-Based**: Different dashboards for admin vs regular users

---

## Future Enhancements

1. **Predictive Analytics**: Forecast user growth, ticket volume
2. **Anomaly Detection**: Alert on unusual patterns (spike in errors, costs)
3. **A/B Testing**: Track different agent configurations
4. **Export Functionality**: Download reports (CSV, PDF)
5. **Custom Alerts**: Set thresholds for key metrics
6. **Drill-Down**: Click charts to see detailed data
7. **Comparison Views**: Compare time periods (this week vs last week)

---

## Summary: Data Source Usage

| Dashboard | PostgreSQL | Langfuse | Prometheus |
|-----------|-----------|----------|------------|
| Overview | ✅ Business metrics | ✅ LLM summary | ✅ System health |
| Agent Performance | ⚠️ Context only | ✅ Primary | ✅ Supporting |
| User Analytics | ✅ Primary | ⚠️ Optional | ✅ Supporting |
| Support Tickets | ✅ Primary | ❌ | ⚠️ Optional |
| Knowledge Base | ✅ Primary | ❌ | ✅ Supporting |
| System Health | ⚠️ Optional | ❌ | ✅ Primary |
| Cost & Usage | ⚠️ Context | ✅ Primary | ✅ Supporting |
| Feedback & Quality | ✅ Primary | ⚠️ Optional | ❌ |

**Legend:**
- ✅ Primary: Main data source
- ✅ Supporting: Important but secondary
- ⚠️ Optional: Nice to have
- ❌ Not needed

---

## Conclusion

**Yes, use all three data sources**, but strategically:
- **PostgreSQL**: Business intelligence, user data, tickets, documents
- **Langfuse**: LLM-specific observability, cost tracking, model performance
- **Prometheus**: System health, real-time metrics, infrastructure monitoring

This approach avoids redundancy, optimizes query performance, and provides comprehensive observability across business, application, and infrastructure layers.

