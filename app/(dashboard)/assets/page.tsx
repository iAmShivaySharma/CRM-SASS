'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Laptop,
  Users,
  Settings,
  Plus,
  Download,
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Calendar,
  Wrench,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { AssetManagement } from '@/components/hr/AssetManagement'
import { useAppSelector } from '@/lib/hooks'

interface AssetStats {
  totalAssets: number
  byStatus: Array<{ _id: string; count: number }>
  totalValue: number
  byCategory: Array<{ _id: string; count: number; totalValue: number }>
  upcomingMaintenance: number
  overdueReturns: number
}

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState('inventory')
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [stats, setStats] = useState<AssetStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!currentWorkspace?.id) return
    try {
      setLoading(true)
      const res = await fetch(
        `/api/assets/stats?workspaceId=${currentWorkspace.id}`
      )
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch asset stats:', error)
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace?.id])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const getStatusCount = (status: string) => {
    return stats?.byStatus?.find(s => s._id === status)?.count || 0
  }

  const availableAssets = getStatusCount('available')
  const allocatedAssets = getStatusCount('allocated')
  const maintenanceAssets = getStatusCount('maintenance')
  const retiredAssets = getStatusCount('retired')
  const totalAssets = stats?.totalAssets || 0
  const totalValue = stats?.totalValue || 0

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">
            Please select a workspace to view assets.
          </p>
        </div>
      </div>
    )
  }

  const getUtilizationColor = (allocated: number, total: number) => {
    if (total === 0) return 'text-gray-600'
    const percentage = (allocated / total) * 100
    if (percentage > 80) return 'text-red-600'
    if (percentage > 60) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Asset Management
          </h1>
          <p className="text-muted-foreground">
            Manage company assets and allocations for {currentWorkspace.name}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Inventory
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                totalAssets
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {availableAssets} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allocated</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                allocatedAssets
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalAssets > 0
                ? Math.round((allocatedAssets / totalAssets) * 100)
                : 0}
              % utilization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                `$${(totalValue / 1000).toFixed(0)}K`
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Current portfolio value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Maintenance Due
            </CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.upcomingMaintenance || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asset Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  label: 'Available',
                  count: availableAssets,
                  color: 'bg-green-500',
                },
                {
                  label: 'Allocated',
                  count: allocatedAssets,
                  color: 'bg-blue-500',
                },
                {
                  label: 'Maintenance',
                  count: maintenanceAssets,
                  color: 'bg-yellow-500',
                },
                {
                  label: 'Retired',
                  count: retiredAssets,
                  color: 'bg-gray-500',
                },
              ].map(item => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 ${item.color} rounded-full`}></div>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{item.count}</span>
                    <span className="text-xs text-muted-foreground">
                      (
                      {totalAssets > 0
                        ? Math.round((item.count / totalAssets) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.byCategory || []).map(category => (
                <div key={category._id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium capitalize">
                      {category._id}
                    </span>
                    <span className="font-medium">{category.count}</span>
                  </div>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>
                      Value: ${(category.totalValue / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${totalAssets > 0 ? (category.count / totalAssets) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {(!stats?.byCategory || stats.byCategory.length === 0) &&
                !loading && (
                  <p className="text-sm text-muted-foreground">
                    No assets registered yet.
                  </p>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="font-medium text-yellow-600">
                {stats?.upcomingMaintenance || 0} maintenance due
              </div>
              <div className="text-muted-foreground">Next 30 days</div>
            </div>
            <div className="text-sm">
              <div className="font-medium text-red-600">
                {stats?.overdueReturns || 0} overdue returns
              </div>
              <div className="text-muted-foreground">Past expected date</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="font-medium text-green-600">
                {totalAssets > 0
                  ? Math.round((availableAssets / totalAssets) * 100)
                  : 0}
                %
              </div>
              <div className="text-muted-foreground">
                Asset availability rate
              </div>
            </div>
            <div className="text-sm">
              <div className="font-medium text-blue-600">
                {totalAssets > 0
                  ? Math.round((allocatedAssets / totalAssets) * 100)
                  : 0}
                %
              </div>
              <div className="text-muted-foreground">Utilization rate</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span>Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="font-medium">{totalAssets} total assets</div>
              <div className="text-muted-foreground">In the system</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">${totalValue.toLocaleString()}</div>
              <div className="text-muted-foreground">Total portfolio value</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="inventory"
            className="flex items-center space-x-2"
          >
            <Laptop className="h-4 w-4" />
            <span>Asset Inventory</span>
          </TabsTrigger>
          <TabsTrigger
            value="allocations"
            className="flex items-center space-x-2"
          >
            <Users className="h-4 w-4" />
            <span>Allocations</span>
          </TabsTrigger>
          <TabsTrigger
            value="maintenance"
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Maintenance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <AssetManagement activeTab="inventory" />
        </TabsContent>

        <TabsContent value="allocations" className="space-y-4">
          <AssetManagement activeTab="allocations" />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <AssetManagement activeTab="maintenance" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
