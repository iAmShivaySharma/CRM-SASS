'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Laptop,
  Users,
  Settings,
  Plus,
  Download,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  Wrench
} from 'lucide-react'
import { AssetManagement } from '@/components/hr/AssetManagement'
import { useAppSelector } from '@/lib/hooks'

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState('inventory')
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  // Mock data for asset stats - would be workspace-specific in real implementation
  const stats = {
    totalAssets: 127,
    availableAssets: 23,
    allocatedAssets: 89,
    maintenanceAssets: 12,
    retiredAssets: 3,
    totalValue: 285000,
    avgAssetAge: 2.3,
    upcomingMaintenance: 8,
    workspaceId: currentWorkspace?.id,
    categories: [
      { name: 'Laptops', count: 45, value: 112500, allocated: 38 },
      { name: 'Monitors', count: 32, value: 19200, allocated: 28 },
      { name: 'Phones', count: 28, value: 28000, allocated: 25 },
      { name: 'Furniture', count: 15, value: 22500, allocated: 12 },
      { name: 'Vehicles', count: 7, value: 102800, allocated: 6 }
    ]
  }

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">Please select a workspace to view assets.</p>
        </div>
      </div>
    )
  }

  const getUtilizationColor = (allocated: number, total: number) => {
    const percentage = (allocated / total) * 100
    if (percentage > 80) return 'text-red-600'
    if (percentage > 60) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
          <p className="text-muted-foreground">
            Manage company assets and allocations for {currentWorkspace.name}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Inventory
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssets}</div>
            <p className="text-xs text-muted-foreground">
              {stats.availableAssets} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allocated</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.allocatedAssets}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.allocatedAssets / stats.totalAssets) * 100)}% utilization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalValue / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground">
              Current portfolio value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Due</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.upcomingMaintenance}</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Status Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asset Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats.availableAssets}</span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round((stats.availableAssets / stats.totalAssets) * 100)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Allocated</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats.allocatedAssets}</span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round((stats.allocatedAssets / stats.totalAssets) * 100)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Maintenance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats.maintenanceAssets}</span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round((stats.maintenanceAssets / stats.totalAssets) * 100)}%)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span className="text-sm">Retired</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{stats.retiredAssets}</span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round((stats.retiredAssets / stats.totalAssets) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.categories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className={`font-medium ${getUtilizationColor(category.allocated, category.count)}`}>
                      {category.allocated}/{category.count}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Utilization: {Math.round((category.allocated / category.count) * 100)}%</span>
                    <span>Value: ${(category.value / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(category.allocated / category.count) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Health and Alerts */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="font-medium text-yellow-600">{stats.upcomingMaintenance} maintenance due</div>
              <div className="text-muted-foreground">Next 30 days</div>
            </div>
            <div className="text-sm">
              <div className="font-medium text-red-600">3 warranties expiring</div>
              <div className="text-muted-foreground">Next 60 days</div>
            </div>
            <div className="text-sm">
              <div className="font-medium text-blue-600">5 assets overdue return</div>
              <div className="text-muted-foreground">Past expected date</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="font-medium">{stats.avgAssetAge} years</div>
              <div className="text-muted-foreground">Average asset age</div>
            </div>
            <div className="text-sm">
              <div className="font-medium text-green-600">94%</div>
              <div className="text-muted-foreground">Asset availability rate</div>
            </div>
            <div className="text-sm">
              <div className="font-medium text-blue-600">87%</div>
              <div className="text-muted-foreground">On-time maintenance completion</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span>Upcoming</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <div className="font-medium">12 assets</div>
              <div className="text-muted-foreground">Expected returns this week</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">6 new purchases</div>
              <div className="text-muted-foreground">Delivery scheduled</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">4 retirements</div>
              <div className="text-muted-foreground">End of lifecycle</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory" className="flex items-center space-x-2">
            <Laptop className="h-4 w-4" />
            <span>Asset Inventory</span>
          </TabsTrigger>
          <TabsTrigger value="allocations" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Allocations</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center space-x-2">
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