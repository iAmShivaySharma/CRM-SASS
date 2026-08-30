'use client'

import { useState } from 'react'
import { Plus, Search, Edit, Trash2, MoreVertical, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  type FmcgProductRecord,
} from '@/lib/api/fmcgApi'

const CATEGORIES = ['beverages', 'snacks', 'dairy', 'spices', 'bakery', 'condiments', 'other']
const ALLERGENS = ['milk', 'nuts', 'gluten', 'soy', 'egg', 'fish', 'shellfish', 'wheat']
const WEIGHT_UNITS = ['g', 'kg', 'ml', 'l', 'units']

interface ProductListProps {
  workspaceId: string
}

const emptyForm = {
  name: '',
  sku: '',
  hsnCode: '',
  fssaiProductCode: '',
  category: '',
  subCategory: '',
  description: '',
  ingredients: '',
  allergens: [] as string[],
  netWeight: '',
  weightUnit: 'g',
  shelfLife: '',
  storageConditions: '',
  mrp: '',
  manufacturerName: '',
  manufacturerAddress: '',
  brandName: '',
  countryOfOrigin: 'India',
  isActive: true,
}

export function ProductList({ workspaceId }: ProductListProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<FmcgProductRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetProductsQuery({
    workspaceId,
    page,
    limit: 20,
    search: search || undefined,
    category: categoryFilter || undefined,
  })

  const [createProduct, { isLoading: creating }] = useCreateProductMutation()
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation()
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation()

  const products = data?.products || []
  const pagination = data?.pagination

  function openCreate() {
    setEditingProduct(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(product: FmcgProductRecord) {
    setEditingProduct(product)
    setForm({
      name: product.name,
      sku: product.sku,
      hsnCode: product.hsnCode || '',
      fssaiProductCode: product.fssaiProductCode || '',
      category: product.category,
      subCategory: product.subCategory || '',
      description: product.description || '',
      ingredients: product.ingredients || '',
      allergens: product.allergens || [],
      netWeight: product.netWeight?.toString() || '',
      weightUnit: product.weightUnit,
      shelfLife: product.shelfLife?.toString() || '',
      storageConditions: product.storageConditions || '',
      mrp: product.mrp?.toString() || '',
      manufacturerName: product.manufacturerName,
      manufacturerAddress: product.manufacturerAddress,
      brandName: product.brandName || '',
      countryOfOrigin: product.countryOfOrigin,
      isActive: product.isActive,
    })
    setSheetOpen(true)
  }

  function toggleAllergen(allergen: string) {
    setForm(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      workspaceId,
      name: form.name,
      sku: form.sku,
      hsnCode: form.hsnCode || undefined,
      fssaiProductCode: form.fssaiProductCode || undefined,
      category: form.category,
      subCategory: form.subCategory || undefined,
      description: form.description || undefined,
      ingredients: form.ingredients || undefined,
      allergens: form.allergens,
      netWeight: form.netWeight ? parseFloat(form.netWeight) : undefined,
      weightUnit: form.weightUnit as any,
      shelfLife: form.shelfLife ? parseInt(form.shelfLife) : undefined,
      storageConditions: form.storageConditions || undefined,
      mrp: form.mrp ? parseFloat(form.mrp) : undefined,
      manufacturerName: form.manufacturerName,
      manufacturerAddress: form.manufacturerAddress,
      brandName: form.brandName || undefined,
      countryOfOrigin: form.countryOfOrigin,
      isActive: form.isActive,
    }

    try {
      if (editingProduct) {
        await updateProduct({ id: editingProduct._id, ...payload }).unwrap()
        toast.success('Product updated successfully')
      } else {
        await createProduct(payload).unwrap()
        toast.success('Product created successfully')
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save product')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteProduct({ id: deleteId, workspaceId }).unwrap()
      toast.success('Product deleted successfully')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete product')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-8"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <Select value={categoryFilter || 'all'} onValueChange={v => { setCategoryFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Shelf Life</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map(product => (
                <TableRow key={product._id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      {product.brandName && (
                        <div className="text-xs text-muted-foreground">{product.brandName}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell>
                    <span className="capitalize">{product.category}</span>
                    {product.subCategory && (
                      <div className="text-xs text-muted-foreground">{product.subCategory}</div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate">{product.manufacturerName}</TableCell>
                  <TableCell>
                    {product.shelfLife ? `${product.shelfLife} days` : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {product.isActive ? (
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Active</Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground hover:bg-muted">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(product)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(product._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {products.length} of {pagination.total} products</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={e => setForm(p => ({ ...p, sku: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="hsnCode">HSN Code</Label>
                <Input
                  id="hsnCode"
                  value={form.hsnCode}
                  onChange={e => setForm(p => ({ ...p, hsnCode: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fssaiProductCode">FSSAI Product Code</Label>
                <Input
                  id="fssaiProductCode"
                  value={form.fssaiProductCode}
                  onChange={e => setForm(p => ({ ...p, fssaiProductCode: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subCategory">Sub-Category</Label>
                <Input
                  id="subCategory"
                  value={form.subCategory}
                  onChange={e => setForm(p => ({ ...p, subCategory: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                value={form.brandName}
                onChange={e => setForm(p => ({ ...p, brandName: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ingredients">Ingredients (FSSAI Declaration)</Label>
              <Textarea
                id="ingredients"
                value={form.ingredients}
                onChange={e => setForm(p => ({ ...p, ingredients: e.target.value }))}
                rows={4}
                maxLength={5000}
              />
            </div>

            <div className="space-y-2">
              <Label>Allergens</Label>
              <div className="grid grid-cols-4 gap-2">
                {ALLERGENS.map(a => (
                  <div key={a} className="flex items-center space-x-2">
                    <Checkbox
                      id={`allergen-${a}`}
                      checked={form.allergens.includes(a)}
                      onCheckedChange={() => toggleAllergen(a)}
                    />
                    <label htmlFor={`allergen-${a}`} className="text-sm capitalize cursor-pointer">{a}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="netWeight">Net Weight</Label>
                <Input
                  id="netWeight"
                  type="number"
                  value={form.netWeight}
                  onChange={e => setForm(p => ({ ...p, netWeight: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={form.weightUnit} onValueChange={v => setForm(p => ({ ...p, weightUnit: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEIGHT_UNITS.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shelfLife">Shelf Life (days)</Label>
                <Input
                  id="shelfLife"
                  type="number"
                  value={form.shelfLife}
                  onChange={e => setForm(p => ({ ...p, shelfLife: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mrp">MRP (₹)</Label>
                <Input
                  id="mrp"
                  type="number"
                  step="0.01"
                  value={form.mrp}
                  onChange={e => setForm(p => ({ ...p, mrp: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="countryOfOrigin">Country of Origin</Label>
                <Input
                  id="countryOfOrigin"
                  value={form.countryOfOrigin}
                  onChange={e => setForm(p => ({ ...p, countryOfOrigin: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="storageConditions">Storage Conditions</Label>
              <Input
                id="storageConditions"
                value={form.storageConditions}
                onChange={e => setForm(p => ({ ...p, storageConditions: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="manufacturerName">Manufacturer Name *</Label>
              <Input
                id="manufacturerName"
                value={form.manufacturerName}
                onChange={e => setForm(p => ({ ...p, manufacturerName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="manufacturerAddress">Manufacturer Address *</Label>
              <Textarea
                id="manufacturerAddress"
                value={form.manufacturerAddress}
                onChange={e => setForm(p => ({ ...p, manufacturerAddress: e.target.value }))}
                rows={2}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={form.isActive}
                onCheckedChange={checked => setForm(p => ({ ...p, isActive: !!checked }))}
              />
              <label htmlFor="isActive" className="text-sm cursor-pointer">Active</label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || updating}>
                {(creating || updating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingProduct ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this product. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
