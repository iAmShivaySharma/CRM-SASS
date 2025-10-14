'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Clock,
  Calendar,
  TrendingUp,
  UserCheck,
  UserX,
  Timer,
  Target,
  BarChart3,
  Plus,
  Download,
  Laptop,
  User,
  ArrowRight,
  Building,
  ChevronRight
} from 'lucide-react'
import { AttendanceWidget } from '@/components/attendance/AttendanceWidget'
import { useAppSelector } from '@/lib/hooks'
import { useRouter } from 'next/navigation'

export default function HRPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const router = useRouter()

  // Mock data for dashboard stats - would be workspace-specific in real implementation
  const stats = {
    totalEmployees: 45,
    presentToday: 38,
    absentToday: 7,
    lateToday: 3,
    avgWorkHours: 7.8,
    totalWorkHours: 1564,
    attendanceRate: 84.4,
    pendingLeaves: 8,
    totalAssets: 127,
    availableAssets: 23,
    workspaceId: currentWorkspace?.id
  }

  const getStatusColor = (status: string, value: number) => {
    switch (status) {
      case 'present':
        return value > 85 ? 'text-green-600' : value > 70 ? 'text-yellow-600' : 'text-red-600'
      case 'absent':
        return value > 15 ? 'text-red-600' : value > 10 ? 'text-yellow-600' : 'text-green-600'
      case 'rate':
        return value > 90 ? 'text-green-600' : value > 80 ? 'text-yellow-600' : 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const hrModules = [
    {
      name: 'Attendance Management',
      description: 'Track employee attendance, work hours, and time management',
      icon: Clock,
      href: '/attendance',
      stats: [
        { label: 'Present Today', value: stats.presentToday, color: 'text-green-600' },
        { label: 'Attendance Rate', value: `${stats.attendanceRate}%`, color: getStatusColor('rate', stats.attendanceRate) }
      ],
      actions: ['View Live Tracking', 'Generate Reports', 'Manage Shifts']
    },
    {
      name: 'Employee Management',
      description: 'Manage employee profiles, roles, and permissions',
      icon: User,
      href: '/employees',
      stats: [
        { label: 'Total Employees', value: stats.totalEmployees, color: 'text-blue-600' },
        { label: 'Active', value: stats.totalEmployees - 3, color: 'text-green-600' }
      ],
      actions: ['Add Employee', 'Manage Roles', 'Employee Directory']
    },
    {
      name: 'Leave Management',
      description: 'Handle leave requests, policies, and employee balances',
      icon: Calendar,
      href: '/leaves',
      stats: [
        { label: 'Pending Requests', value: stats.pendingLeaves, color: 'text-yellow-600' },
        { label: 'Approved This Month', value: 23, color: 'text-green-600' }
      ],
      actions: ['Review Requests', 'Leave Policies', 'Balance Reports']
    },
    {
      name: 'Asset Management',
      description: 'Track company assets, allocations, and maintenance',
      icon: Laptop,
      href: '/assets',
      stats: [
        { label: 'Total Assets', value: stats.totalAssets, color: 'text-blue-600' },
        { label: 'Available', value: stats.availableAssets, color: 'text-green-600' }
      ],
      actions: ['Asset Inventory', 'Allocations', 'Maintenance']
    }
  ]

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">Please select a workspace to access HR management.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Human Resources</h1>
          <p className="text-muted-foreground">
            Comprehensive HR management system for {currentWorkspace.name}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm" onClick={() => router.push('/employees')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Active workforce
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.presentToday / stats.totalEmployees) * 100)}% attendance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingLeaves}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Assets</CardTitle>
            <Laptop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.availableAssets}</div>
            <p className="text-xs text-muted-foreground">
              Out of {stats.totalAssets} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Quick Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AttendanceWidget compact={false} showDetails={true} />
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Workspace Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
                    <div className="text-sm text-muted-foreground">Present</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.absentToday}</div>
                    <div className="text-sm text-muted-foreground">Absent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.lateToday}</div>
                    <div className="text-sm text-muted-foreground">Late</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Attendance Rate</span>
                    <span className={getStatusColor('rate', stats.attendanceRate)}>
                      {stats.attendanceRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.attendanceRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* HR Modules */}
      <div>
        <h2 className="text-xl font-semibold mb-4">HR Modules</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {hrModules.map((module) => {
            const Icon = module.icon
            return (
              <Card key={module.name} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => router.push(module.href)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <span className="text-lg">{module.name}</span>
                    </CardTitle>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    {module.stats.map((stat, index) => (
                      <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  <div className="border-t pt-3">
                    <div className="text-xs text-muted-foreground mb-2">Quick Actions:</div>
                    <div className="flex flex-wrap gap-1">
                      {module.actions.map((action) => (
                        <span key={action} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full group-hover:bg-primary group-hover:text-white transition-colors" variant="outline">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Open {module.name}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}