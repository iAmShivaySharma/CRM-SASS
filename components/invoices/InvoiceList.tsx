'use client'

import { useState } from 'react'
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Eye,
  Send,
  IndianRupee,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  useGetInvoicesQuery,
  useDeleteInvoiceMutation,
  useSendInvoiceMutation,
  useGetInvoiceAnalyticsQuery,
  type InvoiceType,
} from '@/lib/api/invoiceApi'
import { InvoiceForm } from './InvoiceForm'
import { InvoiceDetailsSheet } from './InvoiceDetailsSheet'

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    icon: FileText,
  },
  sent: {
    label: 'Sent',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Send,
  },
  viewed: {
    label: 'Viewed',
    color:
      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    icon: Eye,
  },
  paid: {
    label: 'Paid',
    color:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  partially_paid: {
    label: 'Partial',
    color:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: CreditCard,
  },
  overdue: {
    label: 'Overdue',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
    icon: XCircle,
  },
}

export function InvoiceList() {
  const currentWorkspace = useAppSelector(
    (state: any) => state.workspace?.currentWorkspace
  )
  const workspaceId = currentWorkspace?.id || currentWorkspace?._id || ''

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceType | null>(
    null
  )
  const [deleteTarget, setDeleteTarget] = useState<InvoiceType | null>(null)

  const { data, isLoading } = useGetInvoicesQuery(
    {
      workspaceId,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: searchTerm || undefined,
      page: currentPage,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    { skip: !workspaceId }
  )

  const { data: analytics } = useGetInvoiceAnalyticsQuery(
    { workspaceId },
    { skip: !workspaceId }
  )

  const [deleteInvoice] = useDeleteInvoiceMutation()
  const [sendInvoice] = useSendInvoiceMutation()

  const invoices = data?.invoices || []
  const pagination = data?.pagination

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteInvoice({
        id: deleteTarget.id,
        workspaceId,
      }).unwrap()
      toast.success('Invoice deleted')
      setDeleteTarget(null)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete invoice')
    }
  }

  const handleSend = async (invoice: InvoiceType) => {
    try {
      await sendInvoice({
        invoiceId: invoice.id,
        workspaceId,
        channel: 'email',
      }).unwrap()
      toast.success('Invoice sent')
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to send invoice')
    }
  }

  if (!workspaceId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Please select a workspace first</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            GST-compliant invoicing and payment tracking
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {/* Stats */}
      {analytics && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total Invoiced</p>
              <p className="text-lg font-bold">
                ₹{(analytics.overview.totalAmount / 1000).toFixed(0)}K
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="text-lg font-bold text-green-600">
                ₹{(analytics.overview.totalPaid / 1000).toFixed(0)}K
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-lg font-bold text-orange-600">
                ₹{(analytics.overview.totalDue / 1000).toFixed(0)}K
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">GST Collected</p>
              <p className="text-lg font-bold text-blue-600">
                ₹{(analytics.overview.totalTax / 1000).toFixed(0)}K
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={v => {
            setStatusFilter(v)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-1 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partially_paid">Partial</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No invoices found</p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Create your first invoice
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(invoice => {
                  const config =
                    statusConfig[invoice.status] || statusConfig.draft
                  const StatusIcon = config.icon
                  return (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell>
                        {new Date(invoice.invoiceDate).toLocaleDateString(
                          'en-IN',
                          { day: 'numeric', month: 'short', year: '2-digit' }
                        )}
                      </TableCell>
                      <TableCell>
                        {invoice.dueDate
                          ? new Date(invoice.dueDate).toLocaleDateString(
                              'en-IN',
                              {
                                day: 'numeric',
                                month: 'short',
                                year: '2-digit',
                              }
                            )
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${config.color}`}
                        >
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{invoice.grandTotal.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.amountDue > 0 ? (
                          <span className="font-medium text-orange-600">
                            ₹{invoice.amountDue.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-green-600">Paid</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={e => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={e => {
                                e.stopPropagation()
                                setSelectedInvoice(invoice)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            {invoice.status === 'draft' && (
                              <DropdownMenuItem
                                onClick={e => {
                                  e.stopPropagation()
                                  handleSend(invoice)
                                }}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Send
                              </DropdownMenuItem>
                            )}
                            {invoice.status !== 'paid' &&
                              invoice.status !== 'cancelled' && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={e => {
                                    e.stopPropagation()
                                    setDeleteTarget(invoice)
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {pagination.total} invoices
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrev}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {pagination.page} / {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNext}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
          </DialogHeader>
          <InvoiceForm
            workspaceId={workspaceId}
            onSuccess={() => setIsCreateOpen(false)}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Invoice Details Sheet */}
      {selectedInvoice && (
        <InvoiceDetailsSheet
          invoice={selectedInvoice}
          workspaceId={workspaceId}
          open={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice{' '}
              {deleteTarget?.invoiceNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
