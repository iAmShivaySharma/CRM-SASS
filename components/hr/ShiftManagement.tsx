'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Clock,
  Plus,
  Edit,
  Trash2,
  Copy,
  Settings,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Timer,
  MoreVertical,
  Loader2
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useGetShiftsQuery, useCreateShiftMutation, useUpdateShiftMutation, useDeleteShiftMutation, useSetDefaultShiftMutation, type Shift } from '@/lib/api/shiftsApi'
import { useAppSelector } from '@/lib/hooks'

interface ShiftTemplate {
  id: string
  name: string
  shifts: Partial<Shift>[]
  description: string
}

export function ShiftManagement() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [selectedTab, setSelectedTab] = useState('shifts')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)

  // API hooks
  const { data: shiftsData, isLoading, error, refetch } = useGetShiftsQuery({ includeInactive: true })
  const [createShift, { isLoading: isCreating }] = useCreateShiftMutation()
  const [updateShift, { isLoading: isUpdating }] = useUpdateShiftMutation()
  const [deleteShift, { isLoading: isDeleting }] = useDeleteShiftMutation()
  const [setDefaultShift] = useSetDefaultShiftMutation()

  const shifts = shiftsData?.shifts || []

  // Check workspace
  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">Please select a workspace to manage shifts.</p>
        </div>
      </div>
    )
  }


  const shiftTemplates: ShiftTemplate[] = [
    {
      id: '1',
      name: 'Standard Business Hours',
      description: '9-to-5 weekday schedule with standard breaks',
      shifts: [
        {
          name: 'Business Hours',
          startTime: '09:00',
          endTime: '17:00',
          workingDays: [1, 2, 3, 4, 5], // Monday to Friday
          breakDuration: 60,
          graceTime: 15,
          isDefault: true,
          isActive: true,
          description: 'Standard office hours'
        }
      ]
    },
    {
      id: '2',
      name: '24/7 Operations',
      description: 'Three-shift rotation for continuous operations',
      shifts: [
        {
          name: 'Day Shift',
          startTime: '06:00',
          endTime: '14:00',
          workingDays: [0, 1, 2, 3, 4, 5, 6], // All days
          breakDuration: 60,
          graceTime: 15,
          isDefault: false,
          isActive: true,
          description: 'Morning operations shift'
        },
        {
          name: 'Evening Shift',
          startTime: '14:00',
          endTime: '22:00',
          workingDays: [0, 1, 2, 3, 4, 5, 6], // All days
          breakDuration: 60,
          graceTime: 15,
          isDefault: false,
          isActive: true,
          description: 'Evening operations shift'
        },
        {
          name: 'Night Shift',
          startTime: '22:00',
          endTime: '06:00',
          workingDays: [0, 1, 2, 3, 4, 5, 6], // All days
          breakDuration: 60,
          graceTime: 20,
          isDefault: false,
          isActive: true,
          description: 'Night operations shift'
        }
      ]
    },
    {
      id: '3',
      name: 'Flexible Work Schedule',
      description: 'Mixed full-time and part-time options',
      shifts: [
        {
          name: 'Full Time Flexible',
          startTime: '08:00',
          endTime: '16:00',
          workingDays: [1, 2, 3, 4, 5], // Weekdays
          breakDuration: 60,
          graceTime: 30,
          isDefault: false,
          isActive: true,
          description: 'Flexible full-time hours'
        },
        {
          name: 'Part Time Morning',
          startTime: '09:00',
          endTime: '13:00',
          workingDays: [1, 2, 3, 4, 5], // Weekdays
          breakDuration: 30,
          graceTime: 15,
          isDefault: false,
          isActive: true,
          description: 'Part-time morning hours'
        }
      ]
    }
  ]

  const [formData, setFormData] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    workingDays: [] as number[],
    breakDuration: 60,
    graceTime: 15,
    description: '',
    isActive: true,
    isDefault: false
  })

  const daysOfWeek = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' }
  ]

  const calculateTotalHours = (start: string, end: string) => {
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)

    let startMinutes = startHour * 60 + startMin
    let endMinutes = endHour * 60 + endMin

    // Handle overnight shifts
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60
    }

    return (endMinutes - startMinutes) / 60
  }

  const handleCreateShift = async () => {
    try {
      const result = await createShift({
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        workingDays: formData.workingDays,
        breakDuration: formData.breakDuration,
        graceTime: formData.graceTime,
        description: formData.description,
        isDefault: formData.isDefault,
        isActive: formData.isActive
      }).unwrap()

      setShowCreateDialog(false)
      setEditingShift(null)
      resetForm()
      toast.success(result.message)
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to create shift')
    }
  }

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift)
    setFormData({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      workingDays: shift.workingDays,
      breakDuration: shift.breakDuration,
      graceTime: shift.graceTime,
      description: shift.description || '',
      isActive: shift.isActive,
      isDefault: shift.isDefault
    })
    setShowCreateDialog(true)
  }

  const handleUpdateShift = async () => {
    if (!editingShift) return

    try {
      const result = await updateShift({
        id: editingShift._id,
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        workingDays: formData.workingDays,
        breakDuration: formData.breakDuration,
        graceTime: formData.graceTime,
        description: formData.description,
        isActive: formData.isActive,
        isDefault: formData.isDefault
      }).unwrap()

      setShowCreateDialog(false)
      setEditingShift(null)
      resetForm()
      toast.success(result.message)
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to update shift')
    }
  }

  const handleDeleteShift = async (shiftId: string) => {
    const shift = shifts.find(s => s._id === shiftId)
    if (shift?.employeeCount && shift.employeeCount > 0) {
      toast.error('Cannot delete shift with assigned employees')
      return
    }

    try {
      const result = await deleteShift(shiftId).unwrap()
      toast.success(result.message)
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to delete shift')
    }
  }

  const handleDuplicateShift = async (shift: Shift) => {
    try {
      const result = await createShift({
        name: `${shift.name} (Copy)`,
        startTime: shift.startTime,
        endTime: shift.endTime,
        workingDays: shift.workingDays,
        breakDuration: shift.breakDuration,
        graceTime: shift.graceTime,
        description: shift.description,
        isDefault: false,
        isActive: shift.isActive
      }).unwrap()

      toast.success(result.message)
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to duplicate shift')
    }
  }

  const handleSetDefaultShift = async (shiftId: string) => {
    try {
      const result = await setDefaultShift(shiftId).unwrap()
      toast.success(result.message)
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to set default shift')
    }
  }

  const applyTemplate = async (template: ShiftTemplate) => {
    try {
      // Create all shifts from template
      const createPromises = template.shifts.map((shift, index) =>
        createShift({
          name: shift.name!,
          startTime: shift.startTime!,
          endTime: shift.endTime!,
          workingDays: shift.workingDays!,
          breakDuration: shift.breakDuration!,
          graceTime: shift.graceTime!,
          description: shift.description,
          isDefault: shifts.length === 0 && index === 0, // Make first shift default if no shifts exist
          isActive: shift.isActive!
        }).unwrap()
      )

      await Promise.all(createPromises)
      setShowTemplateDialog(false)
      toast.success(`Applied template: ${template.name}`)
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to apply template')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      startTime: '09:00',
      endTime: '17:00',
      workingDays: [],
      breakDuration: 60,
      graceTime: 15,
      description: '',
      isActive: true,
      isDefault: false
    })
  }

  const handleWorkingDayChange = (day: number, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, workingDays: [...formData.workingDays, day] })
    } else {
      setFormData({ ...formData, workingDays: formData.workingDays.filter(d => d !== day) })
    }
  }

  const formatWorkingDays = (days: number[]) => {
    if (days.length === 7) return 'All days'
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays'
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends'

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days.sort().map(day => dayNames[day]).join(', ')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Shift Management</h2>
          <p className="text-muted-foreground">
            Configure work schedules and shift patterns
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Copy className="h-4 w-4 mr-2" />
                Use Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Shift Templates</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                {shiftTemplates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:bg-gray-50" onClick={() => applyTemplate(template)}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant="outline">{template.shifts.length} shifts</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {template.shifts.map((shift, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{shift.name}</span>
                            <span className="text-muted-foreground">
                              {shift.startTime} - {shift.endTime}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Shift
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingShift ? 'Edit Shift' : 'Create New Shift'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div>
                  <Label>Shift Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter shift name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Working Days</Label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {daysOfWeek.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Switch
                          checked={formData.workingDays.includes(day.value)}
                          onCheckedChange={(checked) => handleWorkingDayChange(day.value, checked)}
                        />
                        <Label className="text-sm">{day.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Break Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.breakDuration}
                      onChange={(e) => setFormData({ ...formData, breakDuration: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Grace Period (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.graceTime}
                      onChange={(e) => setFormData({ ...formData, graceTime: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Default Shift</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Switch
                        checked={formData.isDefault}
                        onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                      />
                      <Label className="text-sm">Set as default shift for new employees</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe this shift..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label>Active Shift</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => {
                    setShowCreateDialog(false)
                    setEditingShift(null)
                    resetForm()
                  }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={editingShift ? handleUpdateShift : handleCreateShift}
                    disabled={isCreating || isUpdating}
                  >
                    {(isCreating || isUpdating) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editingShift ? 'Update Shift' : 'Create Shift'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Shift List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Active Shifts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading shifts...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-2">Failed to load shifts</p>
              <Button onClick={refetch} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift Name</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">No shifts found for this workspace.</p>
                      <p className="text-sm text-muted-foreground mt-1">Create your first shift to get started.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  shifts.map((shift) => (
                    <TableRow key={shift._id}>
                  <TableCell>
                    <div>
                      <div className="font-medium flex items-center space-x-2">
                        <span>{shift.name}</span>
                        {shift.isDefault && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                      {shift.description && (
                        <div className="text-sm text-muted-foreground">{shift.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{shift.startTime} - {shift.endTime}</div>
                      <div className="text-sm text-muted-foreground">
                        {shift.totalHours}h • {shift.breakDuration}m break
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatWorkingDays(shift.workingDays)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{shift.employeeCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        shift.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {shift.isActive ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditShift(shift)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Shift
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateShift(shift)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        {!shift.isDefault && (
                          <DropdownMenuItem onClick={() => handleSetDefaultShift(shift._id)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDeleteShift(shift._id)}
                          className="text-red-600"
                          disabled={shift.employeeCount > 0}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Shift
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shifts.length}</div>
            <p className="text-xs text-muted-foreground">
              {shifts.filter(s => s.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shifts.reduce((total, shift) => total + shift.employeeCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all shifts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Hours</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shifts.length > 0
                ? (shifts.reduce((total, shift) => total + shift.totalHours, 0) / shifts.length).toFixed(1)
                : '0'
              }h
            </div>
            <p className="text-xs text-muted-foreground">
              Per shift
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}