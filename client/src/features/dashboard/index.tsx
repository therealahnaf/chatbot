import { useEffect, useState, useMemo } from 'react'
import { Download, ThumbsUp } from 'lucide-react'
import { getOverviewStats, type OverviewStats } from '@/lib/api/analytics.api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
// import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { MessagesChart } from './components/charts/messages-chart'
import { PieChartComponent } from './components/charts/pie-chart'
import { TrendChart } from './components/charts/trend-chart'
import { UserGrowthChart } from './components/charts/user-growth-chart'
import { Overview } from './components/overview'
import { SystemStats } from './components/system-stats'

export function Dashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getOverviewStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Transform feedback data to show Helpful (5) vs Not Helpful (1)
  const feedbackData = useMemo(() => {
    const helpful = stats?.feedback_by_rating?.['5'] || 0
    const notHelpful = stats?.feedback_by_rating?.['1'] || 0
    return {
      Helpful: helpful,
      'Not Helpful': notHelpful,
    }
  }, [stats?.feedback_by_rating])

  // Calculate helpful percentage
  const helpfulPercentage = useMemo(() => {
    if (!stats?.total_feedback || stats.total_feedback === 0) return 0
    const helpful = stats.feedback_by_rating?.['5'] || 0
    return Math.round((helpful / stats.total_feedback) * 100)
  }, [stats?.total_feedback, stats?.feedback_by_rating])

  const downloadCSV = () => {
    if (!stats) return

    // Helper function to escape CSV values
    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      // If contains comma, quote, or newline, wrap in quotes and escape quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Helper function to convert array to CSV rows
    const arrayToCSV = (
      arr: Array<{
        date: string
        count?: number
        tickets?: number
        documents?: number
      }>,
      name: string
    ): string[] => {
      const rows: string[] = []
      rows.push(`\n${name}`)
      rows.push('Date,Count')
      arr.forEach((item) => {
        const count = item.count ?? item.tickets ?? item.documents ?? 0
        rows.push(`${escapeCSV(item.date)},${escapeCSV(count)}`)
      })
      return rows
    }

    const csvRows: string[] = []

    // Header
    csvRows.push('Analytics Dashboard Export')
    csvRows.push(`Generated: ${new Date().toISOString()}`)
    csvRows.push('')

    // Summary Statistics
    csvRows.push('Summary Statistics')
    csvRows.push('Metric,Value')
    csvRows.push(`Total Users,${escapeCSV(stats.total_users)}`)
    csvRows.push(`Active Users (7d),${escapeCSV(stats.active_users_7d)}`)
    csvRows.push(`Active Users (30d),${escapeCSV(stats.active_users_30d)}`)
    csvRows.push(`Total Conversations,${escapeCSV(stats.total_conversations)}`)
    csvRows.push(`Total Messages,${escapeCSV(stats.total_messages)}`)
    csvRows.push(
      `Avg Messages per Conversation,${escapeCSV(stats.avg_messages_per_conv)}`
    )
    csvRows.push(`Total Tickets,${escapeCSV(stats.total_tickets)}`)
    csvRows.push(`Total Documents,${escapeCSV(stats.total_documents)}`)
    csvRows.push(`Total Chunks,${escapeCSV(stats.total_chunks)}`)
    csvRows.push(`Total Feedback,${escapeCSV(stats.total_feedback)}`)
    csvRows.push(`Helpful Percentage,${escapeCSV(helpfulPercentage)}%`)

    // Tickets by Status
    if (
      stats.tickets_by_status &&
      Object.keys(stats.tickets_by_status).length > 0
    ) {
      csvRows.push('')
      csvRows.push('Tickets by Status')
      csvRows.push('Status,Count')
      Object.entries(stats.tickets_by_status).forEach(([status, count]) => {
        csvRows.push(`${escapeCSV(status)},${escapeCSV(count)}`)
      })
    }

    // Tickets by Priority
    if (
      stats.tickets_by_priority &&
      Object.keys(stats.tickets_by_priority).length > 0
    ) {
      csvRows.push('')
      csvRows.push('Tickets by Priority')
      csvRows.push('Priority,Count')
      Object.entries(stats.tickets_by_priority).forEach(([priority, count]) => {
        csvRows.push(`${escapeCSV(priority)},${escapeCSV(count)}`)
      })
    }

    // Documents by Status
    if (
      stats.documents_by_status &&
      Object.keys(stats.documents_by_status).length > 0
    ) {
      csvRows.push('')
      csvRows.push('Documents by Status')
      csvRows.push('Status,Count')
      Object.entries(stats.documents_by_status).forEach(([status, count]) => {
        csvRows.push(`${escapeCSV(status)},${escapeCSV(count)}`)
      })
    }

    // Documents by Type
    if (
      stats.documents_by_type &&
      Object.keys(stats.documents_by_type).length > 0
    ) {
      csvRows.push('')
      csvRows.push('Documents by Type')
      csvRows.push('Type,Count')
      Object.entries(stats.documents_by_type).forEach(([type, count]) => {
        csvRows.push(`${escapeCSV(type)},${escapeCSV(count)}`)
      })
    }

    // Messages by Role
    if (
      stats.messages_by_role &&
      Object.keys(stats.messages_by_role).length > 0
    ) {
      csvRows.push('')
      csvRows.push('Messages by Role')
      csvRows.push('Role,Count')
      Object.entries(stats.messages_by_role).forEach(([role, count]) => {
        csvRows.push(`${escapeCSV(role)},${escapeCSV(count)}`)
      })
    }

    // Feedback (Helpful vs Not Helpful)
    if (feedbackData && Object.keys(feedbackData).length > 0) {
      csvRows.push('')
      csvRows.push('Feedback')
      csvRows.push('Type,Count')
      Object.entries(feedbackData).forEach(([type, count]) => {
        csvRows.push(`${escapeCSV(type)},${escapeCSV(count)}`)
      })
    }

    // Trends
    if (stats.user_growth && stats.user_growth.length > 0) {
      csvRows.push(...arrayToCSV(stats.user_growth, 'User Growth Trend'))
    }

    if (stats.conversations_trend && stats.conversations_trend.length > 0) {
      csvRows.push(
        ...arrayToCSV(stats.conversations_trend, 'Conversations Trend')
      )
    }

    if (stats.messages_trend && stats.messages_trend.length > 0) {
      csvRows.push('')
      csvRows.push('Messages Trend')
      csvRows.push('Date,Count')
      stats.messages_trend.forEach((item) => {
        csvRows.push(`${escapeCSV(item.date)},${escapeCSV(item.count)}`)
      })
    }

    if (stats.tickets_trend && stats.tickets_trend.length > 0) {
      csvRows.push(...arrayToCSV(stats.tickets_trend, 'Tickets Trend'))
    }

    if (stats.documents_trend && stats.documents_trend.length > 0) {
      csvRows.push(...arrayToCSV(stats.documents_trend, 'Documents Trend'))
    }

    // Create CSV content
    const csvContent = csvRows.join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().split('T')[0]
    link.href = url
    link.download = `analytics-export-${timestamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        {/* <TopNav links={topNav} /> */}
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
          <div className='flex items-center space-x-2'>
            <Button onClick={downloadCSV} disabled={loading || !stats}>
              <Download className='mr-2 h-4 w-4' />
              Download
            </Button>
          </div>
        </div>
        <Tabs
          orientation='vertical'
          defaultValue='overview'
          className='space-y-4'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='system'>System</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Users
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
                    <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                    <circle cx='9' cy='7' r='4' />
                    <path d='M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
                  </svg>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className='h-8 w-24' />
                  ) : (
                    <>
                      <div className='text-2xl font-bold'>
                        {stats?.total_users ?? 0}
                      </div>
                      <p className='text-muted-foreground text-xs'>
                        {stats?.active_users_30d ?? 0} active (30d)
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Conversations
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
                    <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
                  </svg>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className='h-8 w-24' />
                  ) : (
                    <>
                      <div className='text-2xl font-bold'>
                        {stats?.total_conversations ?? 0}
                      </div>
                      <p className='text-muted-foreground text-xs'>
                        {stats?.active_users_7d ?? 0} active users (7d)
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Tickets</CardTitle>
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
                    <rect width='20' height='14' x='2' y='5' rx='2' />
                    <path d='M2 10h20' />
                  </svg>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className='h-8 w-24' />
                  ) : (
                    <>
                      <div className='text-2xl font-bold'>
                        {stats?.total_tickets ?? 0}
                      </div>
                      <p className='text-muted-foreground text-xs'>
                        {stats?.tickets_by_status
                          ? Object.values(stats.tickets_by_status).reduce(
                              (a, b) => a + b,
                              0
                            )
                          : 0}{' '}
                        total
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Documents
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
                    <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
                    <path d='M14 2v6h6' />
                    <path d='M16 13H8' />
                    <path d='M16 17H8' />
                    <path d='M10 9H8' />
                  </svg>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className='h-8 w-24' />
                  ) : (
                    <>
                      <div className='text-2xl font-bold'>
                        {stats?.total_documents ?? 0}
                      </div>
                      <p className='text-muted-foreground text-xs'>
                        {stats?.documents_by_status
                          ? Object.entries(stats.documents_by_status)
                              .map(([status, count]) => `${status}: ${count}`)
                              .join(', ')
                          : 'No documents'}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
            {/* First Row: Conversations and Messages */}
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>Conversations Trend</CardTitle>
                  <CardDescription>
                    Conversations created in the last 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent className='ps-2'>
                  <Overview
                    data={
                      stats?.conversations_trend.map((item) => {
                        const date = new Date(item.date)
                        return {
                          name: date.toLocaleDateString('en-US', {
                            weekday: 'short',
                          }),
                          total: item.count,
                        }
                      }) || []
                    }
                    loading={loading}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Messages Activity</CardTitle>
                  <CardDescription>
                    Messages sent in the last 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent className='ps-2'>
                  <MessagesChart
                    data={stats?.messages_trend || []}
                    loading={loading}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Second Row: User Growth and Tickets */}
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>
                    New user registrations (last 30 days)
                  </CardDescription>
                </CardHeader>
                <CardContent className='ps-2'>
                  <UserGrowthChart
                    data={stats?.user_growth || []}
                    loading={loading}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Tickets Trend</CardTitle>
                  <CardDescription>
                    Tickets created (last 30 days)
                  </CardDescription>
                </CardHeader>
                <CardContent className='ps-2'>
                  <TrendChart
                    data={stats?.tickets_trend || []}
                    loading={loading}
                    dataKey='tickets'
                    color='var(--color-chart-2)'
                  />
                </CardContent>
              </Card>
            </div>

            {/* Third Row: Distribution Charts */}
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
              <Card>
                <CardHeader>
                  <CardTitle>Tickets by Priority</CardTitle>
                  <CardDescription>Priority distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <PieChartComponent
                    data={stats?.tickets_by_priority || {}}
                    loading={loading}
                    // colors={['#1A3BB9', '#155DFC', '#2B7FFF', '#8DC6FF']}
                    colors={[
                      'var(--chart-blue-1)',
                      'var(--chart-blue-2)',
                      'var(--chart-blue-3)',
                      'var(--chart-blue-4)',
                    ]}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Documents by Type</CardTitle>
                  <CardDescription>File type distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <PieChartComponent
                    data={stats?.documents_by_type || {}}
                    loading={loading}
                    // colors={['#8DC6FF', '#2B7FFF', '#155DFC', '#1347E6']}
                    colors={[
                      'var(--chart-blue-4)',
                      'var(--chart-blue-3)',
                      'var(--chart-blue-2)',
                      'var(--chart-blue-1)',
                    ]}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Feedback</CardTitle>
                  <CardDescription>
                    {helpfulPercentage}% helpful
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PieChartComponent
                    data={feedbackData}
                    loading={loading}
                    colors={['var(--color-chart-positive)', 'var(--chart-red)']}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Fourth Row: Additional Stats and Trends */}
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>Documents Trend</CardTitle>
                  <CardDescription>
                    Documents uploaded (last 30 days)
                  </CardDescription>
                </CardHeader>
                <CardContent className='ps-2'>
                  <TrendChart
                    data={stats?.documents_trend || []}
                    loading={loading}
                    dataKey='documents'
                    color='var(--chart-blue-3)'
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Messages by Role</CardTitle>
                  <CardDescription>User vs Assistant messages</CardDescription>
                </CardHeader>
                <CardContent>
                  <PieChartComponent
                    data={stats?.messages_by_role || {}}
                    loading={loading}
                    colors={['var(--chart-blue-3)', 'var(--chart-blue-4)']}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Fifth Row: Additional Metrics */}
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Messages
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
                    <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
                  </svg>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className='h-8 w-24' />
                  ) : (
                    <>
                      <div className='text-2xl font-bold'>
                        {stats?.total_messages ?? 0}
                      </div>
                      <p className='text-muted-foreground text-xs'>
                        Avg {stats?.avg_messages_per_conv ?? 0} per conversation
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Chunks
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
                    <path d='M4 7h16M4 12h16M4 17h16' />
                  </svg>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className='h-8 w-24' />
                  ) : (
                    <>
                      <div className='text-2xl font-bold'>
                        {stats?.total_chunks ?? 0}
                      </div>
                      <p className='text-muted-foreground text-xs'>
                        Knowledge base chunks
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    Total Feedback
                  </CardTitle>
                  <ThumbsUp className='text-muted-foreground h-4 w-4' />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className='h-8 w-24' />
                  ) : (
                    <>
                      <div className='text-2xl font-bold'>
                        {stats?.total_feedback ?? 0}
                      </div>
                      <p className='text-muted-foreground text-xs'>
                        {helpfulPercentage}% helpful
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    User Growth Rate
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
                    <path d='M22 12h-4l-3 9L9 3l-3 9H2' />
                  </svg>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className='h-8 w-24' />
                  ) : (
                    <>
                      <div className='text-2xl font-bold'>
                        {stats?.user_growth
                          ? stats.user_growth.reduce(
                              (sum, item) => sum + item.count,
                              0
                            )
                          : 0}
                      </div>
                      <p className='text-muted-foreground text-xs'>
                        New users (30d)
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value='system' className='space-y-4'>
            <SystemStats />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

// const topNav = [
//   {
//     title: 'Overview',
//     href: 'dashboard/overview',
//     isActive: true,
//     disabled: false,
//   },
//   {
//     title: 'Customers',
//     href: 'dashboard/customers',
//     isActive: false,
//     disabled: true,
//   },
//   {
//     title: 'Products',
//     href: 'dashboard/products',
//     isActive: false,
//     disabled: true,
//   },
//   {
//     title: 'Settings',
//     href: 'dashboard/settings',
//     isActive: false,
//     disabled: true,
//   },
// ]
