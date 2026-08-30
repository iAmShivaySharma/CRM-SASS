'use client'

import { useState } from 'react'
import {
  IndianRupee,
  Calendar,
  User,
  Send,
  CreditCard,
  Loader2,
  FileText,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  useGetInvoiceQuery,
  useRecordPaymentMutation,
  useSendInvoiceMutation,
  type InvoiceType,
} from '@/lib/api/invoiceApi'

interface InvoiceDetailsSheetProps {
  invoice: InvoiceType
  workspaceId: string
  open: boolean
  onClose: () => void
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export function InvoiceDetailsSheet({
  invoice,
  workspaceId,
  open,
  onClose,
}: InvoiceDetailsSheetProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  const { data } = useGetInvoiceQuery(
    { id: invoice.id, workspaceId },
    { skip: !open }
  )

  const [recordPayment, { isLoading: paymentLoading }] =
    useRecordPaymentMutation()
  const [sendInvoice, { isLoading: sendLoading }] = useSendInvoiceMutation()

  const fullInvoice = data?.invoice || invoice
  const payments = data?.payments || []

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) {
      toast.error('Enter a valid payment amount')
      return
    }

    try {
      await recordPayment({
        invoiceId: invoice.id,
        workspaceId,
        amount,
        paymentMethod,
        referenceNumber: paymentRef || undefined,
        notes: paymentNotes || undefined,
      }).unwrap()
      toast.success('Payment recorded')
      setShowPaymentDialog(false)
      setPaymentAmount('')
      setPaymentRef('')
      setPaymentNotes('')
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to record payment')
    }
  }

  const handleSend = async () => {
    try {
      await sendInvoice({
        invoiceId: invoice.id,
        workspaceId,
      }).unwrap()
      toast.success('Invoice sent')
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to send')
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={() => onClose()}>
        <SheetContent className="w-full p-0 sm:max-w-[520px]">
          <SheetHeader className="border-b p-4">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {fullInvoice.invoiceNumber}
                </SheetTitle>
                <Badge
                  variant="secondary"
                  className={`mt-1 text-xs capitalize ${statusColors[fullInvoice.status]}`}
                >
                  {fullInvoice.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-160px)]">
            <div className="space-y-4 p-4">
              {/* Amount */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Grand Total</p>
                  <p className="flex items-center text-2xl font-bold">
                    <IndianRupee className="h-5 w-5" />
                    {fullInvoice.grandTotal.toLocaleString('en-IN')}
                  </p>
                </div>
                {fullInvoice.amountDue > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Due</p>
                    <p className="text-lg font-bold text-orange-600">
                      ₹{fullInvoice.amountDue.toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>

              {/* Customer */}
              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {fullInvoice.customerName}
                  </span>
                </div>
                {fullInvoice.customerEmail && (
                  <p className="ml-6 text-sm text-muted-foreground">
                    {fullInvoice.customerEmail}
                  </p>
                )}
                {fullInvoice.customerGstin && (
                  <p className="ml-6 text-sm text-muted-foreground">
                    GSTIN: {fullInvoice.customerGstin}
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Invoice Date</p>
                  <p className="text-sm">
                    {new Date(fullInvoice.invoiceDate).toLocaleDateString(
                      'en-IN',
                      { day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  </p>
                </div>
                {fullInvoice.dueDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    <p className="text-sm">
                      {new Date(fullInvoice.dueDate).toLocaleDateString(
                        'en-IN',
                        { day: 'numeric', month: 'long', year: 'numeric' }
                      )}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Items */}
              <div>
                <h3 className="mb-2 text-sm font-semibold">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-right text-xs">Qty</TableHead>
                      <TableHead className="text-right text-xs">Rate</TableHead>
                      <TableHead className="text-right text-xs">GST</TableHead>
                      <TableHead className="text-right text-xs">
                        Amount
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(fullInvoice.items || []).map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">
                          {item.name}
                          {item.hsnSac && (
                            <span className="ml-1 text-muted-foreground">
                              ({item.hsnSac})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          ₹{item.rate}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {item.taxRate}%
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Tax Breakdown */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxable Amount</span>
                  <span>
                    ₹{fullInvoice.taxableAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                {fullInvoice.cgst > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CGST</span>
                    <span>₹{fullInvoice.cgst.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {fullInvoice.sgst > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SGST</span>
                    <span>₹{fullInvoice.sgst.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {fullInvoice.igst > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IGST</span>
                    <span>₹{fullInvoice.igst.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {fullInvoice.roundOff !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Round Off</span>
                    <span>₹{fullInvoice.roundOff}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Grand Total</span>
                  <span>₹{fullInvoice.grandTotal.toLocaleString('en-IN')}</span>
                </div>
                {fullInvoice.amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Paid</span>
                      <span>
                        -₹{fullInvoice.amountPaid.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-orange-600">
                      <span>Balance Due</span>
                      <span>
                        ₹{fullInvoice.amountDue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              {fullInvoice.status !== 'cancelled' && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    {fullInvoice.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={handleSend}
                        disabled={sendLoading}
                      >
                        {sendLoading ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-1 h-4 w-4" />
                        )}
                        Send
                      </Button>
                    )}
                    {fullInvoice.amountDue > 0 && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setPaymentAmount(String(fullInvoice.amountDue))
                          setShowPaymentDialog(true)
                        }}
                      >
                        <CreditCard className="mr-1 h-4 w-4" />
                        Record Payment
                      </Button>
                    )}
                  </div>
                </>
              )}

              {/* Payment History */}
              {payments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Payments</h3>
                    <div className="space-y-2">
                      {payments.map((payment: any) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between rounded-lg border p-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">
                              ₹{payment.amount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payment.paymentMethod.toUpperCase()} ·{' '}
                              {new Date(payment.paymentDate).toLocaleDateString(
                                'en-IN',
                                {
                                  day: 'numeric',
                                  month: 'short',
                                }
                              )}
                              {payment.referenceNumber &&
                                ` · ${payment.referenceNumber}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {fullInvoice.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm">{fullInvoice.notes}</p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                placeholder="Transaction ID / Cheque No."
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Payment notes..."
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleRecordPayment} disabled={paymentLoading}>
                {paymentLoading && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
