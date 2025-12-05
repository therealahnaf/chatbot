"""Prometheus analytics service for querying system metrics."""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class PrometheusAnalyticsService:
    """Service for querying Prometheus system metrics."""

    def __init__(self):
        """Initialize Prometheus analytics service."""
        self.prometheus_url = getattr(settings, 'PROMETHEUS_URL', 'http://prometheus:9090')
        if not self.prometheus_url.endswith('/'):
            self.prometheus_url = self.prometheus_url.rstrip('/')

    async def get_system_stats(self) -> Dict[str, Any]:
        """
        Get system statistics from Prometheus.
        
        Returns:
            Dictionary with system metrics including:
            - CPU usage
            - Memory usage
            - Request rates
            - Error rates
            - Response times
            - Database connections
            - Redis connections
        """
        try:
            now = datetime.utcnow()
            five_minutes_ago = now - timedelta(minutes=5)
            one_hour_ago = now - timedelta(hours=1)
            
            # Query various system metrics
            metrics = {}
            
            # CPU usage (if available)
            cpu_usage = await self._query_prometheus(
                'avg(rate(process_cpu_seconds_total[5m])) * 100'
            )
            metrics['cpu_usage_percent'] = cpu_usage if cpu_usage is not None else 0.0
            
            # Memory usage
            memory_usage = await self._query_prometheus(
                '(process_resident_memory_bytes / 1024 / 1024)'
            )
            metrics['memory_usage_mb'] = memory_usage if memory_usage is not None else 0.0
            
            # Request rate (requests per second)
            request_rate = await self._query_prometheus(
                'sum(rate(http_requests_total[5m]))'
            )
            metrics['request_rate'] = request_rate if request_rate is not None else 0.0
            
            # Error rate (5xx errors per second)
            # Try status_code first (prometheus_fastapi_instrumentator default), fallback to status
            error_rate = await self._query_prometheus(
                'sum(rate(http_requests_total{status_code=~"5.."}[5m]))'
            )
            if error_rate is None:
                # Fallback to status label if status_code doesn't work
                error_rate = await self._query_prometheus(
                    'sum(rate(http_requests_total{status=~"5.."}[5m]))'
                )
            metrics['error_rate'] = error_rate if error_rate is not None else 0.0
            
            # Average response time (p50)
            response_time = await self._query_prometheus(
                'histogram_quantile(0.5, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))'
            )
            metrics['avg_response_time_ms'] = (response_time * 1000) if response_time is not None else 0.0
            
            # Database connection pool
            db_connections = await self._query_prometheus(
                'database_connections_active'
            )
            metrics['db_connections'] = db_connections if db_connections is not None else 0
            
            # Redis connections
            redis_connections = await self._query_prometheus(
                'redis_connections_active'
            )
            metrics['redis_connections'] = redis_connections if redis_connections is not None else 0
            
            # Uptime
            uptime_seconds = await self._query_prometheus(
                'time() - process_start_time_seconds'
            )
            metrics['uptime_seconds'] = uptime_seconds if uptime_seconds is not None else 0
            
            # Get request trend (last hour)
            request_trend = await self._query_range(
                'sum(rate(http_requests_total[5m]))',
                one_hour_ago,
                now,
                step='1m'
            )
            if not request_trend:
                logger.debug(f"No request trend data found for range {one_hour_ago} to {now}")
            metrics['request_trend'] = request_trend if request_trend else []
            
            # Get error trend (last hour)
            # Try status_code first (prometheus_fastapi_instrumentator default), fallback to status
            error_trend = await self._query_range(
                'sum(rate(http_requests_total{status_code=~"5.."}[5m]))',
                one_hour_ago,
                now,
                step='1m'
            )
            if not error_trend:
                # Fallback to status label if status_code doesn't work
                logger.debug("Trying fallback query with 'status' label instead of 'status_code'")
                error_trend = await self._query_range(
                    'sum(rate(http_requests_total{status=~"5.."}[5m]))',
                    one_hour_ago,
                    now,
                    step='1m'
                )
            if not error_trend:
                logger.debug(f"No error trend data found for range {one_hour_ago} to {now}")
            metrics['error_trend'] = error_trend if error_trend else []
            
            # Get response time trend (last hour)
            response_time_trend = await self._query_range(
                'histogram_quantile(0.5, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))',
                one_hour_ago,
                now,
                step='1m'
            )
            if not response_time_trend:
                logger.debug(f"No response time trend data found for range {one_hour_ago} to {now}")
            metrics['response_time_trend'] = response_time_trend if response_time_trend else []
            
            return {
                'enabled': True,
                'timestamp': now.isoformat(),
                **metrics,
            }
            
        except Exception as e:
            logger.error(f"Error fetching Prometheus stats: {e}", exc_info=True)
            return {
                'enabled': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat(),
                'cpu_usage_percent': 0.0,
                'memory_usage_mb': 0.0,
                'request_rate': 0.0,
                'error_rate': 0.0,
                'avg_response_time_ms': 0.0,
                'db_connections': 0,
                'redis_connections': 0,
                'uptime_seconds': 0,
                'request_trend': [],
                'error_trend': [],
                'response_time_trend': [],
            }

    async def _query_prometheus(self, query: str) -> Optional[float]:
        """Execute a PromQL instant query."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.prometheus_url}/api/v1/query",
                    params={"query": query},
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get('status') == 'success' and data.get('data', {}).get('result'):
                    result = data['data']['result'][0]
                    value = result.get('value', [None, None])[1]
                    if value:
                        try:
                            return float(value)
                        except (ValueError, TypeError):
                            return None
                return None
        except Exception as e:
            logger.warning(f"Error querying Prometheus: {e}")
            return None

    async def _query_range(
        self, 
        query: str, 
        start: datetime, 
        end: datetime, 
        step: str = '1m'
    ) -> list:
        """Execute a PromQL range query."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.prometheus_url}/api/v1/query_range",
                    params={
                        "query": query,
                        "start": start.timestamp(),
                        "end": end.timestamp(),
                        "step": step,
                    },
                )
                response.raise_for_status()
                data = response.json()
                
                if data.get('status') == 'success' and data.get('data', {}).get('result'):
                    result = data['data']['result'][0]
                    values = result.get('values', [])
                    
                    # Format as list of {timestamp, value} objects
                    trend = []
                    for timestamp, value in values:
                        try:
                            trend.append({
                                'timestamp': datetime.fromtimestamp(float(timestamp)).isoformat(),
                                'value': float(value) if value else 0.0,
                            })
                        except (ValueError, TypeError):
                            continue
                    return trend
                return []
        except Exception as e:
            logger.warning(f"Error querying Prometheus range: {e}")
            return []

