'use client'

import { useState } from 'react'
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
  Target,
  Loader2,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
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
import { Textarea } from '@/components/ui/textarea'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetLeaveRequestsQuery,
  useCreateLeaveRequestMutation,
  useUpdateLeaveRequestMutation,
  useDeleteLeaveRequestMutation,
  useGetLeaveStatsQuery,
  type LeaveRequestRecord,
} from '@/lib/api/leaveApi'

interface LeaveManagementProps {
  activeTab: string
}

export function LeaveManagement({ activeTab }: LeaveManagementProps) {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [selectedRequest, setSelectedRequest] =
    useState<LeaveRequestRecord | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all')
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const [requestForm, setRequestForm] = useState({
    leaveType: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
    reason: '',
  })

  // API hooks
  const {
    data: leaveData,
    isLoading,
    error,
  } = useGetLeaveRequestsQuery({
    workspaceId: currentWorkspace?.id,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })
  const { data: statsData } = useGetLeaveStatsQuery({
    workspaceId: currentWorkspace?.id,
  })
  const [createLeave, { isLoading: isCreating }] =
    useCreateLeaveRequestMutation()
  const [updateLeave, { isLoading: isUpdating }] =
    useUpdateLeaveRequestMutation()
  const [deleteLeave] = useDeleteLeaveRequestMutation()

  const leaveRequests = leaveData?.leaveRequests || []

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">
            Please select a workspace to manage leaves.
          </p>
        </div>
      </div>
    )
  }

  const getEmployeeName = (req: LeaveRequestRecord) => {
    if (typeof req.employeeId === 'object' && req.employeeId?.fullName) {
      return req.employeeId.fullName
    }
    return 'Unknown'
  }

  const getEmployeeInitials = (req: LeaveRequestRecord) => {
    const name = getEmployeeName(req)
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  const getLeavePolicyName = (req: LeaveRequestRecord) => {
    if (typeof req.leavePolicyId === 'object' && req.leavePolicyId?.name) {
      return req.leavePolicyId.name
    }
    return req.leaveType
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        )
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    try {
      await updateLeave({ id: requestId, status: 'approved' }).unwrap()
      toast.success('Leave request approved')
    } catch (error: any) {
      toast.error(error?.data?.error || 'Failed to approve leave request')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    try {
      await updateLeave({
        id: requestId,
        status: 'rejected',
        rejectionReason,
      }).unwrap()
      toast.success('Leave request rejected')
      setRejectDialogId(null)
      setRejectionReason('')
    } catch (error: any) {
      toast.error(error?.data?.error || 'Failed to reject leave request')
    }
  }

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await deleteLeave(requestId).unwrap()
      toast.success('Leave request deleted')
    } catch (error: any) {
      toast.error(error?.data?.error || 'Failed to delete leave request')
    }
  }

  const handleSubmitRequest = async () => {
    if (
      !requestForm.leaveType ||
      !requestForm.startDate ||
      !requestForm.endDate ||
      !requestForm.reason
    ) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await createLeave({
        workspaceId: currentWorkspace.id,
        leaveType: requestForm.leaveType,
        startDate: requestForm.startDate.toISOString(),
        endDate: requestForm.endDate.toISOString(),
        totalDays: calculateDays(requestForm.startDate, requestForm.endDate),
        reason: requestForm.reason,
        leavePolicyId: requestForm.leaveType,
      }).unwrap()

      toast.success('Leave request submitted successfully')
      setShowRequestDialog(false)
      setRequestForm({
        leaveType: '',
        startDate: undefined,
        endDate: undefined,
        reason: '',
      })
    } catch (error: any) {
      toast.error(error?.data?.error || 'Failed to submit leave request')
    }
  }

  const calculateDays = (start: Date | undefined, end: Date | undefined) => {
    if (!start || !end) return 0
    return differenceInDays(end, start) + 1
  }

  const filteredRequests = leaveRequests.filter(request => {
    const name = getEmployeeName(request)
    const policyName = getLeavePolicyName(request)
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policyName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType =
      leaveTypeFilter === 'all' || request.leaveType === leaveTypeFilter

    return matchesSearch && matchesType
  })

  const renderLeaveRequests = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Leave Requests</h3>
          <p className="text-sm text-muted-foreground">
            Manage employee leave applications
          </p>
        </div>
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Leave Request</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label>Leave Type</Label>
                <Select
                  value={requestForm.leaveType}
                  onValueChange={value =>
                    setRequestForm({ ...requestForm, leaveType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                    <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                    <SelectItem value="Personal Leave">
                      Personal Leave
                    </SelectItem>
                    <SelectItem value="Maternity Leave">
                      Maternity Leave
                    </SelectItem>
                    <SelectItem value="Emergency Leave">
                      Emergency Leave
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {requestForm.startDate
                          ? format(requestForm.startDate, 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={requestForm.startDate}
                        onSelect={date =>
                          setRequestForm({ ...requestForm, startDate: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {requestForm.endDate
                          ? format(requestForm.endDate, 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={requestForm.endDate}
                        onSelect={date =>
                          setRequestForm({ ...requestForm, endDate: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {requestForm.startDate && requestForm.endDate && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-sm font-medium">
                    Total Days:{' '}
                    {calculateDays(requestForm.startDate, requestForm.endDate)}
                  </p>
                </div>
              )}

              <div>
                <Label>Reason</Label>
                <Textarea
                  value={requestForm.reason}
                  onChange={e =>
                    setRequestForm({ ...requestForm, reason: e.target.value })
                  }
                  placeholder="Provide reason for leave..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmitRequest} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
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
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{statsData.pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Approved This Month
                  </p>
                  <p className="text-2xl font-bold">
                    {statsData.approvedThisMonth}
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
                  <p className="text-sm text-muted-foreground">
                    Days Used (Year)
                  </p>
                  <p className="text-2xl font-bold">
                    {statsData.totalDaysUsedThisYear}
                  </p>
                </div>
                <CalendarIcon className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Upcoming (30 days)
                  </p>
                  <p className="text-2xl font-bold">
                    {statsData.upcomingLeaves}
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
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
            placeholder="Search requests..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
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

      {/* Rejection Dialog */}
      <Dialog
        open={!!rejectDialogId}
        onOpenChange={open => {
          if (!open) {
            setRejectDialogId(null)
            setRejectionReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogId(null)
                  setRejectionReason('')
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  rejectDialogId && handleRejectRequest(rejectDialogId)
                }
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex h-48 items-center justify-center">
              <div className="text-center">
                <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
                <p className="text-muted-foreground">
                  Failed to load leave requests
                </p>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex h-48 items-center justify-center">
              <div className="text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">No leave requests found</p>
              </div>
            </div>
          ) : (
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
                {filteredRequests.map(request => (
                  <TableRow key={request._id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getEmployeeInitials(request)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {getEmployeeName(request)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getLeavePolicyName(request)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {request.totalDays} days
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(request.startDate), 'MMM dd')} -{' '}
                          {format(new Date(request.endDate), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setSelectedRequest(request)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {request.status === 'pending' && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleApproveRequest(request._id)
                                }
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setRejectDialogId(request._id)}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteRequest(request._id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
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
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedRequest}
        onOpenChange={open => {
          if (!open) setSelectedRequest(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Employee</Label>
                  <p className="font-medium">
                    {getEmployeeName(selectedRequest)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Leave Type</Label>
                  <p className="font-medium">
                    {getLeavePolicyName(selectedRequest)}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Start Date</Label>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.startDate), 'PPP')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">End Date</Label>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.endDate), 'PPP')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Days</Label>
                  <p className="font-medium">{selectedRequest.totalDays}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p className="font-medium">{selectedRequest.reason}</p>
              </div>
              {selectedRequest.rejectionReason && (
                <div>
                  <Label className="text-muted-foreground">
                    Rejection Reason
                  </Label>
                  <p className="font-medium text-red-600">
                    {selectedRequest.rejectionReason}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )

  const renderLeavePolicies = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Leave Policies</h3>
          <p className="text-sm text-muted-foreground">
            Leave type breakdown for this year
          </p>
        </div>
      </div>

      {statsData?.leaveTypeBreakdown &&
      statsData.leaveTypeBreakdown.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {statsData.leaveTypeBreakdown.map(item => (
            <Card key={item._id}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Badge className="bg-blue-100 text-blue-800">
                    {item._id}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Requests:</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total days used:
                    </span>
                    <span className="font-medium">{item.totalDays}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <div className="text-center">
              <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                No leave data available yet
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderLeaveBalance = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Leave Summary</h3>
          <p className="text-sm text-muted-foreground">
            Yearly leave usage summary
          </p>
        </div>
      </div>

      {statsData ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Pending Requests
                </p>
                <p className="text-3xl font-bold text-yellow-600">
                  {statsData.pendingCount}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Approved This Month
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {statsData.approvedThisMonth}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Days Used</p>
                <p className="text-3xl font-bold text-blue-600">
                  {statsData.totalDaysUsedThisYear}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Upcoming Leaves</p>
                <p className="text-3xl font-bold text-purple-600">
                  {statsData.upcomingLeaves}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      )}
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
