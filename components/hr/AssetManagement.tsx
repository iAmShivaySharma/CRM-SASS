'use client'

import { useState } from 'react'
import {
  Laptop,
  Smartphone,
  Monitor,
  Headphones,
  Car,
  Plus,
  Search,
  Edit,
  Trash2,
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  User,
  Package,
  Settings,
  FileText,
  QrCode,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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
import { useAppSelector } from '@/lib/hooks'
import {
  useGetAssetsQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
  useGetAssetStatsQuery,
  type AssetRecord,
} from '@/lib/api/assetApi'

interface AssetManagementProps {
  activeTab: string
}

export function AssetManagement({ activeTab }: AssetManagementProps) {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [showAssetDialog, setShowAssetDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [assetForm, setAssetForm] = useState({
    name: '',
    category: '',
    brand: '',
    model: '',
    serialNumber: '',
    purchaseDate: undefined as Date | undefined,
    purchasePrice: '',
    condition: 'excellent',
    location: '',
    warrantyProvider: '',
    warrantyExpiry: undefined as Date | undefined,
  })

  // API hooks
  const {
    data: assetsData,
    isLoading,
    error,
  } = useGetAssetsQuery({
    workspaceId: currentWorkspace?.id,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchQuery || undefined,
  })
  const { data: statsData } = useGetAssetStatsQuery({
    workspaceId: currentWorkspace?.id,
  })
  const [createAsset, { isLoading: isCreating }] = useCreateAssetMutation()
  const [updateAsset] = useUpdateAssetMutation()
  const [deleteAsset] = useDeleteAssetMutation()

  const assets = assetsData?.assets || []

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">
            Please select a workspace to manage assets.
          </p>
        </div>
      </div>
    )
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'laptop':
        return <Laptop className="h-4 w-4" />
      case 'desktop':
        return <Monitor className="h-4 w-4" />
      case 'monitor':
        return <Monitor className="h-4 w-4" />
      case 'phone':
        return <Smartphone className="h-4 w-4" />
      case 'accessories':
        return <Headphones className="h-4 w-4" />
      case 'vehicle':
        return <Car className="h-4 w-4" />
      case 'furniture':
        return <Package className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Available
          </Badge>
        )
      case 'allocated':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <User className="mr-1 h-3 w-3" />
            Allocated
          </Badge>
        )
      case 'maintenance':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Settings className="mr-1 h-3 w-3" />
            Maintenance
          </Badge>
        )
      case 'retired':
        return <Badge className="bg-gray-100 text-gray-800">Retired</Badge>
      case 'lost':
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Lost
          </Badge>
        )
      case 'damaged':
        return (
          <Badge className="bg-orange-100 text-orange-800">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Damaged
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'text-green-600'
      case 'good':
        return 'text-blue-600'
      case 'fair':
        return 'text-yellow-600'
      case 'poor':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const handleCreateAsset = async () => {
    if (
      !assetForm.name ||
      !assetForm.category ||
      !assetForm.brand ||
      !assetForm.model ||
      !assetForm.serialNumber ||
      !assetForm.purchaseDate ||
      !assetForm.purchasePrice ||
      !assetForm.location
    ) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await createAsset({
        workspaceId: currentWorkspace.id,
        name: assetForm.name,
        category: assetForm.category,
        brand: assetForm.brand,
        model: assetForm.model,
        serialNumber: assetForm.serialNumber,
        purchaseDate: assetForm.purchaseDate.toISOString(),
        purchasePrice: parseFloat(assetForm.purchasePrice),
        condition: assetForm.condition,
        location: assetForm.location,
        warranty: assetForm.warrantyProvider
          ? {
              provider: assetForm.warrantyProvider,
              expiryDate: assetForm.warrantyExpiry?.toISOString() || '',
            }
          : undefined,
      }).unwrap()

      toast.success('Asset added successfully')
      setShowAssetDialog(false)
      setAssetForm({
        name: '',
        category: '',
        brand: '',
        model: '',
        serialNumber: '',
        purchaseDate: undefined,
        purchasePrice: '',
        condition: 'excellent',
        location: '',
        warrantyProvider: '',
        warrantyExpiry: undefined,
      })
    } catch (error: any) {
      toast.error(error?.data?.error || 'Failed to add asset')
    }
  }

  const handleDeleteAsset = async (id: string) => {
    try {
      await deleteAsset(id).unwrap()
      toast.success('Asset deleted successfully')
    } catch (error: any) {
      toast.error(error?.data?.error || 'Failed to delete asset')
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateAsset({ id, status }).unwrap()
      toast.success(`Asset marked as ${status}`)
    } catch (error: any) {
      toast.error(error?.data?.error || 'Failed to update asset')
    }
  }

  const renderAssetInventory = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Asset Inventory</h3>
          <p className="text-sm text-muted-foreground">
            Manage company assets and equipment
          </p>
        </div>
        <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Asset Name *</Label>
                  <Input
                    value={assetForm.name}
                    onChange={e =>
                      setAssetForm({ ...assetForm, name: e.target.value })
                    }
                    placeholder="Enter asset name"
                  />
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={assetForm.category}
                    onValueChange={value =>
                      setAssetForm({ ...assetForm, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="laptop">Laptop</SelectItem>
                      <SelectItem value="desktop">Desktop</SelectItem>
                      <SelectItem value="monitor">Monitor</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Brand *</Label>
                  <Input
                    value={assetForm.brand}
                    onChange={e =>
                      setAssetForm({ ...assetForm, brand: e.target.value })
                    }
                    placeholder="Enter brand"
                  />
                </div>
                <div>
                  <Label>Model *</Label>
                  <Input
                    value={assetForm.model}
                    onChange={e =>
                      setAssetForm({ ...assetForm, model: e.target.value })
                    }
                    placeholder="Enter model"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Serial Number *</Label>
                  <Input
                    value={assetForm.serialNumber}
                    onChange={e =>
                      setAssetForm({
                        ...assetForm,
                        serialNumber: e.target.value,
                      })
                    }
                    placeholder="Enter serial number"
                  />
                </div>
                <div>
                  <Label>Purchase Price *</Label>
                  <Input
                    value={assetForm.purchasePrice}
                    onChange={e =>
                      setAssetForm({
                        ...assetForm,
                        purchasePrice: e.target.value,
                      })
                    }
                    placeholder="Enter purchase price"
                    type="number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Purchase Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {assetForm.purchaseDate
                          ? format(assetForm.purchaseDate, 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={assetForm.purchaseDate}
                        onSelect={date =>
                          setAssetForm({ ...assetForm, purchaseDate: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Condition</Label>
                  <Select
                    value={assetForm.condition}
                    onValueChange={value =>
                      setAssetForm({ ...assetForm, condition: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Location *</Label>
                <Input
                  value={assetForm.location}
                  onChange={e =>
                    setAssetForm({ ...assetForm, location: e.target.value })
                  }
                  placeholder="Enter current location"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Warranty Provider</Label>
                  <Input
                    value={assetForm.warrantyProvider}
                    onChange={e =>
                      setAssetForm({
                        ...assetForm,
                        warrantyProvider: e.target.value,
                      })
                    }
                    placeholder="Enter warranty provider"
                  />
                </div>
                <div>
                  <Label>Warranty Expiry</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {assetForm.warrantyExpiry
                          ? format(assetForm.warrantyExpiry, 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={assetForm.warrantyExpiry}
                        onSelect={date =>
                          setAssetForm({ ...assetForm, warrantyExpiry: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAssetDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateAsset} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Asset'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {statsData && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-2xl font-bold">{statsData.totalAssets}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available</p>
                  <p className="text-2xl font-bold text-green-600">
                    {statsData.byStatus.available}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Allocated</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {statsData.byStatus.allocated}
                  </p>
                </div>
                <User className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Portfolio Value
                  </p>
                  <p className="text-2xl font-bold">
                    ${statsData.totalPortfolioValue.toLocaleString()}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="laptop">Laptop</SelectItem>
            <SelectItem value="desktop">Desktop</SelectItem>
            <SelectItem value="monitor">Monitor</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="furniture">Furniture</SelectItem>
            <SelectItem value="accessories">Accessories</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="allocated">Allocated</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assets Grid */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex h-48 items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-red-500" />
            <p className="text-muted-foreground">Failed to load assets</p>
          </div>
        </div>
      ) : assets.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <div className="text-center">
            <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No assets found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first asset to get started
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assets.map(asset => (
            <Card key={asset._id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(asset.category)}
                    <CardTitle className="text-base">{asset.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          handleUpdateStatus(asset._id, 'maintenance')
                        }
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Mark Maintenance
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          handleUpdateStatus(asset._id, 'available')
                        }
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark Available
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUpdateStatus(asset._id, 'retired')}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Retire Asset
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteAsset(asset._id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Asset
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Brand:</span>
                    <span className="font-medium">{asset.brand}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Model:</span>
                    <span className="font-medium">{asset.model}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Serial:</span>
                    <span className="font-mono text-xs">
                      {asset.serialNumber}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Condition:</span>
                    <span
                      className={`font-medium capitalize ${getConditionColor(asset.condition)}`}
                    >
                      {asset.condition}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="flex items-center font-medium">
                      <MapPin className="mr-1 h-3 w-3" />
                      {asset.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-2">
                  {getStatusBadge(asset.status)}
                  <span className="text-sm font-medium">
                    ${asset.purchasePrice.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const renderAllocations = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Asset Allocations</h3>
          <p className="text-sm text-muted-foreground">
            Track asset assignments to employees
          </p>
        </div>
      </div>

      {statsData ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Allocated Assets
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {statsData.byStatus.allocated}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Overdue Returns</p>
                <p className="text-3xl font-bold text-red-600">
                  {statsData.overdueReturns}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Available for Allocation
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {statsData.byStatus.available}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Show allocated assets */}
      <Card>
        <CardHeader>
          <CardTitle>Currently Allocated</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.filter(a => a.status === 'allocated').length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No allocated assets found
                    </TableCell>
                  </TableRow>
                ) : (
                  assets
                    .filter(a => a.status === 'allocated')
                    .map(asset => (
                      <TableRow key={asset._id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(asset.category)}
                            <span className="font-medium">{asset.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {asset.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{asset.location}</TableCell>
                        <TableCell>{getStatusBadge(asset.status)}</TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderMaintenance = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Asset Maintenance</h3>
          <p className="text-sm text-muted-foreground">
            Track assets under maintenance
          </p>
        </div>
      </div>

      {statsData && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Under Maintenance
                </p>
                <p className="text-3xl font-bold text-yellow-600">
                  {statsData.byStatus.maintenance}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Upcoming Maintenance
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {statsData.upcomingMaintenance}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Damaged Assets</p>
                <p className="text-3xl font-bold text-red-600">
                  {statsData.byStatus.damaged}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Show maintenance assets */}
      <Card>
        <CardHeader>
          <CardTitle>Assets in Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.filter(a => a.status === 'maintenance').length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No assets currently in maintenance
                    </TableCell>
                  </TableRow>
                ) : (
                  assets
                    .filter(a => a.status === 'maintenance')
                    .map(asset => (
                      <TableRow key={asset._id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(asset.category)}
                            <span className="font-medium">{asset.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {asset.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`capitalize ${getConditionColor(asset.condition)}`}
                          >
                            {asset.condition}
                          </span>
                        </TableCell>
                        <TableCell>{asset.location}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleUpdateStatus(asset._id, 'available')
                            }
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Complete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )

  switch (activeTab) {
    case 'inventory':
      return renderAssetInventory()
    case 'allocations':
      return renderAllocations()
    case 'maintenance':
      return renderMaintenance()
    default:
      return renderAssetInventory()
  }
}
