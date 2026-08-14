'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { Separator } from '@/components/ui/separator'
import {
  useCreateInvoiceMutation,
  useGetNextInvoiceNumberQuery,
} from '@/lib/api/invoiceApi'

interface LineItem {
  name: string
  hsnSac: string
  quantity: number
  unit: string
  rate: number
  discount: number
  discountType: 'percentage' | 'flat'
  taxRate: number
}

interface InvoiceFormProps {
  workspaceId: string
  onSuccess: () => void
  onCancel: () => void
}

const emptyItem: LineItem = {
  name: '',
  hsnSac: '',
  quantity: 1,
  unit: 'pcs',
  rate: 0,
  discount: 0,
  discountType: 'percentage',
  taxRate: 18,
}

export function InvoiceForm({
  workspaceId,
  onSuccess,
  onCancel,
}: InvoiceFormProps) {
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerGstin, setCustomerGstin] = useState('')
  const [customerState, setCustomerState] = useState('')
  const [sellerState, setSellerState] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [dueDate, setDueDate] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }])
  const [notes, setNotes] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [upiId, setUpiId] = useState('')

  const [createInvoice, { isLoading }] = useCreateInvoiceMutation()
  const { data: nextNumber } = useGetNextInvoiceNumberQuery({ workspaceId })

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const addItem = () => setItems([...items, { ...emptyItem }])

  const removeItem = (index: number) => {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const calculateItemTotal = (item: LineItem) => {
    const gross = item.quantity * item.rate
    const disc =
      item.discountType === 'percentage'
        ? gross * (item.discount / 100)
        : item.discount
    const taxable = Math.max(0, gross - disc)
    const tax = (taxable * item.taxRate) / 100
    return { taxable, tax, total: taxable + tax }
  }

  const totals = items.reduce(
    (acc, item) => {
      const calc = calculateItemTotal(item)
      acc.subtotal += item.quantity * item.rate
      acc.taxable += calc.taxable
      acc.tax += calc.tax
      acc.total += calc.total
      return acc
    },
    { subtotal: 0, taxable: 0, tax: 0, total: 0 }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerName.trim()) {
      toast.error('Customer name is required')
      return
    }
    if (items.some(item => !item.name.trim())) {
      toast.error('All items must have a name')
      return
    }

    try {
      await createInvoice({
        workspaceId,
        customerName: customerName.trim(),
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
        customerGstin: customerGstin || undefined,
        customerAddress: customerState ? { state: customerState } : undefined,
        sellerAddress: sellerState ? { state: sellerState } : undefined,
        invoiceDate,
        dueDate: dueDate || undefined,
        items,
        notes: notes || undefined,
        paymentTerms: paymentTerms || undefined,
        bankDetails: upiId ? { upiId } : undefined,
      }).unwrap()

      toast.success('Invoice created successfully')
      onSuccess()
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create invoice')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Invoice Number Preview */}
      {nextNumber && (
        <div className="text-sm text-muted-foreground">
          Invoice #:{' '}
          <span className="font-mono">{nextNumber.invoiceNumber}</span>
        </div>
      )}

      {/* Customer Details */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Customer Name *</Label>
          <Input
            placeholder="Customer name"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="customer@email.com"
            value={customerEmail}
            onChange={e => setCustomerEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            placeholder="Phone number"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>GSTIN</Label>
          <Input
            placeholder="22AAAAA0000A1Z5"
            value={customerGstin}
            onChange={e => setCustomerGstin(e.target.value.toUpperCase())}
            maxLength={15}
          />
        </div>
      </div>

      {/* GST State */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Seller State</Label>
          <Input
            placeholder="e.g., West Bengal"
            value={sellerState}
            onChange={e => setSellerState(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Customer State</Label>
          <Input
            placeholder="e.g., Karnataka"
            value={customerState}
            onChange={e => setCustomerState(e.target.value)}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Invoice Date</Label>
          <Input
            type="date"
            value={invoiceDate}
            onChange={e => setInvoiceDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <Separator />

      {/* Line Items */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-base">Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-3 w-3" />
            Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-12 items-end gap-2 rounded-lg border p-3"
            >
              <div className="col-span-12 space-y-1 sm:col-span-4">
                <Label className="text-xs">Item Name</Label>
                <Input
                  placeholder="Item / Service"
                  value={item.name}
                  onChange={e => updateItem(index, 'name', e.target.value)}
                />
              </div>
              <div className="col-span-3 space-y-1 sm:col-span-1">
                <Label className="text-xs">HSN</Label>
                <Input
                  placeholder="HSN"
                  value={item.hsnSac}
                  onChange={e => updateItem(index, 'hsnSac', e.target.value)}
                />
              </div>
              <div className="col-span-3 space-y-1 sm:col-span-1">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={e =>
                    updateItem(
                      index,
                      'quantity',
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="col-span-3 space-y-1 sm:col-span-2">
                <Label className="text-xs">Rate (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={item.rate}
                  onChange={e =>
                    updateItem(index, 'rate', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="col-span-3 space-y-1 sm:col-span-1">
                <Label className="text-xs">GST %</Label>
                <Select
                  value={String(item.taxRate)}
                  onValueChange={v => updateItem(index, 'taxRate', Number(v))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 5, 12, 18, 28].map(rate => (
                      <SelectItem key={rate} value={String(rate)}>
                        {rate}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 space-y-1 sm:col-span-2">
                <Label className="text-xs">Amount</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                  ₹{calculateItemTotal(item).total.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="col-span-1 flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>₹{totals.subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>₹{totals.tax.toLocaleString('en-IN')}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>₹{Math.round(totals.total).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Additional */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>UPI ID (for QR)</Label>
          <Input
            placeholder="yourname@upi"
            value={upiId}
            onChange={e => setUpiId(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Payment Terms</Label>
          <Input
            placeholder="e.g., Net 30 days"
            value={paymentTerms}
            onChange={e => setPaymentTerms(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Additional notes for the customer..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Create Invoice
        </Button>
      </div>
    </form>
  )
}
