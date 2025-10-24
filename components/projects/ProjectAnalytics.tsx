'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Activity,
  Target,
} from 'lucide-react'
import type { Task, ProjectMember, Document } from '@/lib/api/projectsApi'

interface ProjectAnalyticsProps {
  tasks: Task[]
  members: ProjectMember[]
  documents: Document[]
  project: any
}

export function ProjectAnalytics({ tasks, members, documents, project }: ProjectAnalyticsProps) {
  // Calculate task statistics
  const taskStats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => t.completed).length
    const inProgress = tasks.filter(t => !t.completed && t.assigneeId).length
    const unassigned = tasks.filter(t => !t.assigneeId).length
    const overdue = tasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < new Date() && !t.completed
    ).length

    return {
      total,
      completed,
      inProgress,
      unassigned,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [tasks])

  // Task status distribution for pie chart
  const taskStatusData = [
    { name: 'Completed', value: taskStats.completed, fill: '#22c55e' },
    { name: 'In Progress', value: taskStats.inProgress, fill: '#3b82f6' },
    { name: 'Unassigned', value: taskStats.unassigned, fill: '#f59e0b' },
    { name: 'Overdue', value: taskStats.overdue, fill: '#ef4444' },
  ].filter(item => item.value > 0)

  // Priority distribution
  const priorityData = useMemo(() => {
    const priorities = ['low', 'medium', 'high', 'urgent']
    return priorities.map(priority => ({
      priority,
      count: tasks.filter(t => t.priority === priority).length,
    }))
  }, [tasks])

  // Progress over time (simulated data based on task creation dates)
  const progressData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split('T')[0]
    })

    return last7Days.map(date => {
      const tasksCompletedOnDate = tasks.filter(t =>
        t.completedAt && t.completedAt.split('T')[0] === date
      ).length

      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        completed: tasksCompletedOnDate,
      }
    })
  }, [tasks])

  // Team contribution
  const memberContribution = useMemo(() => {
    return members.map(member => {
      const memberTasks = tasks.filter(t => t.assigneeId === member.userId)
      const completedTasks = memberTasks.filter(t => t.completed).length

      return {
        name: member.user?.fullName?.split(' ')[0] || 'Unknown',
        tasks: memberTasks.length,
        completed: completedTasks,
        completion: memberTasks.length > 0 ? Math.round((completedTasks / memberTasks.length) * 100) : 0,
      }
    }).filter(m => m.tasks > 0)
  }, [tasks, members])

  const chartConfig = {
    completed: {
      label: 'Completed',
      color: '#22c55e',
    },
    inProgress: {
      label: 'In Progress',
      color: '#3b82f6',
    },
    tasks: {
      label: 'Tasks',
      color: '#8b5cf6',
    },
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {taskStats.completed} of {taskStats.total} tasks completed
            </p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-green-500 rounded-full transition-all"
                style={{ width: `${taskStats.completionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              {members.filter(m => m.status === 'active').length} active members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{taskStats.overdue}</div>
            <p className="text-xs text-muted-foreground">
              Need immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <p className="text-xs text-muted-foreground">
              Project documentation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Task Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
            <CardDescription>Current status of all project tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Priority</CardTitle>
            <CardDescription>Tasks grouped by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="priority"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Progress Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Progress</CardTitle>
            <CardDescription>Tasks completed over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.3}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Team Contribution */}
        <Card>
          <CardHeader>
            <CardTitle>Team Contribution</CardTitle>
            <CardDescription>Task completion by team members</CardDescription>
          </CardHeader>
          <CardContent>
            {memberContribution.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={memberContribution} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 12 }}
                      width={80}
                    />
                    <Bar dataKey="completed" fill="#22c55e" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="tasks" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No assigned tasks yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Project Insights</CardTitle>
          <CardDescription>Key metrics and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {taskStats.completionRate >= 80 && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Great Progress!</p>
                  <p className="text-sm text-green-700">Project is on track with {taskStats.completionRate}% completion</p>
                </div>
              </div>
            )}

            {taskStats.overdue > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Attention Needed</p>
                  <p className="text-sm text-red-700">{taskStats.overdue} tasks are overdue</p>
                </div>
              </div>
            )}

            {taskStats.unassigned > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">Assignment Needed</p>
                  <p className="text-sm text-orange-700">{taskStats.unassigned} tasks need assignment</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}