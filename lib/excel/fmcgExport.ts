import * as XLSX from 'xlsx'

export function buildFmcgWorkbook(data: {
  products: any[]
  batches: any[]
  licenses: any[]
  testReports: any[]
  distributions: any[]
}): Buffer {
  const wb = XLSX.utils.book_new()

  const productRows = data.products.map(p => ({
    SKU: p.sku,
    Name: p.name,
    Category: p.category,
    'Sub Category': p.subCategory || '',
    'HSN Code': p.hsnCode || '',
    'FSSAI Product Code': p.fssaiProductCode || '',
    'Net Weight': p.netWeight || '',
    'Weight Unit': p.weightUnit || '',
    'Shelf Life (days)': p.shelfLife || '',
    'Storage Conditions': p.storageConditions || '',
    MRP: p.mrp || '',
    Allergens: (p.allergens || []).join(', '),
    Manufacturer: p.manufacturerName || '',
    Brand: p.brandName || '',
    'Country of Origin': p.countryOfOrigin || 'India',
    Active: p.isActive ? 'Yes' : 'No',
  }))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(productRows),
    'Products'
  )

  const batchRows = data.batches.map(b => ({
    'Batch Number': b.batchNumber,
    'Product ID': b.productId,
    'Manufacturing Date': b.manufacturingDate
      ? new Date(b.manufacturingDate).toLocaleDateString('en-IN')
      : '',
    'Expiry Date': b.expiryDate
      ? new Date(b.expiryDate).toLocaleDateString('en-IN')
      : '',
    'Best Before': b.bestBeforeDate
      ? new Date(b.bestBeforeDate).toLocaleDateString('en-IN')
      : '',
    'Qty Produced': b.quantityProduced || '',
    'Qty Unit': b.quantityUnit || '',
    'Qty Remaining': b.quantityRemaining || '',
    'QC Status': b.qcStatus || '',
    'Drying Temp Target (°C)': b.dryingTargetTemp || '',
    'CCP1 Passed': b.ccp1Passed != null ? (b.ccp1Passed ? 'Yes' : 'No') : '',
    'Moisture Avg (%)': b.moistureAverage || '',
    'CCP2 Passed': b.ccp2Passed != null ? (b.ccp2Passed ? 'Yes' : 'No') : '',
    'Seal Check CCP3':
      b.ccp3Passed != null ? (b.ccp3Passed ? 'Yes' : 'No') : '',
    'Packs Produced': b.packsProduced || '',
    'Pack Size': b.packSize || '',
    'Final Disposition': b.finalDisposition || '',
    'Supplier Name': b.supplierName || '',
    'Inward Date': b.inwardDate
      ? new Date(b.inwardDate).toLocaleDateString('en-IN')
      : '',
    'Inward Inspection': b.inwardInspectionStatus || '',
    'Storage Location': b.storageLocation || '',
    'Recall Status': b.recallStatus || '',
    Status: b.status || '',
  }))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(batchRows),
    'Batches'
  )

  const licenseRows = data.licenses.map(l => ({
    'License Number': l.licenseNumber,
    Type: l.licenseType,
    'Business Name': l.businessName,
    State: l.state,
    'Issue Date': l.issueDate
      ? new Date(l.issueDate).toLocaleDateString('en-IN')
      : '',
    'Expiry Date': l.expiryDate
      ? new Date(l.expiryDate).toLocaleDateString('en-IN')
      : '',
    Status: l.status,
  }))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(licenseRows),
    'FSSAI Licenses'
  )

  const reportRows = data.testReports.map(r => ({
    'Report Number': r.reportNumber,
    'Batch ID': r.batchId,
    'Test Type': r.testType,
    'Lab Name': r.labName,
    'Lab Accreditation': r.labAccreditationNumber || '',
    'Sample Collected': r.sampleCollectedAt
      ? new Date(r.sampleCollectedAt).toLocaleDateString('en-IN')
      : '',
    'Report Date': r.reportDate
      ? new Date(r.reportDate).toLocaleDateString('en-IN')
      : '',
    Result: r.result,
    'Valid Until': r.validUntil
      ? new Date(r.validUntil).toLocaleDateString('en-IN')
      : '',
  }))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(reportRows),
    'Test Reports'
  )

  const distRows = data.distributions.map(d => ({
    'Dispatch Date': d.dispatchDate
      ? new Date(d.dispatchDate).toLocaleDateString('en-IN')
      : '',
    'Batch Number': d.batchId,
    'Invoice Number': d.invoiceNumber || '',
    Recipient: d.recipientName,
    'Recipient Type': d.recipientType,
    'Recipient State': d.recipientState || '',
    'Qty Dispatched': d.quantityDispatched,
    Unit: d.quantityUnit || '',
    'Vehicle Number': d.vehicleNumber || '',
    Transporter: d.transporterName || '',
    'LR Number': d.lrNumber || '',
    Status: d.status,
  }))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(distRows),
    'Distribution'
  )

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
