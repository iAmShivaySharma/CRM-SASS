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
  Calendar as CalendarIcon,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  FileText,
  Settings,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  MoreVertical,
  AlertCircle,
  Target
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { format, addDays, differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  employeeAvatar?: string
  leaveType: string
  startDate: Date
  endDate: Date
  days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  appliedDate: Date
  approvedBy?: string
  approvedDate?: Date
  comments?: string
}

interface LeavePolicy {
  id: string
  name: string
  type: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'emergency'
  daysPerYear: number
  carryForward: boolean
  maxCarryForward?: number
  description: string
  eligibility: string
  isActive: boolean
}

interface LeaveBalance {
  employeeId: string
  employeeName: string
  department: string
  leaveType: string
  totalDays: number
  usedDays: number
  remainingDays: number
  pendingDays: number
}

interface LeaveManagementProps {
  activeTab: string
}

export function LeaveManagement({ activeTab }: LeaveManagementProps) {
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [showPolicyDialog, setShowPolicyDialog] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all')

  // Mock data for leave requests
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    {
      id: '1',
      employeeId: 'emp1',
      employeeName: 'John Doe',
      leaveType: 'Annual Leave',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-01-19'),
      days: 5,
      reason: 'Family vacation',
      status: 'pending',
      appliedDate: new Date('2024-01-10'),
    },
    {
      id: '2',
      employeeId: 'emp2',
      employeeName: 'Jane Smith',
      leaveType: 'Sick Leave',
      startDate: new Date('2024-01-12'),
      endDate: new Date('2024-01-14'),
      days: 3,
      reason: 'Medical treatment',
      status: 'approved',
      appliedDate: new Date('2024-01-11'),
      approvedBy: 'HR Manager',
      approvedDate: new Date('2024-01-11'),
    },
    {
      id: '3',
      employeeId: 'emp3',
      employeeName: 'Mike Johnson',
      leaveType: 'Personal Leave',
      startDate: new Date('2024-01-20'),
      endDate: new Date('2024-01-20'),
      days: 1,
      reason: 'Personal matters',
      status: 'rejected',
      appliedDate: new Date('2024-01-18'),
      approvedBy: 'HR Manager',
      approvedDate: new Date('2024-01-19'),
      comments: 'Insufficient leave balance'
    }
  ])

  const leavePolicies: LeavePolicy[] = [
    {
      id: '1',
      name: 'Annual Leave',
      type: 'annual',
      daysPerYear: 21,
      carryForward: true,
      maxCarryForward: 5,
      description: 'Annual vacation leave for all employees',
      eligibility: 'All permanent employees after 6 months',
      isActive: true
    },
    {
      id: '2',
      name: 'Sick Leave',
      type: 'sick',
      daysPerYear: 10,
      carryForward: false,
      description: 'Medical leave for health issues',
      eligibility: 'All employees from day one',
      isActive: true
    },
    {
      id: '3',
      name: 'Personal Leave',
      type: 'personal',
      daysPerYear: 5,
      carryForward: false,
      description: 'Personal time off for urgent matters',
      eligibility: 'All permanent employees',
      isActive: true
    },
    {
      id: '4',
      name: 'Maternity Leave',
      type: 'maternity',
      daysPerYear: 90,
      carryForward: false,
      description: 'Maternity leave for new mothers',
      eligibility: 'Female employees',
      isActive: true
    }
  ]

  const leaveBalances: LeaveBalance[] = [
    {
      employeeId: 'emp1',
      employeeName: 'John Doe',
      department: 'Engineering',
      leaveType: 'Annual Leave',
      totalDays: 21,
      usedDays: 8,
      remainingDays: 13,
      pendingDays: 5
    },
    {
      employeeId: 'emp1',
      employeeName: 'John Doe',
      department: 'Engineering',
      leaveType: 'Sick Leave',
      totalDays: 10,
      usedDays: 2,
      remainingDays: 8,
      pendingDays: 0
    },
    {
      employeeId: 'emp2',
      employeeName: 'Jane Smith',
      department: 'Product',
      leaveType: 'Annual Leave',
      totalDays: 21,
      usedDays: 12,
      remainingDays: 9,
      pendingDays: 0
    },
    {
      employeeId: 'emp2',
      employeeName: 'Jane Smith',
      department: 'Product',
      leaveType: 'Sick Leave',
      totalDays: 10,
      usedDays: 3,
      remainingDays: 7,
      pendingDays: 0
    }
  ]

  const [requestForm, setRequestForm] = useState({
    employeeId: '',
    leaveType: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    reason: ''
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'annual':
        return 'bg-blue-100 text-blue-800'
      case 'sick':
        return 'bg-red-100 text-red-800'
      case 'personal':
        return 'bg-purple-100 text-purple-800'
      case 'maternity':
        return 'bg-pink-100 text-pink-800'
      case 'paternity':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleApproveRequest = (requestId: string) => {
    setLeaveRequests(requests =>
      requests.map(req =>
        req.id === requestId
          ? {
              ...req,
              status: 'approved' as const,
              approvedBy: 'Current User',
              approvedDate: new Date()
            }
          : req
      )
    )
    toast.success('Leave request approved')
  }

  const handleRejectRequest = (requestId: string, comments?: string) => {
    setLeaveRequests(requests =>
      requests.map(req =>
        req.id === requestId
          ? {
              ...req,
              status: 'rejected' as const,
              approvedBy: 'Current User',
              approvedDate: new Date(),
              comments
            }
          : req
      )
    )
    toast.success('Leave request rejected')
  }

  const calculateDays = (start: Date | undefined, end: Date | undefined) => {
    if (!start || !end) return 0
    return differenceInDays(end, start) + 1
  }

  const filteredRequests = leaveRequests.filter(request => {
    const matchesSearch = request.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.leaveType.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    const matchesType = leaveTypeFilter === 'all' || request.leaveType === leaveTypeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const renderLeaveRequests = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Leave Requests</h3>
          <p className="text-sm text-muted-foreground">Manage employee leave applications</p>
        </div>
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Leave Request</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label>Employee</Label>
                <Select value={requestForm.employeeId} onValueChange={(value) => setRequestForm({...requestForm, employeeId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emp1">John Doe</SelectItem>
                    <SelectItem value="emp2">Jane Smith</SelectItem>
                    <SelectItem value="emp3">Mike Johnson</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Leave Type</Label>
                <Select value={requestForm.leaveType} onValueChange={(value) => setRequestForm({...requestForm, leaveType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                    <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                    <SelectItem value="Personal Leave">Personal Leave</SelectItem>
                    <SelectItem value="Maternity Leave">Maternity Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {requestForm.startDate ? format(requestForm.startDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={requestForm.startDate}
                        onSelect={(date) => setRequestForm({...requestForm, startDate: date})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {requestForm.endDate ? format(requestForm.endDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={requestForm.endDate}
                        onSelect={(date) => setRequestForm({...requestForm, endDate: date})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {requestForm.startDate && requestForm.endDate && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">
                    Total Days: {calculateDays(requestForm.startDate, requestForm.endDate)}
                  </p>
                </div>
              )}

              <div>
                <Label>Reason</Label>
                <Textarea
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({...requestForm, reason: e.target.value})}
                  placeholder="Provide reason for leave..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  // Handle form submission
                  toast.success('Leave request submitted')
                  setShowRequestDialog(false)
                }}>
                  Submit Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Annual Leave">Annual Leave</SelectItem>
            <SelectItem value="Sick Leave">Sick Leave</SelectItem>
            <SelectItem value="Personal Leave">Personal Leave</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Applied Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={request.employeeAvatar} />
                        <AvatarFallback>
                          {request.employeeName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{request.employeeName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{request.leaveType}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{request.days} days</div>
                      <div className="text-sm text-muted-foreground">
                        {format(request.startDate, 'MMM dd')} - {format(request.endDate, 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(request.appliedDate, 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(request.status)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedRequest(request)}>
                          <FileText className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {request.status === 'pending' && (
                          <>
                            <DropdownMenuItem onClick={() => handleApproveRequest(request.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRejectRequest(request.id)}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
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

  const renderLeavePolicies = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Leave Policies</h3>
          <p className="text-sm text-muted-foreground">Configure leave types and policies</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Policy
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {leavePolicies.map((policy) => (
          <Card key={policy.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Badge className={getLeaveTypeColor(policy.type)}>
                    {policy.name}
                  </Badge>
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Policy
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Policy
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{policy.description}</p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Days per year:</span>
                  <span className="font-medium">{policy.daysPerYear}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Carry forward:</span>
                  <span className="font-medium">
                    {policy.carryForward ? `Yes (max ${policy.maxCarryForward || 0})` : 'No'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Eligibility:</span>
                  <span className="font-medium text-right">{policy.eligibility}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                  {policy.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderLeaveBalance = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Leave Balance</h3>
          <p className="text-sm text-muted-foreground">Employee leave balances and utilization</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Total Days</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveBalances.map((balance, index) => (
                <TableRow key={`${balance.employeeId}-${balance.leaveType}-${index}`}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{balance.employeeName}</div>
                      <div className="text-sm text-muted-foreground">{balance.department}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{balance.leaveType}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{balance.totalDays}</TableCell>
                  <TableCell>{balance.usedDays}</TableCell>
                  <TableCell>
                    {balance.pendingDays > 0 ? (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                        {balance.pendingDays}
                      </Badge>
                    ) : (
                      '0'
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{balance.remainingDays}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            (balance.usedDays / balance.totalDays) * 100 > 80
                              ? 'bg-red-500'
                              : (balance.usedDays / balance.totalDays) * 100 > 60
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${(balance.usedDays / balance.totalDays) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {Math.round((balance.usedDays / balance.totalDays) * 100)}%
                      </span>
                    </div>
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
    case 'requests':
      return renderLeaveRequests()
    case 'policies':
      return renderLeavePolicies()
    case 'balance':
      return renderLeaveBalance()
    default:
      return renderLeaveRequests()
  }
}