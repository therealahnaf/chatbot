import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

interface TrendChartProps {
  data: Array<{ date: string; count: number }>
  loading: boolean
  dataKey?: string
  color?: string
}

export function TrendChart({
  data,
  loading,
  dataKey = 'count',
  color = '#3b82f6',
}: TrendChartProps) {
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
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      [dataKey]: item.count,
    }
  })

  return (
    <ResponsiveContainer width='100%' height={300}>
      <LineChart data={chartData}>
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
            opacity: 0.8,
            borderRadius: '6px',
          }}
        />
        <Line
          type='monotone'
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
