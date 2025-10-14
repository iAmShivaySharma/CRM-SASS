'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  MoreVertical
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'

interface Employee {
  id: string
  name: string
  email: string
  phone: string
  position: string
  department: string
  hireDate: Date
  status: 'active' | 'inactive' | 'on_leave'
  avatar?: string
  workType: 'office' | 'remote' | 'hybrid'
  shift: string
  attendanceRate: number
  totalWorkHours: number
}

export function EmployeeList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Mock employee data
  const employees: Employee[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@company.com',
      phone: '+1 (555) 123-4567',
      position: 'Software Engineer',
      department: 'Engineering',
      hireDate: new Date('2022-01-15'),
      status: 'active',
      workType: 'hybrid',
      shift: 'Morning Shift (9:00 AM - 5:00 PM)',
      attendanceRate: 94.5,
      totalWorkHours: 1680
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      phone: '+1 (555) 234-5678',
      position: 'Product Manager',
      department: 'Product',
      hireDate: new Date('2021-08-22'),
      status: 'active',
      workType: 'remote',
      shift: 'Morning Shift (9:00 AM - 5:00 PM)',
      attendanceRate: 97.2,
      totalWorkHours: 1720
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike.johnson@company.com',
      phone: '+1 (555) 345-6789',
      position: 'Sales Representative',
      department: 'Sales',
      hireDate: new Date('2023-03-10'),
      status: 'active',
      workType: 'office',
      shift: 'Morning Shift (9:00 AM - 5:00 PM)',
      attendanceRate: 89.3,
      totalWorkHours: 1540
    },
    {
      id: '4',
      name: 'Sarah Wilson',
      email: 'sarah.wilson@company.com',
      phone: '+1 (555) 456-7890',
      position: 'HR Specialist',
      department: 'Human Resources',
      hireDate: new Date('2022-06-01'),
      status: 'on_leave',
      workType: 'office',
      shift: 'Morning Shift (9:00 AM - 5:00 PM)',
      attendanceRate: 91.8,
      totalWorkHours: 1620
    },
    {
      id: '5',
      name: 'Tom Brown',
      email: 'tom.brown@company.com',
      phone: '+1 (555) 567-8901',
      position: 'Marketing Coordinator',
      department: 'Marketing',
      hireDate: new Date('2023-01-20'),
      status: 'active',
      workType: 'hybrid',
      shift: 'Morning Shift (9:00 AM - 5:00 PM)',
      attendanceRate: 92.7,
      totalWorkHours: 1580
    }
  ]

  const departments = ['all', 'Engineering', 'Product', 'Sales', 'Human Resources', 'Marketing']

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'inactive':
        return <Badge className="bg-red-100 text-red-800">Inactive</Badge>
      case 'on_leave':
        return <Badge className="bg-yellow-100 text-yellow-800">On Leave</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getWorkTypeBadge = (workType: string) => {
    switch (workType) {
      case 'office':
        return <Badge variant="outline">🏢 Office</Badge>
      case 'remote':
        return <Badge variant="outline">🏠 Remote</Badge>
      case 'hybrid':
        return <Badge variant="outline">🔄 Hybrid</Badge>
      default:
        return <Badge variant="outline">{workType}</Badge>
    }
  }

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         employee.position.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter

    return matchesSearch && matchesDepartment && matchesStatus
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Employee Management</span>
          </CardTitle>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>
                  {dept === 'all' ? 'All Departments' : dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Employee Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Work Type</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Attendance Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={employee.avatar} />
                        <AvatarFallback>
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center space-x-2">
                          <Mail className="h-3 w-3" />
                          <span>{employee.email}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{employee.position}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{employee.department}</Badge>
                  </TableCell>
                  <TableCell>
                    {getWorkTypeBadge(employee.workType)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>{format(employee.hireDate, 'MMM dd, yyyy')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-medium ${getAttendanceRateColor(employee.attendanceRate)}`}>
                      {employee.attendanceRate}%
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(employee.status)}
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
                          Edit Employee
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Clock className="h-4 w-4 mr-2" />
                          View Attendance
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Message
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Employee
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}