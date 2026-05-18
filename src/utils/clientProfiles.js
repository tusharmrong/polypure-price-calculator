function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
}

function getDocumentDateValue(document) {
  const rawDate = document.updatedAt || document.savedAt || document.createdAt || document.date || ''
  const date = new Date(rawDate)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

export function getDocumentAmount(document) {
  return Number(document.totalAmount ?? document.amount ?? document.receivedAmount ?? 0) || 0
}

export function getPaidAmount(document) {
  if (document.type === 'Invoice') return Number(document.paidAmount || 0) || 0
  if (document.type === 'Money Receipt') return Number(document.receivedAmount ?? document.totalAmount ?? document.amount ?? 0) || 0
  return 0
}

export function getDueAmount(document) {
  if (document.type !== 'Invoice') return 0
  const total = getDocumentAmount(document)
  const paid = getPaidAmount(document)
  return Number(document.dueAmount ?? Math.max(total - paid, 0)) || 0
}

function buildClientKey(document) {
  const name = normalizeText(document.clientName)
  if (name) return `name:${name}`

  const phone = normalizeText(document.phone)
  if (phone) return `phone:${phone}`

  return ''
}

function buildPaymentSignature(document, amount) {
  const clientKey = buildClientKey(document)
  const invoiceNumber = normalizeText(document.invoiceNumber || document.sourceInvoiceNumber || document.linkedInvoiceNumber)
  const workDetails = normalizeText(document.workDetails || document.itemDescription || '')

  if (invoiceNumber) return `${clientKey}::invoice:${invoiceNumber}::${amount.toFixed(2)}`
  return `${clientKey}::${workDetails}::${amount.toFixed(2)}`
}

export function buildClientProfiles(documents = []) {
  const activeDocuments = documents.filter((document) => !document.deletedAt && buildClientKey(document))
  const profilesByKey = new Map()

  for (const document of activeDocuments) {
    const key = buildClientKey(document)
    const existing = profilesByKey.get(key)
    const documentsForClient = existing ? [...existing.documents, document] : [document]

    profilesByKey.set(key, {
      key,
      documents: documentsForClient
    })
  }

  return [...profilesByKey.values()]
    .map((profile) => {
      const sortedDocuments = [...profile.documents].sort((left, right) => getDocumentDateValue(right) - getDocumentDateValue(left))
      const latestDocument = sortedDocuments[0] || {}
      const invoices = sortedDocuments.filter((document) => document.type === 'Invoice')
      const quotations = sortedDocuments.filter((document) => document.type === 'Quotation')
      const receipts = sortedDocuments.filter((document) => document.type === 'Money Receipt')
      const paidInvoiceSignatures = new Set()
      const paidInvoiceClientAmounts = new Set()

      let invoiceAmount = 0
      let quotedAmount = 0
      let invoicePaidAmount = 0
      let dueAmount = 0

      for (const invoice of invoices) {
        const total = getDocumentAmount(invoice)
        const paid = getPaidAmount(invoice)
        invoiceAmount += total
        invoicePaidAmount += paid
        dueAmount += getDueAmount(invoice)
        if (paid > 0) {
          paidInvoiceSignatures.add(buildPaymentSignature(invoice, paid))
          paidInvoiceClientAmounts.add(`${profile.key}::${paid.toFixed(2)}`)
        }
      }

      for (const quotation of quotations) {
        quotedAmount += getDocumentAmount(quotation)
      }

      let receiptAmount = 0
      let duplicateReceiptAmount = 0
      let duplicateReceiptCount = 0

      for (const receipt of receipts) {
        const amount = getPaidAmount(receipt)
        const signature = buildPaymentSignature(receipt, amount)

        if (
          amount > 0 &&
          (paidInvoiceSignatures.has(signature) || paidInvoiceClientAmounts.has(`${profile.key}::${amount.toFixed(2)}`))
        ) {
          duplicateReceiptAmount += amount
          duplicateReceiptCount += 1
          continue
        }

        receiptAmount += amount
      }

      const phones = uniqueValues(sortedDocuments.map((document) => document.phone))
      const addresses = uniqueValues(sortedDocuments.map((document) => document.address))
      const creatorNames = uniqueValues(sortedDocuments.map((document) => document.creatorName))
      const names = uniqueValues(sortedDocuments.map((document) => document.clientName))

      return {
        key: profile.key,
        clientName: latestDocument.clientName || names[0] || 'Unnamed Client',
        phone: latestDocument.phone || phones[0] || '',
        address: latestDocument.address || addresses[0] || '',
        names,
        phones,
        addresses,
        creatorNames,
        documents: sortedDocuments,
        quotations,
        invoices,
        receipts,
        documentCount: sortedDocuments.length,
        quotationCount: quotations.length,
        invoiceCount: invoices.length,
        receiptCount: receipts.length,
        quotedAmount,
        invoiceAmount,
        invoicePaidAmount,
        receiptAmount,
        duplicateReceiptAmount,
        duplicateReceiptCount,
        lifetimeReceived: invoicePaidAmount + receiptAmount,
        dueAmount,
        lastDocument: latestDocument,
        lastDate: latestDocument.displayDate || latestDocument.date || ''
      }
    })
    .sort((left, right) => getDocumentDateValue(right.lastDocument) - getDocumentDateValue(left.lastDocument))
}

export function filterClientProfiles(profiles, search) {
  const keyword = normalizeText(search)
  if (!keyword) return profiles

  return profiles.filter((profile) => {
    const searchable = [
      profile.clientName,
      profile.phone,
      profile.address,
      ...profile.names,
      ...profile.phones,
      ...profile.addresses,
      ...profile.documents.map((document) => document.number)
    ]
      .join(' ')
      .toLowerCase()

    return searchable.includes(keyword)
  })
}
