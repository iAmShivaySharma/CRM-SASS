'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  FileText,
  Target,
  Plus,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { LeaveManagement } from '@/components/hr/LeaveManagement'
import { useAppSelector } from '@/lib/hooks'

interface LeaveStats {
  pendingRequests: number
  approvedThisMonth: number
  totalLeaveDays: number
  upcomingLeaves: number
  leaveTypeBreakdown: Array<{
    _id: string
    totalDays: number
    count: number
  }>
}

export default function LeavesPage() {
  const [activeTab, setActiveTab] = useState('requests')
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [stats, setStats] = useState<LeaveStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!currentWorkspace?.id) return
    try {
      setLoading(true)
      const res = await fetch(`/api/leaves/stats?workspaceId=${currentWorkspace.id}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch leave stats:', error)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace?.id])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const displayStats = stats || {
    pendingRequests: 0,
    approvedThisMonth: 0,
    totalLeaveDays: 0,
    upcomingLeaves: 0,
    leaveTypeBreakdown: []
  }

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">Please select a workspace to view leave data.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">
            Manage employee leave requests and policies for {currentWorkspace.name}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.pendingRequests}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.approvedThisMonth}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leave Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.totalLeaveDays}
            </div>
            <p className="text-xs text-muted-foreground">Used this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Leaves</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.upcomingLeaves}
            </div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Usage Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Leave Type Usage</h4>
              {displayStats.leaveTypeBreakdown.length > 0 ? (
                displayStats.leaveTypeBreakdown.map((type) => (
                  <div key={type._id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{type._id} Leave</span>
                      <span className="text-muted-foreground">
                        {type.totalDays} days ({type.count} requests)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((type.totalDays / Math.max(displayStats.totalLeaveDays, 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {loading ? 'Loading...' : 'No leave data available yet.'}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Quick Stats</h4>
              <div className="grid gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{displayStats.totalLeaveDays}</div>
                  <div className="text-sm text-blue-800 dark:text-blue-300">Total Leave Days Used</div>
                  <div className="text-xs text-blue-600">This year</div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{displayStats.approvedThisMonth}</div>
                  <div className="text-sm text-green-800 dark:text-green-300">Approved This Month</div>
                  <div className="text-xs text-green-600">Current month</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Leave Requests</span>
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Leave Policies</span>
          </TabsTrigger>
          <TabsTrigger value="balance" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Leave Balance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <LeaveManagement activeTab="requests" />
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <LeaveManagement activeTab="policies" />
        </TabsContent>

        <TabsContent value="balance" className="space-y-4">
          <LeaveManagement activeTab="balance" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
