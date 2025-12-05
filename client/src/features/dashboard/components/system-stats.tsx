import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getSystemStats, type SystemStats } from '@/lib/api/analytics.api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function SystemStats() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getSystemStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch system stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  if (!stats?.enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Statistics</CardTitle>
          <CardDescription>
            {stats?.error || 'Prometheus is not available'}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className='space-y-4'>
      {/* System Metrics Cards */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>CPU Usage</CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='text-muted-foreground h-4 w-4'
            >
              <rect x='2' y='4' width='20' height='16' rx='2' />
              <path d='M8 4v16M16 4v16M2 8h20M2 16h20' />
            </svg>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-8 w-24' />
            ) : (
              <>
                <div className='text-2xl font-bold'>
                  {(stats.cpu_usage_percent ?? 0).toFixed(1)}%
                </div>
                <p className='text-muted-foreground text-xs'>Average (5m)</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Memory Usage</CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='text-muted-foreground h-4 w-4'
            >
              <path d='M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20' />
            </svg>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-8 w-24' />
            ) : (
              <>
                <div className='text-2xl font-bold'>
                  {(stats.memory_usage_mb ?? 0).toFixed(0)} MB
                </div>
                <p className='text-muted-foreground text-xs'>Resident memory</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Request Rate</CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='text-muted-foreground h-4 w-4'
            >
              <path d='M22 12h-4l-3 9L9 3l-3 9H2' />
            </svg>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-8 w-24' />
            ) : (
              <>
                <div className='text-2xl font-bold'>
                  {(stats.request_rate ?? 0).toFixed(2)}/s
                </div>
                <p className='text-muted-foreground text-xs'>
                  Requests per second
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Error Rate</CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='text-muted-foreground h-4 w-4'
            >
              <circle cx='12' cy='12' r='10' />
              <line x1='12' y1='8' x2='12' y2='12' />
              <line x1='12' y1='16' x2='12.01' y2='16' />
            </svg>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-8 w-24' />
            ) : (
              <>
                <div className='text-2xl font-bold'>
                  {(stats.error_rate ?? 0).toFixed(2)}/s
                </div>
                <p className='text-muted-foreground text-xs'>
                  5xx errors per second
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Response Time</CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='text-muted-foreground h-4 w-4'
            >
              <circle cx='12' cy='12' r='10' />
              <polyline points='12 6 12 12 16 14' />
            </svg>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-8 w-24' />
            ) : (
              <>
                <div className='text-2xl font-bold'>
                  {(stats.avg_response_time_ms ?? 0).toFixed(0)} ms
                </div>
                <p className='text-muted-foreground text-xs'>P50 latency</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              DB Connections
            </CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='text-muted-foreground h-4 w-4'
            >
              <ellipse cx='12' cy='5' rx='9' ry='3' />
              <path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3' />
              <path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' />
            </svg>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-8 w-24' />
            ) : (
              <>
                <div className='text-2xl font-bold'>
                  {stats.db_connections ?? 0}
                </div>
                <p className='text-muted-foreground text-xs'>
                  Active connections
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Redis Connections
            </CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='text-muted-foreground h-4 w-4'
            >
              <circle cx='12' cy='12' r='10' />
              <circle cx='12' cy='12' r='6' />
              <circle cx='12' cy='12' r='2' />
            </svg>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-8 w-24' />
            ) : (
              <>
                <div className='text-2xl font-bold'>
                  {stats.redis_connections ?? 0}
                </div>
                <p className='text-muted-foreground text-xs'>
                  Active connections
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Uptime</CardTitle>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              className='text-muted-foreground h-4 w-4'
            >
              <circle cx='12' cy='12' r='10' />
              <polyline points='12 6 12 12 16 14' />
            </svg>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-8 w-24' />
            ) : (
              <>
                <div className='text-2xl font-bold'>
                  {formatUptime(stats.uptime_seconds ?? 0)}
                </div>
                <p className='text-muted-foreground text-xs'>System uptime</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        <Card className='md:col-span-2'>
          <CardHeader>
            <CardTitle>Request Rate Trend</CardTitle>
            <CardDescription>
              Requests per second over the last hour
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-[300px] w-full' />
            ) : stats.request_trend.length > 0 ? (
              <ResponsiveContainer width='100%' height={300}>
                <AreaChart data={stats.request_trend}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis
                    dataKey='timestamp'
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleString()
                    }}
                  />
                  <Area
                    type='monotone'
                    dataKey='value'
                    stroke='#3b82f6'
                    fill='#3b82f6'
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className='text-muted-foreground flex h-[300px] items-center justify-center'>
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Rate Trend</CardTitle>
            <CardDescription>5xx errors per second</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-[300px] w-full' />
            ) : stats.error_trend.length > 0 ? (
              <ResponsiveContainer width='100%' height={300}>
                <AreaChart data={stats.error_trend}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis
                    dataKey='timestamp'
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleString()
                    }}
                  />
                  <Area
                    type='monotone'
                    dataKey='value'
                    stroke='#ef4444'
                    fill='#ef4444'
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className='text-muted-foreground flex h-[300px] items-center justify-center'>
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className='md:col-span-3'>
          <CardHeader>
            <CardTitle>Response Time Trend</CardTitle>
            <CardDescription>P50 latency in milliseconds</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className='h-[300px] w-full' />
            ) : stats.response_time_trend.length > 0 ? (
              <ResponsiveContainer width='100%' height={300}>
                <AreaChart data={stats.response_time_trend}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis
                    dataKey='timestamp'
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => {
                      const date = new Date(value)
                      return date.toLocaleString()
                    }}
                  />
                  <Area
                    type='monotone'
                    dataKey='value'
                    stroke='var(--color-chart-green)'
                    fill='var(--color-chart-green)'
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className='text-muted-foreground flex h-[300px] items-center justify-center'>
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
