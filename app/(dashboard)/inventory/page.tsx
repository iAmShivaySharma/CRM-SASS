'use client'

import { useAppSelector } from '@/lib/hooks'
import { Loader2, Boxes } from 'lucide-react'
import { useGetProductsQuery, useGetLowStockQuery } from '@/lib/api/inventoryApi'

export default function InventoryPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const { data: productsData, isLoading: productsLoading } = useGetProductsQuery(
    { workspaceId: currentWorkspace?._id ?? '' },
    { skip: !currentWorkspace }
  )

  const { data: lowStockData, isLoading: lowStockLoading } = useGetLowStockQuery(
    { workspaceId: currentWorkspace?._id ?? '' },
    { skip: !currentWorkspace }
  )

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Boxes className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Inventory</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Products</h2>
          {productsLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {(productsData?.products ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No products yet.</p>
              ) : (
                (productsData?.products ?? []).map(p => (
                  <div key={p._id} className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{p.stockQuantity} {p.unit ?? 'units'}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Low Stock Alerts</h2>
          {lowStockLoading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {(lowStockData?.products ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No low stock items.</p>
              ) : (
                (lowStockData?.products ?? []).map(p => (
                  <div key={p._id} className="flex items-center justify-between rounded-lg bg-destructive/10 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-destructive">{p.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>
                    </div>
                    <span className="text-sm font-medium text-destructive">{p.stockQuantity} left</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
