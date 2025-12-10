import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

interface PieChartProps {
  data: Record<string, number>
  loading: boolean
  colors?: string[]
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

export function PieChartComponent({
  data,
  loading,
  colors = DEFAULT_COLORS,
}: PieChartProps) {
  if (loading) {
    return <Skeleton className='h-[300px] w-full' />
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className='text-muted-foreground flex h-[300px] items-center justify-center'>
        No data available
      </div>
    )
  }

  const chartData = Object.entries(data).map(([name, value], index) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: colors[index % colors.length],
  }))

  return (
    <ResponsiveContainer width='100%' height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx='50%'
          cy='50%'
          labelLine={false}
          label={(props: {
            name?: string
            percent?: number
            [key: string]: unknown
          }) => {
            const name = props.name || ''
            const percent = props.percent || 0
            return `${name} ${(percent * 100).toFixed(0)}%`
          }}
          outerRadius={80}
          fill='#8884d8'
          dataKey='value'
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            // backgroundColor: 'hsl(var(--background))',
            // border: '1px solid hsl(var(--border))',
            opacity: 0.8,
            borderRadius: '6px',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
