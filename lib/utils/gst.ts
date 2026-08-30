// Indian state codes for GST
export const INDIAN_STATES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
}

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const

export function getStateFromGstin(gstin: string): string | null {
  if (!gstin || gstin.length < 2) return null
  const stateCode = gstin.substring(0, 2)
  return INDIAN_STATES[stateCode] || null
}

export function isInterStateTransaction(
  sellerState?: string,
  buyerState?: string
): boolean {
  if (!sellerState || !buyerState) return false
  return sellerState.toLowerCase() !== buyerState.toLowerCase()
}

export function calculateItemAmount(
  quantity: number,
  rate: number,
  discount: number,
  discountType: 'percentage' | 'flat'
): number {
  const gross = quantity * rate
  const discountAmount =
    discountType === 'percentage' ? gross * (discount / 100) : discount
  return Math.max(0, gross - discountAmount)
}

export function calculateTax(
  taxableAmount: number,
  taxRate: number,
  isInterState: boolean
): { cgst: number; sgst: number; igst: number; totalTax: number } {
  if (isInterState) {
    const igst = Math.round(((taxableAmount * taxRate) / 100) * 100) / 100
    return { cgst: 0, sgst: 0, igst, totalTax: igst }
  }
  const halfRate = taxRate / 2
  const cgst = Math.round(((taxableAmount * halfRate) / 100) * 100) / 100
  const sgst = Math.round(((taxableAmount * halfRate) / 100) * 100) / 100
  return { cgst, sgst, igst: 0, totalTax: cgst + sgst }
}

export function calculateInvoiceTotals(
  items: Array<{
    quantity: number
    rate: number
    discount: number
    discountType: 'percentage' | 'flat'
    taxRate: number
  }>,
  isInterState: boolean
) {
  let subtotal = 0
  let totalDiscount = 0
  let taxableAmount = 0
  let totalCgst = 0
  let totalSgst = 0
  let totalIgst = 0
  let totalTax = 0

  const processedItems = items.map(item => {
    const gross = item.quantity * item.rate
    const discountAmount =
      item.discountType === 'percentage'
        ? gross * (item.discount / 100)
        : item.discount
    const itemTaxable = Math.max(0, gross - discountAmount)
    const tax = calculateTax(itemTaxable, item.taxRate, isInterState)

    subtotal += gross
    totalDiscount += discountAmount
    taxableAmount += itemTaxable
    totalCgst += tax.cgst
    totalSgst += tax.sgst
    totalIgst += tax.igst
    totalTax += tax.totalTax

    return {
      ...item,
      taxAmount: tax.totalTax,
      amount: itemTaxable + tax.totalTax,
    }
  })

  const grandTotalExact = taxableAmount + totalTax
  const grandTotal = Math.round(grandTotalExact)
  const roundOff = Math.round((grandTotal - grandTotalExact) * 100) / 100

  return {
    items: processedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    cgst: Math.round(totalCgst * 100) / 100,
    sgst: Math.round(totalSgst * 100) / 100,
    igst: Math.round(totalIgst * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    roundOff,
    grandTotal,
  }
}

export function generateInvoiceNumber(
  prefix: string,
  sequence: number,
  financialYear?: string
): string {
  const now = new Date()
  const fy =
    financialYear ||
    (now.getMonth() >= 3
      ? `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(2)}`
      : `${now.getFullYear() - 1}-${now.getFullYear().toString().slice(2)}`)
  const seq = String(sequence).padStart(4, '0')
  return `${prefix}/${fy}/${seq}`
}

export function validateGstin(gstin: string): boolean {
  if (!gstin) return false
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  return gstinRegex.test(gstin.toUpperCase())
}
