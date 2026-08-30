'use client'

import { useState } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Loader2,
  AlertTriangle,
  Calendar,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { useAppSelector } from '@/lib/hooks'
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useGetDocumentsQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  type ComplianceTaskRecord,
  type ComplianceDocumentRecord,
} from '@/lib/api/complianceApi'

const TASK_CATEGORIES = [
  { value: 'llp_mca', label: 'LLP / MCA' },
  { value: 'gst', label: 'GST' },
  { value: 'tds', label: 'TDS' },
  { value: 'income_tax', label: 'Income Tax' },
  { value: 'fssai', label: 'FSSAI' },
  { value: 'trademark', label: 'Trademark' },
  { value: 'banking', label: 'Banking' },
  { value: 'other', label: 'Other' },
]

const TASK_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'not_applicable', label: 'N/A' },
]

const DOC_CATEGORIES = [
  { value: 'license', label: 'License' },
  { value: 'registration', label: 'Registration' },
  { value: 'filing', label: 'Filing' },
  { value: 'agreement', label: 'Agreement' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'tax_return', label: 'Tax Return' },
  { value: 'audit_report', label: 'Audit Report' },
  { value: 'bank', label: 'Bank' },
  { value: 'dsc', label: 'DSC' },
  { value: 'other', label: 'Other' },
]

const PORTAL_URLS: Record<string, string> = {
  llp_mca: 'https://www.mca.gov.in',
  gst: 'https://www.gst.gov.in',
  tds: 'https://www.tdscpc.gov.in',
  income_tax: 'https://www.incometax.gov.in',
  fssai: 'https://foscos.fssai.gov.in',
}

const FY_2025_26_TASKS = [
  {
    title: 'LLP-11 Annual Return',
    dueDate: '2026-05-30',
    category: 'llp_mca',
    financialYear: '2025-26',
  },
  {
    title: 'LLP-8 Statement of Accounts',
    dueDate: '2026-10-30',
    category: 'llp_mca',
    financialYear: '2025-26',
  },
  {
    title: 'DIR-3 KYC (Designated Partners)',
    dueDate: '2026-09-30',
    category: 'llp_mca',
    financialYear: '2025-26',
  },
  {
    title: 'ITR-5 Filing (non-audit)',
    dueDate: '2026-07-31',
    category: 'income_tax',
    financialYear: '2025-26',
  },
  {
    title: 'ITR-5 Filing (audit cases)',
    dueDate: '2026-10-31',
    category: 'income_tax',
    financialYear: '2025-26',
  },
  {
    title: 'Tax Audit Form 3CB/3CD',
    dueDate: '2026-09-30',
    category: 'income_tax',
    financialYear: '2025-26',
  },
  {
    title: 'Advance Tax Q1 (15%)',
    dueDate: '2026-06-15',
    category: 'income_tax',
    financialYear: '2025-26',
    period: 'Q1',
  },
  {
    title: 'Advance Tax Q2 (45%)',
    dueDate: '2026-09-15',
    category: 'income_tax',
    financialYear: '2025-26',
    period: 'Q2',
  },
  {
    title: 'Advance Tax Q3 (75%)',
    dueDate: '2026-12-15',
    category: 'income_tax',
    financialYear: '2025-26',
    period: 'Q3',
  },
  {
    title: 'Advance Tax Q4 (100%)',
    dueDate: '2027-03-15',
    category: 'income_tax',
    financialYear: '2025-26',
    period: 'Q4',
  },
  {
    title: 'TDS Return Q4 (Jan–Mar)',
    dueDate: '2026-05-31',
    category: 'tds',
    financialYear: '2025-26',
    period: 'Q4 FY25-26',
  },
  {
    title: 'TDS Return Q1 (Apr–Jun)',
    dueDate: '2026-07-31',
    category: 'tds',
    financialYear: '2025-26',
    period: 'Q1',
  },
  {
    title: 'TDS Return Q2 (Jul–Sep)',
    dueDate: '2026-10-31',
    category: 'tds',
    financialYear: '2025-26',
    period: 'Q2',
  },
  {
    title: 'TDS Return Q3 (Oct–Dec)',
    dueDate: '2027-01-31',
    category: 'tds',
    financialYear: '2025-26',
    period: 'Q3',
  },
  {
    title: 'GSTR-9 Annual Return',
    dueDate: '2026-12-31',
    category: 'gst',
    financialYear: '2025-26',
  },
  {
    title: 'FSSAI Annual Return',
    dueDate: '2026-12-31',
    category: 'fssai',
    financialYear: '2025-26',
  },
]

function categoryBadgeClass(category: string) {
  if (category === 'llp_mca' || category === 'fssai')
    return 'bg-primary/10 text-primary hover:bg-primary/10'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

function taskStatusClass(status: string) {
  if (status === 'overdue') return 'text-destructive'
  if (status === 'completed') return 'text-primary'
  return 'text-muted-foreground'
}

function docStatusBadgeClass(status: string) {
  if (status === 'valid')
    return 'bg-primary/10 text-primary hover:bg-primary/10'
  if (status === 'expired') return 'text-destructive bg-muted hover:bg-muted'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

const emptyTaskForm = {
  title: '',
  description: '',
  category: 'llp_mca',
  dueDate: '',
  financialYear: '2025-26',
  period: '',
  status: 'pending',
  completedDate: '',
  referenceNumber: '',
  amount: '',
  notes: '',
  reminderDays: '7',
  isRecurring: false,
  recurringFrequency: '',
  portalUrl: '',
}

const emptyDocForm = {
  name: '',
  category: 'license',
  documentNumber: '',
  issuedBy: '',
  issueDate: '',
  expiryDate: '',
  status: 'valid',
  documentUrl: '',
  retentionYears: '',
  notes: '',
}

export default function CompliancePage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const workspaceId = currentWorkspace?.id || ''

  const [activeTab, setActiveTab] = useState('tasks')
  const [taskStatusFilter, setTaskStatusFilter] = useState('')
  const [taskCategoryFilter, setTaskCategoryFilter] = useState('')
  const [taskPage, setTaskPage] = useState(1)
  const [docPage, setDocPage] = useState(1)

  const [taskSheetOpen, setTaskSheetOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ComplianceTaskRecord | null>(
    null
  )
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [taskForm, setTaskForm] = useState(emptyTaskForm)

  const [docSheetOpen, setDocSheetOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<ComplianceDocumentRecord | null>(
    null
  )
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null)
  const [docForm, setDocForm] = useState(emptyDocForm)

  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const { data: tasksData, isLoading: tasksLoading } = useGetTasksQuery(
    {
      workspaceId,
      page: taskPage,
      limit: 50,
      status: taskStatusFilter || undefined,
      category: taskCategoryFilter || undefined,
    },
    { skip: !workspaceId }
  )

  const { data: docsData, isLoading: docsLoading } = useGetDocumentsQuery(
    { workspaceId, page: docPage, limit: 50 },
    { skip: !workspaceId }
  )

  const { data: overdueData } = useGetTasksQuery(
    { workspaceId, status: 'overdue', limit: 1 },
    { skip: !workspaceId }
  )

  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const { data: dueSoonData } = useGetTasksQuery(
    {
      workspaceId,
      dateFrom: now.toISOString().split('T')[0],
      dateTo: weekFromNow.toISOString().split('T')[0],
      limit: 1,
    },
    { skip: !workspaceId }
  )

  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const { data: expiringSoonDocs } = useGetDocumentsQuery(
    { workspaceId, status: 'expiring_soon', limit: 1 },
    { skip: !workspaceId }
  )

  const [createTask, { isLoading: creatingTask }] = useCreateTaskMutation()
  const [updateTask, { isLoading: updatingTask }] = useUpdateTaskMutation()
  const [deleteTask, { isLoading: deletingTask }] = useDeleteTaskMutation()
  const [createDocument, { isLoading: creatingDoc }] =
    useCreateDocumentMutation()
  const [updateDocument, { isLoading: updatingDoc }] =
    useUpdateDocumentMutation()
  const [deleteDocument, { isLoading: deletingDoc }] =
    useDeleteDocumentMutation()

  const tasks = tasksData?.tasks || []
  const docs = docsData?.documents || []
  const taskPagination = tasksData?.pagination
  const docPagination = docsData?.pagination

  const overdueCount = overdueData?.pagination?.total || 0
  const dueSoonCount = dueSoonData?.pagination?.total || 0
  const activeDocsCount = docsData?.pagination?.total || 0
  const expiringSoonCount = expiringSoonDocs?.pagination?.total || 0

  function openCreateTask() {
    setEditingTask(null)
    setTaskForm(emptyTaskForm)
    setTaskSheetOpen(true)
  }

  function openEditTask(task: ComplianceTaskRecord) {
    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description || '',
      category: task.category,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      financialYear: task.financialYear,
      period: task.period || '',
      status: task.status,
      completedDate: task.completedDate ? task.completedDate.split('T')[0] : '',
      referenceNumber: task.referenceNumber || '',
      amount: task.amount?.toString() || '',
      notes: task.notes || '',
      reminderDays: task.reminderDays.toString(),
      isRecurring: task.isRecurring,
      recurringFrequency: task.recurringFrequency || '',
      portalUrl: task.portalUrl || '',
    })
    setTaskSheetOpen(true)
  }

  async function handleTaskSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: any = {
      workspaceId,
      title: taskForm.title,
      description: taskForm.description || undefined,
      category: taskForm.category as any,
      dueDate: taskForm.dueDate,
      financialYear: taskForm.financialYear,
      period: taskForm.period || undefined,
      status: taskForm.status as any,
      completedDate: taskForm.completedDate || undefined,
      referenceNumber: taskForm.referenceNumber || undefined,
      amount: taskForm.amount ? parseFloat(taskForm.amount) : undefined,
      notes: taskForm.notes || undefined,
      reminderDays: parseInt(taskForm.reminderDays) || 7,
      isRecurring: taskForm.isRecurring,
      recurringFrequency: (taskForm.recurringFrequency as any) || undefined,
      portalUrl: taskForm.portalUrl || undefined,
    }
    try {
      if (editingTask) {
        await updateTask({ id: editingTask._id, ...payload }).unwrap()
        toast.success('Task updated successfully')
      } else {
        await createTask(payload).unwrap()
        toast.success('Task created successfully')
      }
      setTaskSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save task')
    }
  }

  async function handleDeleteTask() {
    if (!deleteTaskId) return
    try {
      await deleteTask({ id: deleteTaskId, workspaceId }).unwrap()
      toast.success('Task deleted')
      setDeleteTaskId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete task')
    }
  }

  function openCreateDoc() {
    setEditingDoc(null)
    setDocForm(emptyDocForm)
    setDocSheetOpen(true)
  }

  function openEditDoc(doc: ComplianceDocumentRecord) {
    setEditingDoc(doc)
    setDocForm({
      name: doc.name,
      category: doc.category,
      documentNumber: doc.documentNumber || '',
      issuedBy: doc.issuedBy || '',
      issueDate: doc.issueDate ? doc.issueDate.split('T')[0] : '',
      expiryDate: doc.expiryDate ? doc.expiryDate.split('T')[0] : '',
      status: doc.status,
      documentUrl: doc.documentUrl || '',
      retentionYears: doc.retentionYears?.toString() || '',
      notes: doc.notes || '',
    })
    setDocSheetOpen(true)
  }

  async function handleDocSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: any = {
      workspaceId,
      name: docForm.name,
      category: docForm.category as any,
      documentNumber: docForm.documentNumber || undefined,
      issuedBy: docForm.issuedBy || undefined,
      issueDate: docForm.issueDate || undefined,
      expiryDate: docForm.expiryDate || undefined,
      status: docForm.status as any,
      documentUrl: docForm.documentUrl || undefined,
      retentionYears: docForm.retentionYears
        ? parseInt(docForm.retentionYears)
        : undefined,
      notes: docForm.notes || undefined,
    }
    try {
      if (editingDoc) {
        await updateDocument({ id: editingDoc._id, ...payload }).unwrap()
        toast.success('Document updated successfully')
      } else {
        await createDocument(payload).unwrap()
        toast.success('Document created successfully')
      }
      setDocSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save document')
    }
  }

  async function handleDeleteDoc() {
    if (!deleteDocId) return
    try {
      await deleteDocument({ id: deleteDocId, workspaceId }).unwrap()
      toast.success('Document deleted')
      setDeleteDocId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete document')
    }
  }

  async function handleSeedCalendar() {
    setSeedConfirmOpen(false)
    setSeeding(true)
    let created = 0
    let failed = 0
    for (const task of FY_2025_26_TASKS) {
      try {
        await createTask({
          workspaceId,
          title: task.title,
          category: task.category as any,
          dueDate: task.dueDate,
          financialYear: task.financialYear,
          period: (task as any).period,
          portalUrl: PORTAL_URLS[task.category] || undefined,
          reminderDays: 7,
          isRecurring: false,
          status: 'pending',
        }).unwrap()
        created++
      } catch {
        failed++
      }
    }
    setSeeding(false)
    if (failed === 0) {
      toast.success(`FY 2025-26 calendar loaded — ${created} tasks created`)
    } else {
      toast.error(
        `Created ${created} tasks, ${failed} failed (may already exist)`
      )
    }
  }

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">
            Please select a workspace to manage compliance.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Company Compliance
          </h1>
          <p className="text-muted-foreground">
            Track statutory filings, licenses and documents for{' '}
            {currentWorkspace.name}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate action
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueSoonCount}</div>
            <p className="text-xs text-muted-foreground">Within next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Documents
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDocsCount}</div>
            <p className="text-xs text-muted-foreground">
              In document registry
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringSoonCount}</div>
            <p className="text-xs text-muted-foreground">
              Documents expiring in 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="tasks">Compliance Tasks</TabsTrigger>
          <TabsTrigger value="documents">Document Registry</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap gap-2">
              <Select
                value={taskStatusFilter || 'all'}
                onValueChange={v => {
                  setTaskStatusFilter(v === 'all' ? '' : v)
                  setTaskPage(1)
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {TASK_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={taskCategoryFilter || 'all'}
                onValueChange={v => {
                  setTaskCategoryFilter(v === 'all' ? '' : v)
                  setTaskPage(1)
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {TASK_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSeedConfirmOpen(true)}
                disabled={seeding}
              >
                {seeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Load FY 2025-26 Calendar
              </Button>
              <Button onClick={openCreateTask} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference No.</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasksLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-muted-foreground">
                          No compliance tasks found.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={openCreateTask}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Task
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSeedConfirmOpen(true)}
                          >
                            Load FY 2025-26 Calendar
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map(task => {
                    const isPastDue =
                      task.status !== 'completed' &&
                      task.status !== 'not_applicable' &&
                      new Date(task.dueDate) < now
                    return (
                      <TableRow key={task._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5">
                            {task.title}
                            {task.portalUrl && (
                              <a
                                href={task.portalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={categoryBadgeClass(task.category)}>
                            {TASK_CATEGORIES.find(
                              c => c.value === task.category
                            )?.label || task.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {task.period || '—'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              isPastDue ? 'font-medium text-destructive' : ''
                            }
                          >
                            {task.dueDate
                              ? format(new Date(task.dueDate), 'dd MMM yyyy')
                              : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-sm font-medium capitalize ${taskStatusClass(task.status)}`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {task.referenceNumber || '—'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditTask(task)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTaskId(task._id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {taskPagination && taskPagination.pages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {tasks.length} of {taskPagination.total} tasks
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!taskPagination.hasPrev}
                  onClick={() => setTaskPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!taskPagination.hasNext}
                  onClick={() => setTaskPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex items-center justify-between">
            <div />
            <Button onClick={openCreateDoc} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Document
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Document No.</TableHead>
                  <TableHead>Issued By</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : docs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No documents found. Add your first compliance document.
                    </TableCell>
                  </TableRow>
                ) : (
                  docs.map(doc => (
                    <TableRow key={doc._id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                        <Badge className="bg-muted capitalize text-muted-foreground hover:bg-muted">
                          {DOC_CATEGORIES.find(c => c.value === doc.category)
                            ?.label || doc.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {doc.documentNumber || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.issuedBy || '—'}
                      </TableCell>
                      <TableCell>
                        {doc.expiryDate
                          ? format(new Date(doc.expiryDate), 'dd MMM yyyy')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={docStatusBadgeClass(doc.status)}>
                          {doc.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDoc(doc)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteDocId(doc._id)}
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

          {docPagination && docPagination.pages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {docs.length} of {docPagination.total} documents
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!docPagination.hasPrev}
                  onClick={() => setDocPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!docPagination.hasNext}
                  onClick={() => setDocPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={taskSheetOpen} onOpenChange={setTaskSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {editingTask ? 'Edit Task' : 'Add Compliance Task'}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleTaskSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="taskTitle">Title *</Label>
              <Input
                id="taskTitle"
                value={taskForm.title}
                onChange={e =>
                  setTaskForm(p => ({ ...p, title: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select
                  value={taskForm.category}
                  onValueChange={v => setTaskForm(p => ({ ...p, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={taskForm.status}
                  onValueChange={v => setTaskForm(p => ({ ...p, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={taskForm.dueDate}
                  onChange={e =>
                    setTaskForm(p => ({ ...p, dueDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="financialYear">Financial Year *</Label>
                <Input
                  id="financialYear"
                  value={taskForm.financialYear}
                  placeholder="e.g. 2025-26"
                  onChange={e =>
                    setTaskForm(p => ({ ...p, financialYear: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="period">Period</Label>
                <Input
                  id="period"
                  value={taskForm.period}
                  placeholder="e.g. Q1, April 2026"
                  onChange={e =>
                    setTaskForm(p => ({ ...p, period: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="referenceNumber">Reference No.</Label>
                <Input
                  id="referenceNumber"
                  value={taskForm.referenceNumber}
                  placeholder="SRN, UDIN, Ack No."
                  onChange={e =>
                    setTaskForm(p => ({
                      ...p,
                      referenceNumber: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={taskForm.amount}
                  onChange={e =>
                    setTaskForm(p => ({ ...p, amount: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="completedDate">Completed Date</Label>
                <Input
                  id="completedDate"
                  type="date"
                  value={taskForm.completedDate}
                  onChange={e =>
                    setTaskForm(p => ({ ...p, completedDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="portalUrl">Filing Portal URL</Label>
              <Input
                id="portalUrl"
                value={taskForm.portalUrl}
                placeholder="https://..."
                onChange={e =>
                  setTaskForm(p => ({ ...p, portalUrl: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="taskNotes">Notes</Label>
              <Textarea
                id="taskNotes"
                value={taskForm.notes}
                onChange={e =>
                  setTaskForm(p => ({ ...p, notes: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTaskSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creatingTask || updatingTask}>
                {(creatingTask || updatingTask) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingTask ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={docSheetOpen} onOpenChange={setDocSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {editingDoc ? 'Edit Document' : 'Add Document'}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleDocSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="docName">Name *</Label>
              <Input
                id="docName"
                value={docForm.name}
                onChange={e =>
                  setDocForm(p => ({ ...p, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select
                  value={docForm.category}
                  onValueChange={v => setDocForm(p => ({ ...p, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={docForm.status}
                  onValueChange={v => setDocForm(p => ({ ...p, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="valid">Valid</SelectItem>
                    <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="documentNumber">Document No.</Label>
                <Input
                  id="documentNumber"
                  value={docForm.documentNumber}
                  onChange={e =>
                    setDocForm(p => ({ ...p, documentNumber: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="issuedBy">Issued By</Label>
                <Input
                  id="issuedBy"
                  value={docForm.issuedBy}
                  placeholder="FSSAI, MCA, CBDT..."
                  onChange={e =>
                    setDocForm(p => ({ ...p, issuedBy: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={docForm.issueDate}
                  onChange={e =>
                    setDocForm(p => ({ ...p, issueDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={docForm.expiryDate}
                  onChange={e =>
                    setDocForm(p => ({ ...p, expiryDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="documentUrl">Document URL</Label>
                <Input
                  id="documentUrl"
                  value={docForm.documentUrl}
                  placeholder="https://..."
                  onChange={e =>
                    setDocForm(p => ({ ...p, documentUrl: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="retentionYears">Retention (years)</Label>
                <Input
                  id="retentionYears"
                  type="number"
                  value={docForm.retentionYears}
                  onChange={e =>
                    setDocForm(p => ({ ...p, retentionYears: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="docNotes">Notes</Label>
              <Textarea
                id="docNotes"
                value={docForm.notes}
                onChange={e =>
                  setDocForm(p => ({ ...p, notes: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDocSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creatingDoc || updatingDoc}>
                {(creatingDoc || updatingDoc) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingDoc ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteTaskId}
        onOpenChange={open => !open && setDeleteTaskId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this compliance task. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingTask}
            >
              {deletingTask && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteDocId}
        onOpenChange={open => !open && setDeleteDocId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this document record. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDoc}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingDoc}
            >
              {deletingDoc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={seedConfirmOpen} onOpenChange={setSeedConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Load FY 2025-26 Compliance Calendar
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will create {FY_2025_26_TASKS.length} compliance tasks
              covering LLP filings, GST, TDS, Income Tax and FSSAI deadlines for
              FY 2025-26. Proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSeedCalendar}>
              Load Calendar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
