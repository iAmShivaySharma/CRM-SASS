'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Laptop,
  Smartphone,
  Monitor,
  Headphones,
  Car,
  Plus,
  Search,
  Filter,
  Download,
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
  QrCode
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { format, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Asset {
  id: string
  name: string
  category: 'laptop' | 'desktop' | 'monitor' | 'phone' | 'tablet' | 'accessories' | 'vehicle' | 'furniture'
  brand: string
  model: string
  serialNumber: string
  purchaseDate: Date
  purchasePrice: number
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  status: 'available' | 'allocated' | 'maintenance' | 'retired'
  location: string
  warranty: {
    expiryDate: Date
    provider: string
  }
  specifications?: Record<string, string>
}

interface AssetAllocation {
  id: string
  assetId: string
  assetName: string
  assetCategory: string
  employeeId: string
  employeeName: string
  employeeEmail: string
  department: string
  allocatedDate: Date
  returnDate?: Date
  purpose: string
  condition: string
  notes?: string
  status: 'active' | 'returned' | 'overdue'
}

interface MaintenanceRecord {
  id: string
  assetId: string
  assetName: string
  type: 'repair' | 'upgrade' | 'inspection' | 'cleaning'
  description: string
  cost: number
  scheduledDate: Date
  completedDate?: Date
  vendor: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  nextMaintenanceDate?: Date
}

interface AssetManagementProps {
  activeTab: string
}

export function AssetManagement({ activeTab }: AssetManagementProps) {
  const [showAssetDialog, setShowAssetDialog] = useState(false)
  const [showAllocationDialog, setShowAllocationDialog] = useState(false)
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Mock data for assets
  const [assets, setAssets] = useState<Asset[]>([
    {
      id: '1',
      name: 'MacBook Pro 16"',
      category: 'laptop',
      brand: 'Apple',
      model: 'MacBook Pro 16-inch 2023',
      serialNumber: 'MBP2023001',
      purchaseDate: new Date('2023-06-15'),
      purchasePrice: 2499,
      condition: 'excellent',
      status: 'allocated',
      location: 'Engineering Floor',
      warranty: {
        expiryDate: new Date('2026-06-15'),
        provider: 'Apple'
      },
      specifications: {
        'Processor': 'M2 Pro',
        'RAM': '32GB',
        'Storage': '1TB SSD',
        'Display': '16.2-inch Liquid Retina XDR'
      }
    },
    {
      id: '2',
      name: 'Dell UltraSharp Monitor',
      category: 'monitor',
      brand: 'Dell',
      model: 'U2723QE',
      serialNumber: 'DLL2023002',
      purchaseDate: new Date('2023-03-20'),
      purchasePrice: 649,
      condition: 'excellent',
      status: 'available',
      location: 'IT Storage',
      warranty: {
        expiryDate: new Date('2026-03-20'),
        provider: 'Dell'
      },
      specifications: {
        'Size': '27 inches',
        'Resolution': '4K UHD',
        'Panel Type': 'IPS',
        'Connectivity': 'USB-C, HDMI, DisplayPort'
      }
    },
    {
      id: '3',
      name: 'iPhone 14 Pro',
      category: 'phone',
      brand: 'Apple',
      model: 'iPhone 14 Pro',
      serialNumber: 'IPH2023003',
      purchaseDate: new Date('2023-01-10'),
      purchasePrice: 999,
      condition: 'good',
      status: 'allocated',
      location: 'Sales Department',
      warranty: {
        expiryDate: new Date('2024-01-10'),
        provider: 'Apple'
      },
      specifications: {
        'Storage': '256GB',
        'Color': 'Space Black',
        'Network': '5G'
      }
    },
    {
      id: '4',
      name: 'Herman Miller Chair',
      category: 'furniture',
      brand: 'Herman Miller',
      model: 'Aeron Chair',
      serialNumber: 'HM2023004',
      purchaseDate: new Date('2023-02-28'),
      purchasePrice: 1395,
      condition: 'excellent',
      status: 'allocated',
      location: 'Executive Office',
      warranty: {
        expiryDate: new Date('2035-02-28'),
        provider: 'Herman Miller'
      }
    }
  ])

  const [allocations, setAllocations] = useState<AssetAllocation[]>([
    {
      id: '1',
      assetId: '1',
      assetName: 'MacBook Pro 16"',
      assetCategory: 'laptop',
      employeeId: 'emp1',
      employeeName: 'John Doe',
      employeeEmail: 'john.doe@company.com',
      department: 'Engineering',
      allocatedDate: new Date('2023-06-20'),
      purpose: 'Development work',
      condition: 'excellent',
      status: 'active'
    },
    {
      id: '2',
      assetId: '3',
      assetName: 'iPhone 14 Pro',
      assetCategory: 'phone',
      employeeId: 'emp2',
      employeeName: 'Jane Smith',
      employeeEmail: 'jane.smith@company.com',
      department: 'Sales',
      allocatedDate: new Date('2023-01-15'),
      purpose: 'Sales activities and client communication',
      condition: 'good',
      status: 'active'
    },
    {
      id: '3',
      assetId: '4',
      assetName: 'Herman Miller Chair',
      assetCategory: 'furniture',
      employeeId: 'emp3',
      employeeName: 'Mike Johnson',
      employeeEmail: 'mike.johnson@company.com',
      department: 'Executive',
      allocatedDate: new Date('2023-03-01'),
      purpose: 'Office workspace',
      condition: 'excellent',
      status: 'active'
    }
  ])

  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([
    {
      id: '1',
      assetId: '1',
      assetName: 'MacBook Pro 16"',
      type: 'inspection',
      description: 'Annual hardware inspection and cleaning',
      cost: 150,
      scheduledDate: new Date('2024-01-15'),
      vendor: 'TechCare Solutions',
      status: 'scheduled'
    },
    {
      id: '2',
      assetId: '2',
      assetName: 'Dell UltraSharp Monitor',
      type: 'repair',
      description: 'Display flickering issue repair',
      cost: 200,
      scheduledDate: new Date('2023-12-20'),
      completedDate: new Date('2023-12-22'),
      vendor: 'Dell Support',
      status: 'completed',
      nextMaintenanceDate: new Date('2024-06-20')
    }
  ])

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
    warrantyExpiry: undefined as Date | undefined
  })

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
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Available</Badge>
      case 'allocated':
        return <Badge className="bg-blue-100 text-blue-800"><User className="h-3 w-3 mr-1" />Allocated</Badge>
      case 'maintenance':
        return <Badge className="bg-yellow-100 text-yellow-800"><Settings className="h-3 w-3 mr-1" />Maintenance</Badge>
      case 'retired':
        return <Badge className="bg-gray-100 text-gray-800">Retired</Badge>
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
      case 'returned':
        return <Badge className="bg-gray-100 text-gray-800">Returned</Badge>
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
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

  const renderAssetInventory = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Asset Inventory</h3>
          <p className="text-sm text-muted-foreground">Manage company assets and equipment</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <QrCode className="h-4 w-4 mr-2" />
            Generate QR Codes
          </Button>
          <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
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
                    <Label>Asset Name</Label>
                    <Input
                      value={assetForm.name}
                      onChange={(e) => setAssetForm({...assetForm, name: e.target.value})}
                      placeholder="Enter asset name"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={assetForm.category} onValueChange={(value) => setAssetForm({...assetForm, category: value})}>
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
                    <Label>Brand</Label>
                    <Input
                      value={assetForm.brand}
                      onChange={(e) => setAssetForm({...assetForm, brand: e.target.value})}
                      placeholder="Enter brand"
                    />
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Input
                      value={assetForm.model}
                      onChange={(e) => setAssetForm({...assetForm, model: e.target.value})}
                      placeholder="Enter model"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Serial Number</Label>
                    <Input
                      value={assetForm.serialNumber}
                      onChange={(e) => setAssetForm({...assetForm, serialNumber: e.target.value})}
                      placeholder="Enter serial number"
                    />
                  </div>
                  <div>
                    <Label>Purchase Price</Label>
                    <Input
                      value={assetForm.purchasePrice}
                      onChange={(e) => setAssetForm({...assetForm, purchasePrice: e.target.value})}
                      placeholder="Enter purchase price"
                      type="number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Purchase Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {assetForm.purchaseDate ? format(assetForm.purchaseDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={assetForm.purchaseDate}
                          onSelect={(date) => setAssetForm({...assetForm, purchaseDate: date})}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Condition</Label>
                    <Select value={assetForm.condition} onValueChange={(value) => setAssetForm({...assetForm, condition: value})}>
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
                  <Label>Location</Label>
                  <Input
                    value={assetForm.location}
                    onChange={(e) => setAssetForm({...assetForm, location: e.target.value})}
                    placeholder="Enter current location"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Warranty Provider</Label>
                    <Input
                      value={assetForm.warrantyProvider}
                      onChange={(e) => setAssetForm({...assetForm, warrantyProvider: e.target.value})}
                      placeholder="Enter warranty provider"
                    />
                  </div>
                  <div>
                    <Label>Warranty Expiry</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {assetForm.warrantyExpiry ? format(assetForm.warrantyExpiry, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={assetForm.warrantyExpiry}
                          onSelect={(date) => setAssetForm({...assetForm, warrantyExpiry: date})}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAssetDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => {
                    toast.success('Asset added successfully')
                    setShowAssetDialog(false)
                  }}>
                    Add Asset
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            <SelectItem value="monitor">Monitor</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="furniture">Furniture</SelectItem>
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => (
          <Card key={asset.id} className="hover:shadow-md transition-shadow">
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
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Asset
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <User className="h-4 w-4 mr-2" />
                      Allocate
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Schedule Maintenance
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
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
                  <span className="font-mono text-xs">{asset.serialNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Condition:</span>
                  <span className={`font-medium capitalize ${getConditionColor(asset.condition)}`}>
                    {asset.condition}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {asset.location}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                {getStatusBadge(asset.status)}
                <span className="text-sm font-medium">${asset.purchasePrice.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderAllocations = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Asset Allocations</h3>
          <p className="text-sm text-muted-foreground">Track asset assignments to employees</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Allocation
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Allocated Date</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((allocation) => (
                <TableRow key={allocation.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(allocation.assetCategory)}
                      <span className="font-medium">{allocation.assetName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {allocation.employeeName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{allocation.employeeName}</div>
                        <div className="text-sm text-muted-foreground">{allocation.employeeEmail}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{allocation.department}</Badge>
                  </TableCell>
                  <TableCell>
                    {format(allocation.allocatedDate, 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{allocation.purpose}</span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(allocation.status)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <FileText className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Allocation
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Return Asset
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )

  const renderMaintenance = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Asset Maintenance</h3>
          <p className="text-sm text-muted-foreground">Schedule and track asset maintenance</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Maintenance
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenanceRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <span className="font-medium">{record.assetName}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{record.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{record.description}</span>
                  </TableCell>
                  <TableCell>
                    {format(record.scheduledDate, 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>{record.vendor}</TableCell>
                  <TableCell>${record.cost}</TableCell>
                  <TableCell>
                    {getStatusBadge(record.status)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Record
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Complete
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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