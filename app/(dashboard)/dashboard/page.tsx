'use client'

import { useRouter } from 'next/navigation'
import { Plus, Phone, Mail, FileText } from 'lucide-react'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { AnalyticsOverview } from '@/components/dashboard/AnalyticsOverview'
import { PipelineOverview } from '@/components/dashboard/PipelineOverview'
import { LeadTrendChart } from '@/components/dashboard/LeadTrendChart'
import { PipelineChart } from '@/components/dashboard/PipelineChart'
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  const router = useRouter()

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

      <OnboardingChecklist />

      <StatsCards />

      <div className="grid w-full grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
        <div className="w-full xl:col-span-2">
          <LeadTrendChart />
        </div>
        <div className="w-full xl:col-span-1">
          <PipelineChart />
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
        <div className="w-full xl:col-span-2">
          <RecentActivity />
        </div>
        <div className="w-full xl:col-span-1">
          <AnalyticsOverview />
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <PipelineOverview />

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/leads')}
                className="flex items-center space-x-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Plus className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-sm font-medium">Add Lead</div>
                  <div className="text-xs text-muted-foreground">
                    Create new lead
                  </div>
                </div>
              </button>
              <button
                onClick={() => router.push('/contacts')}
                className="flex items-center space-x-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Phone className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-sm font-medium">Contacts</div>
                  <div className="text-xs text-muted-foreground">
                    View contacts
                  </div>
                </div>
              </button>
              <button
                onClick={() => router.push('/email')}
                className="flex items-center space-x-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Mail className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-sm font-medium">Send Email</div>
                  <div className="text-xs text-muted-foreground">
                    Email campaign
                  </div>
                </div>
              </button>
              <button
                onClick={() => router.push('/projects')}
                className="flex items-center space-x-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <FileText className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-sm font-medium">Projects</div>
                  <div className="text-xs text-muted-foreground">
                    Manage projects
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
