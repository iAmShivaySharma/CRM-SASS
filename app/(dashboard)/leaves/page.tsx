'use client'

import { useState } from 'react'
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
  XCircle,
  Users,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { LeaveManagement } from '@/components/hr/LeaveManagement'
import { useAppSelector } from '@/lib/hooks'

export default function LeavesPage() {
  const [activeTab, setActiveTab] = useState('requests')
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  // Mock data for leave stats - would be workspace-specific in real implementation
  const stats = {
    pendingRequests: 8,
    approvedThisMonth: 23,
    totalLeaveDays: 156,
    averageLeaveBalance: 18.5,
    mostUsedLeaveType: 'Annual Leave',
    upcomingLeaves: 12,
    workspaceId: currentWorkspace?.id,
    leaveTypes: [
      { name: 'Annual Leave', used: 89, total: 200, percentage: 44.5 },
      { name: 'Sick Leave', used: 34, total: 100, percentage: 34 },
      { name: 'Personal Leave', used: 23, total: 75, percentage: 30.7 },
      { name: 'Maternity Leave', used: 10, total: 20, percentage: 50 }
    ]
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
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approvedThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              +15% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leave Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeaveDays}</div>
            <p className="text-xs text-muted-foreground">
              Used this year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Leaves</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.upcomingLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days
            </p>
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
              {stats.leaveTypes.map((type) => (
                <div key={type.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{type.name}</span>
                    <span className="text-muted-foreground">
                      {type.used}/{type.total} days ({type.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${type.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Quick Stats</h4>
              <div className="grid gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.averageLeaveBalance}</div>
                  <div className="text-sm text-blue-800">Average Leave Balance</div>
                  <div className="text-xs text-blue-600">Per employee</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{stats.mostUsedLeaveType}</div>
                  <div className="text-sm text-green-800">Most Used Leave Type</div>
                  <div className="text-xs text-green-600">This year</div>
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