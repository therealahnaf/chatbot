import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

interface OverviewChartProps {
  data: Array<{ name: string; total: number }>
  loading: boolean
}

export function Overview({ data, loading }: OverviewChartProps) {
  if (loading) {
    return <Skeleton className='h-[350px] w-full' />
  }

  if (data.length === 0) {
    return (
      <div className='text-muted-foreground flex h-[350px] items-center justify-center'>
        No data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width='100%' height={350}>
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey='name'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={false}
          contentStyle={{
            // backgroundColor: 'hsl(var(--background))',
            // border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
        <Bar dataKey='total' fill='var(--color-chart-2)' radius={8} />
      </BarChart>
    </ResponsiveContainer>
  )
}
