'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, UserCog, UserPlus, Shield, Building } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { EmployeeList } from '@/components/hr/EmployeeList'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetWorkspaceMembersQuery,
  useGetRolesQuery,
} from '@/lib/api/mongoApi'
import { usePermissions, Permission } from '@/hooks/usePermissions'
import { AccessDenied } from '@/components/ui/access-denied'

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState('list')
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const router = useRouter()

  const { data: membersData } = useGetWorkspaceMembersQuery(
    currentWorkspace?.id || '',
    { skip: !currentWorkspace?.id }
  )

  const { data: rolesData } = useGetRolesQuery(currentWorkspace?.id || '', {
    skip: !currentWorkspace?.id,
  })

  const members = membersData?.members || []
  const roles = rolesData?.roles || []
  const totalEmployees = members.length
  const activeEmployees = members.filter(
    (m: any) => m.status === 'active'
  ).length

  const { hasPermission, isLoading: permissionsLoading } = usePermissions()

  if (!permissionsLoading && !hasPermission(Permission.MEMBERS_VIEW)) {
    return <AccessDenied />
  }

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">
            Please select a workspace to view employees.
          </p>
        </div>
      </div>
    )
  }

  const renderRolesAndPermissions = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Roles & Permissions</h3>
          <p className="text-sm text-muted-foreground">
            Manage employee roles and access permissions
          </p>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roles.length > 0 ? (
          roles.map((role: any) => (
            <Card key={role.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Shield className="h-4 w-4" />
                    <span>{role.name}</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {role.description || 'No description'}
                </p>

                <div>
                  <h4 className="mb-2 text-sm font-medium">Permissions:</h4>
                  <div className="flex flex-wrap gap-1">
                    {(role.permissions || []).slice(0, 5).map((p: string) => (
                      <span
                        key={p}
                        className="rounded bg-muted px-2 py-1 text-xs text-foreground"
                      >
                        {p}
                      </span>
                    ))}
                    {role.permissions?.length > 5 && (
                      <span className="rounded bg-muted px-2 py-1 text-xs text-foreground">
                        +{role.permissions.length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      router.push('/roles')
                    }}
                  >
                    Edit Role
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="col-span-full text-sm text-muted-foreground">
            No roles configured yet.
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Employee Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage employees and roles for {currentWorkspace.name}
          </p>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {activeEmployees} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeEmployees}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalEmployees > 0
                ? Math.round((activeEmployees / totalEmployees) * 100)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">Configured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspace</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="truncate text-2xl font-bold">
              {currentWorkspace.name}
            </div>
            <p className="text-xs text-muted-foreground">Current workspace</p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
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
