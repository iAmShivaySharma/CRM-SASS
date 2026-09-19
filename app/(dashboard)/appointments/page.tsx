'use client'

import { useState, useMemo } from 'react'
import { useAppSelector } from '@/lib/hooks'
import {
  Loader2,
  CalendarCheck,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Share2,
  Clock,
  User,
  Mail,
  Phone,
  Building2,
  Search,
} from 'lucide-react'
import {
  useGetAppointmentsQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useDeleteAppointmentMutation,
  type Appointment,
} from '@/lib/api/appointmentApi'
import {
  useGetLeadsQuery,
  useGetLeadStatusesQuery,
  type Lead,
  type LeadStatus,
} from '@/lib/api/mongoApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  SheetFooter,
} from '@/components/ui/sheet'
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
import { toast } from 'sonner'

const FALLBACK_STATUSES = [
  { id: 'pending', name: 'Pending', color: '#a1a1aa' },
  { id: 'confirmed', name: 'Confirmed', color: '#22c55e' },
  { id: 'cancelled', name: 'Cancelled', color: '#ef4444' },
  { id: 'completed', name: 'Completed', color: '#3b82f6' },
  { id: 'no_show', name: 'No Show', color: '#f97316' },
]

type FilterTab = 'all' | 'upcoming' | 'past' | 'cancelled'

interface FormState {
  customerName: string
  customerPhone: string
  customerEmail: string
  serviceName: string
  startTime: string
  duration: number
  price: number
  assignedTo: string
  notes: string
  status: string
  leadId: string
}

const defaultForm: FormState = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  serviceName: '',
  startTime: '',
  duration: 60,
  price: 0,
  assignedTo: '',
  notes: '',
  status: 'pending',
  leadId: '',
}

export default function AppointmentsPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const workspaceId = currentWorkspace?.id ?? ''

  const { data, isLoading } = useGetAppointmentsQuery(
    { workspaceId },
    { skip: !currentWorkspace }
  )

  const { data: leadsData } = useGetLeadsQuery(
    { workspaceId, limit: 200 },
    { skip: !currentWorkspace }
  )

  const { data: statusesData } = useGetLeadStatusesQuery(workspaceId, {
    skip: !currentWorkspace,
  })

  const [createAppointment, { isLoading: isCreating }] =
    useCreateAppointmentMutation()
  const [updateAppointment, { isLoading: isUpdating }] =
    useUpdateAppointmentMutation()
  const [deleteAppointment, { isLoading: isDeleting }] =
    useDeleteAppointmentMutation()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null)
  const [inputMode, setInputMode] = useState<'lead' | 'manual'>('manual')
  const [leadSearch, setLeadSearch] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')

  const statuses = useMemo(() => {
    if (statusesData?.statuses && statusesData.statuses.length > 0) {
      return statusesData.statuses
    }
    return FALLBACK_STATUSES as Pick<LeadStatus, 'id' | 'name' | 'color'>[]
  }, [statusesData])

  const leads = useMemo(() => leadsData?.leads ?? [], [leadsData])

  const filteredLeads = useMemo(() => {
    if (!leadSearch.trim()) return leads.slice(0, 20)
    const q = leadSearch.toLowerCase()
    return leads
      .filter(
        l =>
          l.name.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q)
      )
      .slice(0, 20)
  }, [leads, leadSearch])

  const appointments = useMemo(() => data?.appointments ?? [], [data])

  const now = new Date()

  const filteredAppointments = useMemo(() => {
    switch (filterTab) {
      case 'upcoming':
        return appointments.filter(
          a => new Date(`${a.date}T${a.startTime}`) >= now
        )
      case 'past':
        return appointments.filter(
          a =>
            new Date(`${a.date}T${a.startTime}`) < now &&
            a.status !== 'cancelled'
        )
      case 'cancelled':
        return appointments.filter(a => a.status === 'cancelled')
      default:
        return appointments
    }
  }, [appointments, filterTab])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of appointments) {
      counts[a.status] = (counts[a.status] ?? 0) + 1
    }
    return counts
  }, [appointments])

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    const found = statuses.find(
      s => s.name.toLowerCase() === status.toLowerCase() || s.id === status
    )
    return found?.color ?? '#a1a1aa'
  }

  const getStatusName = (status: string) => {
    const found = statuses.find(
      s => s.name.toLowerCase() === status.toLowerCase() || s.id === status
    )
    return found?.name ?? status
  }

  const getMeetingLink = (appointmentId: string) =>
    `${window.location.origin}/meet/${appointmentId}`

  const copyMeetingLink = (appointmentId: string) => {
    navigator.clipboard.writeText(getMeetingLink(appointmentId))
    toast.success('Meeting link copied to clipboard')
  }

  const getLinkedLead = (a: Appointment): Lead | undefined => {
    return leads.find(l => l.name === a.clientName || l.email === a.clientEmail)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(defaultForm)
    setInputMode('manual')
    setLeadSearch('')
    setSheetOpen(true)
  }

  const openEdit = (a: Appointment) => {
    setEditingId(a._id)
    setForm({
      customerName: a.clientName ?? '',
      customerPhone: a.clientPhone ?? '',
      customerEmail: a.clientEmail ?? '',
      serviceName: a.serviceId ?? '',
      startTime: a.startTime ?? '',
      duration: 60,
      price: 0,
      assignedTo: a.staffId ?? '',
      notes: a.notes ?? '',
      status: a.status,
      leadId: '',
    })
    setInputMode('manual')
    setLeadSearch('')
    setSheetOpen(true)
  }

  const selectLead = (lead: Lead) => {
    setForm(f => ({
      ...f,
      customerName: lead.name,
      customerEmail: lead.email ?? '',
      customerPhone: lead.phone ?? '',
      leadId: lead.id,
    }))
    setLeadSearch(lead.name)
  }

  const handleSubmit = async () => {
    if (!form.customerName || !form.serviceName || !form.startTime) {
      toast.error('Please fill in required fields')
      return
    }

    const payload = {
      workspaceId,
      clientName: form.customerName,
      clientPhone: form.customerPhone,
      clientEmail: form.customerEmail,
      serviceId: form.serviceName,
      startTime: form.startTime,
      staffId: form.assignedTo,
      notes: form.notes,
      status: form.status as Appointment['status'],
    }

    try {
      if (editingId) {
        await updateAppointment({ id: editingId, ...payload }).unwrap()
        toast.success('Appointment updated')
      } else {
        const result = await createAppointment(payload).unwrap()
        const link = getMeetingLink(result.appointment._id)
        toast.success('Appointment created', {
          description: `Meeting link: ${link}`,
          action: {
            label: 'Copy Link',
            onClick: () => {
              navigator.clipboard.writeText(link)
              toast.success('Link copied')
            },
          },
        })
      }
      setSheetOpen(false)
    } catch {
      toast.error(
        editingId
          ? 'Failed to update appointment'
          : 'Failed to create appointment'
      )
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteAppointment({ id: deleteTarget._id, workspaceId }).unwrap()
      toast.success('Appointment deleted')
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete appointment')
    }
  }

  const isSaving = isCreating || isUpdating

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Appointment
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {statuses.map(s => (
          <div key={s.id} className="rounded-lg border bg-card p-3 text-center">
            <div className="mb-1 flex items-center justify-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="truncate text-xs font-medium text-muted-foreground">
                {s.name}
              </span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {statusCounts[s.name.toLowerCase()] ?? statusCounts[s.id] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              filterTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No appointments found.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAppointments.map(a => {
              const linkedLead = getLinkedLead(a)
              const color = getStatusColor(a.status)

              return (
                <div
                  key={a._id}
                  className="space-y-3 rounded-lg border bg-background p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {a.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.serviceId}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 border text-xs"
                      style={{ borderColor: color, color }}
                    >
                      <span
                        className="mr-1.5 h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {getStatusName(a.status)}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
                      <span>{a.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {a.startTime} &ndash; {a.endTime}
                      </span>
                    </div>
                    {a.clientEmail && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{a.clientEmail}</span>
                      </div>
                    )}
                    {a.clientPhone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{a.clientPhone}</span>
                      </div>
                    )}
                  </div>

                  {linkedLead && (
                    <div className="space-y-1 rounded-md bg-muted px-3 py-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <User className="h-3 w-3" />
                        Linked Lead
                      </div>
                      {linkedLead.company && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {linkedLead.company}
                        </div>
                      )}
                      {linkedLead.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {linkedLead.email}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1 border-t pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => copyMeetingLink(a._id)}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Copy Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `Join my meeting: ${getMeetingLink(a._id)}`
                        )
                        toast.success('Share text copied to clipboard')
                      }}
                    >
                      <Share2 className="mr-1 h-3 w-3" />
                      Share
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEdit(a)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setDeleteTarget(a)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editingId ? 'Edit Appointment' : 'Add Appointment'}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="flex rounded-lg border bg-muted p-0.5">
              <button
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  inputMode === 'lead'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
                onClick={() => setInputMode('lead')}
              >
                Select from Leads
              </button>
              <button
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  inputMode === 'manual'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
                onClick={() => setInputMode('manual')}
              >
                Enter Manually
              </button>
            </div>

            {inputMode === 'lead' ? (
              <div className="space-y-2">
                <Label>Search Leads</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={leadSearch}
                    onChange={e => {
                      setLeadSearch(e.target.value)
                      if (form.leadId) {
                        setForm(f => ({ ...f, leadId: '' }))
                      }
                    }}
                    placeholder="Search by name, email, or company..."
                    className="pl-9"
                  />
                </div>
                {form.leadId ? (
                  <div className="rounded-md border bg-primary/10 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {form.customerName}
                        </p>
                        {form.customerEmail && (
                          <p className="text-xs text-muted-foreground">
                            {form.customerEmail}
                          </p>
                        )}
                        {form.customerPhone && (
                          <p className="text-xs text-muted-foreground">
                            {form.customerPhone}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setForm(f => ({
                            ...f,
                            customerName: '',
                            customerEmail: '',
                            customerPhone: '',
                            leadId: '',
                          }))
                          setLeadSearch('')
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-md border">
                    {filteredLeads.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        No leads found
                      </p>
                    ) : (
                      filteredLeads.map(lead => (
                        <button
                          key={lead.id}
                          className="w-full border-b px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-muted"
                          onClick={() => selectLead(lead)}
                        >
                          <p className="text-sm font-medium text-foreground">
                            {lead.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[lead.email, lead.company]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <Label>
                    Customer Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.customerName}
                    onChange={e =>
                      setForm(f => ({ ...f, customerName: e.target.value }))
                    }
                    placeholder="Full name"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Customer Phone</Label>
                  <Input
                    value={form.customerPhone}
                    onChange={e =>
                      setForm(f => ({ ...f, customerPhone: e.target.value }))
                    }
                    placeholder="+1 555 000 0000"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Customer Email</Label>
                  <Input
                    type="email"
                    value={form.customerEmail}
                    onChange={e =>
                      setForm(f => ({ ...f, customerEmail: e.target.value }))
                    }
                    placeholder="email@example.com"
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label>
                Service Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.serviceName}
                onChange={e =>
                  setForm(f => ({ ...f, serviceName: e.target.value }))
                }
                placeholder="Service or product name"
              />
            </div>

            <div className="space-y-1">
              <Label>
                Start Time <span className="text-destructive">*</span>
              </Label>
              <Input
                type="datetime-local"
                value={form.startTime}
                onChange={e =>
                  setForm(f => ({ ...f, startTime: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min={1}
                value={form.duration}
                onChange={e =>
                  setForm(f => ({ ...f, duration: Number(e.target.value) }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Price</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={e =>
                  setForm(f => ({ ...f, price: Number(e.target.value) }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Assigned To</Label>
              <Input
                value={form.assignedTo}
                onChange={e =>
                  setForm(f => ({ ...f, assignedTo: e.target.value }))
                }
                placeholder="Staff member name or ID"
              />
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={v => setForm(f => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Save Changes' : 'Create Appointment'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={open => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the appointment for &quot;
              {deleteTarget?.clientName}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
