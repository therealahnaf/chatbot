/**
 * Analytics API client functions
 */
import apiClient from '@/lib/api-client'

export interface OverviewStats {
  total_users: number
  active_users_7d: number
  active_users_30d: number
  user_growth: Array<{
    date: string
    count: number
  }>
  total_conversations: number
  conversations_trend: Array<{
    date: string
    count: number
  }>
  total_messages: number
  messages_by_role: Record<string, number>
  messages_trend: Array<{
    date: string
    count: number
  }>
  avg_messages_per_conv: number
  total_tickets: number
  tickets_by_status: Record<string, number>
  tickets_by_priority: Record<string, number>
  tickets_trend: Array<{
    date: string
    count: number
  }>
  total_documents: number
  documents_by_status: Record<string, number>
  documents_by_type: Record<string, number>
  documents_trend: Array<{
    date: string
    count: number
  }>
  total_chunks: number
  total_feedback: number
  avg_rating: number
  feedback_by_rating: Record<string, number>
}

/**
 * Get overview dashboard statistics
 */
export async function getOverviewStats(): Promise<OverviewStats> {
  const response = await apiClient.get<OverviewStats>('/analytics/overview')
  return response.data
}

export interface SystemStats {
  enabled: boolean
  error?: string
  timestamp: string
  cpu_usage_percent: number
  memory_usage_mb: number
  request_rate: number
  error_rate: number
  avg_response_time_ms: number
  db_connections: number
  redis_connections: number
  uptime_seconds: number
  request_trend: Array<{
    timestamp: string
    value: number
  }>
  error_trend: Array<{
    timestamp: string
    value: number
  }>
  response_time_trend: Array<{
    timestamp: string
    value: number
  }>
}

/**
 * Get system statistics from Prometheus
 */
export async function getSystemStats(): Promise<SystemStats> {
  const response = await apiClient.get<SystemStats>('/analytics/system')
  return response.data
}

