import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

interface MessagesChartProps {
  data: Array<{ date: string; count: number }>
  loading: boolean
}

export function MessagesChart({ data, loading }: MessagesChartProps) {
  if (loading) {
    return <Skeleton className='h-[300px] w-full' />
  }

  if (data.length === 0) {
    return (
      <div className='text-muted-foreground flex h-[300px] items-center justify-center'>
        No data available
      </div>
    )
  }

  const chartData = data.map((item) => {
    const date = new Date(item.date)
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      messages: item.count,
    }
  })

  return (
    <ResponsiveContainer width='100%' height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id='colorMessages' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='5%' stopColor='var(--color-chart-2)' />
            <stop offset='95%' stopColor='var(--color-chart-2)' />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
        <XAxis
          dataKey='date'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            // backgroundColor: 'hsl(var(--background))',
            // border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
        <Area
          type='monotone'
          dataKey='messages'
          stroke='var(--color-chart-2)'
          fillOpacity={1}
          fill='url(#colorMessages)'
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
