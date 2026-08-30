'use client'

import { useState } from 'react'
import {
  Package,
  Layers,
  Shield,
  FlaskConical,
  Download,
  Loader2,
  Truck,
  MapPin,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetProductsQuery,
  useGetBatchesQuery,
  useGetLicensesQuery,
  useGetTestReportsQuery,
  useGetSuppliersQuery,
  useGetDistributionsQuery,
  useLazyExportFssaiDataQuery,
} from '@/lib/api/fmcgApi'
import { ProductList } from '@/components/fmcg/ProductList'
import { BatchList } from '@/components/fmcg/BatchList'
import { FssaiLicenseList } from '@/components/fmcg/FssaiLicenseList'
import { TestReportList } from '@/components/fmcg/TestReportList'
import { SupplierList } from '@/components/fmcg/SupplierList'
import { DistributionList } from '@/components/fmcg/DistributionList'

export default function FmcgPage() {
  const [activeTab, setActiveTab] = useState('products')
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const workspaceId = currentWorkspace?.id || ''

  const { data: productsData } = useGetProductsQuery({ workspaceId, limit: 1 }, { skip: !workspaceId })
  const { data: batchesData } = useGetBatchesQuery({ workspaceId, limit: 1, status: 'active' }, { skip: !workspaceId })
  const { data: licensesData } = useGetLicensesQuery({ workspaceId, limit: 1 }, { skip: !workspaceId })
  const { data: pendingQcData } = useGetBatchesQuery({ workspaceId, limit: 1, qcStatus: 'pending' }, { skip: !workspaceId })
  const { data: suppliersData } = useGetSuppliersQuery({ workspaceId, limit: 1, approvalStatus: 'approved' }, { skip: !workspaceId })
  const { data: distributionsData } = useGetDistributionsQuery({ workspaceId, limit: 1, status: 'dispatched' }, { skip: !workspaceId })

  const [triggerExport, { isFetching: exporting }] = useLazyExportFssaiDataQuery()

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">Please select a workspace to manage FMCG data.</p>
        </div>
      </div>
    )
  }

  async function handleExport() {
    try {
      const result = await triggerExport({ workspaceId }).unwrap()
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fssai-export-${currentWorkspace.name}-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('FSSAI data exported successfully')
    } catch {
      toast.error('Failed to export FSSAI data')
    }
  }

  const totalProducts = productsData?.pagination?.total || 0
  const activeBatches = batchesData?.pagination?.total || 0
  const totalLicenses = licensesData?.pagination?.total || 0
  const pendingQc = pendingQcData?.pagination?.total || 0
  const approvedSuppliers = suppliersData?.pagination?.total || 0
  const dispatchedBatches = distributionsData?.pagination?.total || 0

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FMCG Brand Management</h1>
          <p className="text-muted-foreground">
            Manage products, batches, FSSAI licenses and test reports for {currentWorkspace.name}
          </p>
        </div>
        <Button onClick={handleExport} disabled={exporting} variant="outline" size="sm">
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export for FSSAI
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">Registered products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBatches}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FSSAI Licenses</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLicenses}</div>
            <p className="text-xs text-muted-foreground">Total licenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending QC</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingQc}</div>
            <p className="text-xs text-muted-foreground">Awaiting quality check</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Suppliers</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedSuppliers}</div>
            <p className="text-xs text-muted-foreground">Approved suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispatched Batches</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dispatchedBatches}</div>
            <p className="text-xs text-muted-foreground">Currently dispatched</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>Products</span>
          </TabsTrigger>
          <TabsTrigger value="batches" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>Batches</span>
          </TabsTrigger>
          <TabsTrigger value="licenses" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Licenses</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            <span>Test Reports</span>
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span>Suppliers</span>
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Distribution</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <ProductList workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="batches" className="space-y-4">
          <BatchList workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="licenses" className="space-y-4">
          <FssaiLicenseList workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <TestReportList workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <SupplierList workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <DistributionList workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
