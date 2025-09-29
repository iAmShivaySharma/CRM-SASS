import { StatsCards } from '@/components/dashboard/StatsCards'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { AnalyticsOverview } from '@/components/dashboard/AnalyticsOverview'
import { PipelineOverview } from '@/components/dashboard/PipelineOverview'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <div className="w-full space-y-6">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back! Here&apos;s what&apos;s happening with your sales.
        </p>
      </div>

      <StatsCards />

      <div className="grid w-full grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
        {/* Recent Activity - Takes 2 columns on xl screens */}
        <div className="w-full xl:col-span-2">
          <RecentActivity />
        </div>

        {/* Analytics Overview - Takes 1 column on xl screens */}
        <div className="w-full xl:col-span-1">
          <AnalyticsOverview />
        </div>
      </div>

      {/* Additional row for more cards */}
      <div className="grid w-full grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <PipelineOverview />

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button className="rounded-lg border p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground">
                <div className="text-sm font-medium">Add Lead</div>
                <div className="text-xs text-muted-foreground">
                  Create new lead
                </div>
              </button>
              <button className="rounded-lg border p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground">
                <div className="text-sm font-medium">Schedule Call</div>
                <div className="text-xs text-muted-foreground">
                  Book meeting
                </div>
              </button>
              <button className="rounded-lg border p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground">
                <div className="text-sm font-medium">Send Email</div>
                <div className="text-xs text-muted-foreground">
                  Email campaign
                </div>
              </button>
              <button className="rounded-lg border p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground">
                <div className="text-sm font-medium">View Reports</div>
                <div className="text-xs text-muted-foreground">Analytics</div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
