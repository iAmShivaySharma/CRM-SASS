'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Clock,
  Calendar,
  UserCheck,
  UserX,
  Plus,
  Download,
  Laptop,
  User,
  ArrowRight,
  Building,
  ChevronRight,
  Loader2
} from 'lucide-react'
import { AttendanceWidget } from '@/components/attendance/AttendanceWidget'
import { useAppSelector } from '@/lib/hooks'
import { useRouter } from 'next/navigation'

interface HRStats {
  totalEmployees: number
  presentToday: number
  absentToday: number
  lateToday: number
  attendanceRate: number
  pendingLeaves: number
  totalAssets: number
  availableAssets: number
}

export default function HRPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const router = useRouter()
  const [stats, setStats] = useState<HRStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!currentWorkspace?.id) return
    try {
      setLoading(true)
      const res = await fetch(`/api/hr/stats?workspaceId=${currentWorkspace.id}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch HR stats:', error)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace?.id])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

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

  const displayStats = stats || {
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    attendanceRate: 0,
    pendingLeaves: 0,
    totalAssets: 0,
    availableAssets: 0
  }

  const hrModules = [
    {
      name: 'Attendance Management',
      description: 'Track employee attendance, work hours, and time management',
      icon: Clock,
      href: '/attendance',
      stats: [
        { label: 'Present Today', value: displayStats.presentToday, color: 'text-green-600' },
        { label: 'Attendance Rate', value: `${displayStats.attendanceRate}%`, color: getStatusColor('rate', displayStats.attendanceRate) }
      ],
      actions: ['View Live Tracking', 'Generate Reports', 'Manage Shifts']
    },
    {
      name: 'Employee Management',
      description: 'Manage employee profiles, roles, and permissions',
      icon: User,
      href: '/employees',
      stats: [
        { label: 'Total Employees', value: displayStats.totalEmployees, color: 'text-blue-600' },
        { label: 'Active', value: displayStats.totalEmployees, color: 'text-green-600' }
      ],
      actions: ['Add Employee', 'Manage Roles', 'Employee Directory']
    },
    {
      name: 'Leave Management',
      description: 'Handle leave requests, policies, and employee balances',
      icon: Calendar,
      href: '/leaves',
      stats: [
        { label: 'Pending Requests', value: displayStats.pendingLeaves, color: 'text-yellow-600' },
        { label: 'Approved This Month', value: '-', color: 'text-green-600' }
      ],
      actions: ['Review Requests', 'Leave Policies', 'Balance Reports']
    },
    {
      name: 'Asset Management',
      description: 'Track company assets, allocations, and maintenance',
      icon: Laptop,
      href: '/assets',
      stats: [
        { label: 'Total Assets', value: displayStats.totalAssets, color: 'text-blue-600' },
        { label: 'Available', value: displayStats.availableAssets, color: 'text-green-600' }
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
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Human Resources</h1>
          <p className="mt-1 text-muted-foreground">
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
      <div className="grid w-full grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.totalEmployees}
            </div>
            <p className="text-xs text-muted-foreground">Active workforce</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.presentToday}
            </div>
            <p className="text-xs text-muted-foreground">
              {displayStats.totalEmployees > 0
                ? `${Math.round((displayStats.presentToday / displayStats.totalEmployees) * 100)}% attendance rate`
                : '0% attendance rate'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.pendingLeaves}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Assets</CardTitle>
            <Laptop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.availableAssets}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of {displayStats.totalAssets} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Quick Overview */}
      <div className="grid w-full grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
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
                    <div className="text-2xl font-bold text-green-600">{displayStats.presentToday}</div>
                    <div className="text-sm text-muted-foreground">Present</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{displayStats.absentToday}</div>
                    <div className="text-sm text-muted-foreground">Absent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{displayStats.lateToday}</div>
                    <div className="text-sm text-muted-foreground">Late</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Attendance Rate</span>
                    <span className={getStatusColor('rate', displayStats.attendanceRate)}>
                      {displayStats.attendanceRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${displayStats.attendanceRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* HR Modules */}
      <div className="w-full">
        <h2 className="text-xl font-semibold mb-4">HR Modules</h2>
        <div className="grid w-full grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
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
                      <div key={index} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
                        <span key={action} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
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
