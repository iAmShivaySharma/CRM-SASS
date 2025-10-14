'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Users,
  UserCog,
  Plus,
  Download,
  UserPlus,
  Shield,
  Building,
  TrendingUp
} from 'lucide-react'
import { EmployeeList } from '@/components/hr/EmployeeList'
import { useAppSelector } from '@/lib/hooks'

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState('list')
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  // Mock data for employee stats - would be workspace-specific in real implementation
  const stats = {
    totalEmployees: 45,
    activeEmployees: 42,
    newThisMonth: 3,
    departments: [
      { name: 'Engineering', count: 15, growth: '+2' },
      { name: 'Sales', count: 12, growth: '+1' },
      { name: 'Marketing', count: 8, growth: '0' },
      { name: 'HR', count: 5, growth: '0' },
      { name: 'Product', count: 7, growth: '0' }
    ],
    workspaceId: currentWorkspace?.id
  }

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">Please select a workspace to view employees.</p>
        </div>
      </div>
    )
  }

  const renderRolesAndPermissions = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Roles & Permissions</h3>
          <p className="text-sm text-muted-foreground">Manage employee roles and access permissions</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[
          {
            name: 'Administrator',
            description: 'Full access to all features and settings',
            employees: 2,
            permissions: ['Full Access', 'User Management', 'Settings'],
            color: 'bg-red-100 text-red-800'
          },
          {
            name: 'HR Manager',
            description: 'Manage employee data and HR processes',
            employees: 3,
            permissions: ['Employee Management', 'Attendance', 'Leave Management'],
            color: 'bg-blue-100 text-blue-800'
          },
          {
            name: 'Team Lead',
            description: 'Lead team members and manage projects',
            employees: 8,
            permissions: ['Team Management', 'Project Access', 'Reports'],
            color: 'bg-green-100 text-green-800'
          },
          {
            name: 'Employee',
            description: 'Standard employee access',
            employees: 32,
            permissions: ['Self Service', 'Time Tracking', 'Basic Access'],
            color: 'bg-gray-100 text-gray-800'
          }
        ].map((role) => (
          <Card key={role.name} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>{role.name}</span>
                </CardTitle>
                <span className={`px-2 py-1 text-xs rounded-full ${role.color}`}>
                  {role.employees} users
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{role.description}</p>

              <div>
                <h4 className="text-sm font-medium mb-2">Permissions:</h4>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <Button variant="outline" size="sm">
                  Edit Role
                </Button>
                <Button variant="ghost" size="sm">
                  View Users
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage employees and roles for {currentWorkspace.name}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export List
          </Button>
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeEmployees} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.newThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              +{Math.round((stats.newThisMonth / stats.totalEmployees) * 100)}% growth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.departments.length}</div>
            <p className="text-xs text-muted-foreground">
              Across organization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Largest Department</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.departments[0].count}</div>
            <p className="text-xs text-muted-foreground">
              {stats.departments[0].name}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Department Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Department Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {stats.departments.map((dept) => (
              <div key={dept.name} className="text-center p-4 rounded-lg bg-gray-50">
                <div className="text-2xl font-bold">{dept.count}</div>
                <div className="text-sm font-medium">{dept.name}</div>
                <div className="text-xs text-muted-foreground">
                  {dept.growth !== '0' ? `${dept.growth} this month` : 'No change'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Employee List</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center space-x-2">
            <UserCog className="h-4 w-4" />
            <span>Roles & Permissions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <EmployeeList />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          {renderRolesAndPermissions()}
        </TabsContent>
      </Tabs>
    </div>
  )
}