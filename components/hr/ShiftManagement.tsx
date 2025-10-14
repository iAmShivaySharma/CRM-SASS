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
  MoreVertical
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  workingDays: string[]
  totalHours: number
  breakDuration: number
  overtimeAfter: number
  gracePeriod: number
  isDefault: boolean
  isActive: boolean
  description?: string
  employeeCount: number
}

interface ShiftTemplate {
  id: string
  name: string
  shifts: Shift[]
  description: string
}

export function ShiftManagement() {
  const [selectedTab, setSelectedTab] = useState('shifts')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)

  // Mock shift data
  const [shifts, setShifts] = useState<Shift[]>([
    {
      id: '1',
      name: 'Morning Shift',
      startTime: '09:00',
      endTime: '17:00',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      totalHours: 8,
      breakDuration: 60,
      overtimeAfter: 8,
      gracePeriod: 15,
      isDefault: true,
      isActive: true,
      description: 'Standard office hours',
      employeeCount: 35
    },
    {
      id: '2',
      name: 'Evening Shift',
      startTime: '14:00',
      endTime: '22:00',
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      totalHours: 8,
      breakDuration: 60,
      overtimeAfter: 8,
      gracePeriod: 15,
      isDefault: false,
      isActive: true,
      description: 'Evening operations shift',
      employeeCount: 12
    },
    {
      id: '3',
      name: 'Night Shift',
      startTime: '22:00',
      endTime: '06:00',
      workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
      totalHours: 8,
      breakDuration: 60,
      overtimeAfter: 8,
      gracePeriod: 20,
      isDefault: false,
      isActive: true,
      description: '24/7 operations coverage',
      employeeCount: 8
    },
    {
      id: '4',
      name: 'Part Time',
      startTime: '10:00',
      endTime: '14:00',
      workingDays: ['monday', 'wednesday', 'friday'],
      totalHours: 4,
      breakDuration: 30,
      overtimeAfter: 4,
      gracePeriod: 10,
      isDefault: false,
      isActive: true,
      description: 'Part-time flexible hours',
      employeeCount: 5
    }
  ])

  const shiftTemplates: ShiftTemplate[] = [
    {
      id: '1',
      name: 'Standard Business Hours',
      description: '9-to-5 weekday schedule with standard breaks',
      shifts: [
        {
          id: 'template-1',
          name: 'Business Hours',
          startTime: '09:00',
          endTime: '17:00',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          totalHours: 8,
          breakDuration: 60,
          overtimeAfter: 8,
          gracePeriod: 15,
          isDefault: true,
          isActive: true,
          employeeCount: 0
        }
      ]
    },
    {
      id: '2',
      name: '24/7 Operations',
      description: 'Three-shift rotation for continuous operations',
      shifts: [
        {
          id: 'template-2a',
          name: 'Day Shift',
          startTime: '06:00',
          endTime: '14:00',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          totalHours: 8,
          breakDuration: 60,
          overtimeAfter: 8,
          gracePeriod: 15,
          isDefault: false,
          isActive: true,
          employeeCount: 0
        },
        {
          id: 'template-2b',
          name: 'Evening Shift',
          startTime: '14:00',
          endTime: '22:00',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          totalHours: 8,
          breakDuration: 60,
          overtimeAfter: 8,
          gracePeriod: 15,
          isDefault: false,
          isActive: true,
          employeeCount: 0
        },
        {
          id: 'template-2c',
          name: 'Night Shift',
          startTime: '22:00',
          endTime: '06:00',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          totalHours: 8,
          breakDuration: 60,
          overtimeAfter: 8,
          gracePeriod: 20,
          isDefault: false,
          isActive: true,
          employeeCount: 0
        }
      ]
    },
    {
      id: '3',
      name: 'Flexible Work Schedule',
      description: 'Mixed full-time and part-time options',
      shifts: [
        {
          id: 'template-3a',
          name: 'Full Time Flexible',
          startTime: '08:00',
          endTime: '16:00',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          totalHours: 8,
          breakDuration: 60,
          overtimeAfter: 8,
          gracePeriod: 30,
          isDefault: false,
          isActive: true,
          employeeCount: 0
        },
        {
          id: 'template-3b',
          name: 'Part Time Morning',
          startTime: '09:00',
          endTime: '13:00',
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          totalHours: 4,
          breakDuration: 30,
          overtimeAfter: 4,
          gracePeriod: 15,
          isDefault: false,
          isActive: true,
          employeeCount: 0
        }
      ]
    }
  ]

  const [formData, setFormData] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    workingDays: [] as string[],
    breakDuration: 60,
    overtimeAfter: 8,
    gracePeriod: 15,
    description: '',
    isActive: true
  })

  const daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
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

  const handleCreateShift = () => {
    const totalHours = calculateTotalHours(formData.startTime, formData.endTime)

    const newShift: Shift = {
      id: Date.now().toString(),
      name: formData.name,
      startTime: formData.startTime,
      endTime: formData.endTime,
      workingDays: formData.workingDays,
      totalHours,
      breakDuration: formData.breakDuration,
      overtimeAfter: formData.overtimeAfter,
      gracePeriod: formData.gracePeriod,
      description: formData.description,
      isDefault: shifts.length === 0,
      isActive: formData.isActive,
      employeeCount: 0
    }

    setShifts([...shifts, newShift])
    setShowCreateDialog(false)
    resetForm()
    toast.success('Shift created successfully')
  }

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift)
    setFormData({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      workingDays: shift.workingDays,
      breakDuration: shift.breakDuration,
      overtimeAfter: shift.overtimeAfter,
      gracePeriod: shift.gracePeriod,
      description: shift.description || '',
      isActive: shift.isActive
    })
    setShowCreateDialog(true)
  }

  const handleUpdateShift = () => {
    if (!editingShift) return

    const totalHours = calculateTotalHours(formData.startTime, formData.endTime)

    const updatedShift: Shift = {
      ...editingShift,
      name: formData.name,
      startTime: formData.startTime,
      endTime: formData.endTime,
      workingDays: formData.workingDays,
      totalHours,
      breakDuration: formData.breakDuration,
      overtimeAfter: formData.overtimeAfter,
      gracePeriod: formData.gracePeriod,
      description: formData.description,
      isActive: formData.isActive
    }

    setShifts(shifts.map(s => s.id === editingShift.id ? updatedShift : s))
    setShowCreateDialog(false)
    setEditingShift(null)
    resetForm()
    toast.success('Shift updated successfully')
  }

  const handleDeleteShift = (shiftId: string) => {
    const shift = shifts.find(s => s.id === shiftId)
    if (shift?.employeeCount > 0) {
      toast.error('Cannot delete shift with assigned employees')
      return
    }

    setShifts(shifts.filter(s => s.id !== shiftId))
    toast.success('Shift deleted successfully')
  }

  const handleDuplicateShift = (shift: Shift) => {
    const newShift: Shift = {
      ...shift,
      id: Date.now().toString(),
      name: `${shift.name} (Copy)`,
      isDefault: false,
      employeeCount: 0
    }

    setShifts([...shifts, newShift])
    toast.success('Shift duplicated successfully')
  }

  const handleSetDefaultShift = (shiftId: string) => {
    setShifts(shifts.map(s => ({ ...s, isDefault: s.id === shiftId })))
    toast.success('Default shift updated')
  }

  const applyTemplate = (template: ShiftTemplate) => {
    const newShifts = template.shifts.map(shift => ({
      ...shift,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      isDefault: shifts.length === 0 && shift.isDefault
    }))

    setShifts([...shifts, ...newShifts])
    setShowTemplateDialog(false)
    toast.success(`Applied template: ${template.name}`)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      startTime: '09:00',
      endTime: '17:00',
      workingDays: [],
      breakDuration: 60,
      overtimeAfter: 8,
      gracePeriod: 15,
      description: '',
      isActive: true
    })
  }

  const handleWorkingDayChange = (day: string, checked: boolean) => {
    if (checked) {
      setFormData({ ...formData, workingDays: [...formData.workingDays, day] })
    } else {
      setFormData({ ...formData, workingDays: formData.workingDays.filter(d => d !== day) })
    }
  }

  const formatWorkingDays = (days: string[]) => {
    if (days.length === 7) return 'All days'
    if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) return 'Weekdays'
    if (days.length === 2 && days.includes('saturday') && days.includes('sunday')) return 'Weekends'
    return days.map(day => day.slice(0, 3)).join(', ')
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
                        {template.shifts.map((shift) => (
                          <div key={shift.id} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{shift.name}</span>
                            <span className="text-muted-foreground">
                              {shift.startTime} - {shift.endTime} ({shift.totalHours}h)
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
                    <Label>Overtime After (hours)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.overtimeAfter}
                      onChange={(e) => setFormData({ ...formData, overtimeAfter: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Grace Period (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.gracePeriod}
                      onChange={(e) => setFormData({ ...formData, gracePeriod: Number(e.target.value) })}
                    />
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
                  <Button onClick={editingShift ? handleUpdateShift : handleCreateShift}>
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
              {shifts.map((shift) => (
                <TableRow key={shift.id}>
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
                          <DropdownMenuItem onClick={() => handleSetDefaultShift(shift.id)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDeleteShift(shift.id)}
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
              ))}
            </TableBody>
          </Table>
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