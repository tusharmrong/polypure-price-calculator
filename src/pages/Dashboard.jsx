import {
  FileClock,
  FileText,
  ReceiptText,
  Settings,
  SquarePen,
  TrendingUp,
  Users,
  WalletCards
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card.jsx'
import { APP_NAME } from '../utils/appMeta.js'
import { useAuth } from '../utils/authContext.jsx'
import { loadDocuments } from '../utils/documents.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { PERMISSIONS } from '../utils/permissions.js'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function Dashboard() {
  const { t } = useUiLanguage()
  const { hasPermission } = useAuth()
  const [savedDocuments, setSavedDocuments] = useState([])
  const [documentsLoaded, setDocumentsLoaded] = useState(false)

  const getDocumentSourceLabel = (document) => {
    if (document.importedFromLocal) return 'Imported from device'
    if (document.cloudBacked) return 'Cloud saved'
    return 'Local only'
  }

  const toNumber = (value) => {
    const number = Number(value || 0)
    return Number.isFinite(number) ? number : 0
  }

  const normalizeText = (value) => String(value || '').trim().toLowerCase()

  const getDocumentDate = (document) => {
    const rawDate = document.date || document.createdAt || document.savedAt || document.updatedAt || ''
    const date = rawDate.includes('T') ? new Date(rawDate) : new Date(`${rawDate}T00:00:00`)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const isCurrentMonthDocument = (document, now = new Date()) => {
    const date = getDocumentDate(document)
    return Boolean(date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear())
  }
  
  useEffect(() => {
    let isMounted = true

    loadDocuments()
      .then((documents) => {
        if (!isMounted) return
        setSavedDocuments(documents)
        setDocumentsLoaded(true)
      })
      .catch((error) => {
        console.error('Unable to load dashboard documents.', error)
        if (!isMounted) return
        setSavedDocuments([])
        setDocumentsLoaded(true)
      })

    return () => {
      isMounted = false
    }
  }, [])
  const documents = documentsLoaded ? savedDocuments : []
  const activeDocuments = useMemo(
    () => documents.filter((document) => !document.deletedAt),
    [documents]
  )
  const uniqueActiveDocuments = useMemo(() => {
    const seen = new Set()
    return activeDocuments.filter((document) => {
      const key = `${document.type}::${document.number}`
      if (!document.number) return true
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [activeDocuments])

  const monthlySummary = useMemo(() => {
    const now = new Date()
    const summary = {
      quotationCount: 0,
      invoiceCount: 0,
      receiptCount: 0,
      invoiceTotalAmount: 0,
      totalReceivedAmount: 0,
      dueAmount: 0,
      dueInvoices: [],
      staffRows: [],
      alerts: []
    }
    const paidInvoiceNumbers = new Set()
    const paidInvoiceSignatures = new Set()
    const staffByName = new Map()

    uniqueActiveDocuments.forEach((document) => {
      if (document.type !== 'Invoice') return
      const paidAmount = toNumber(document.paidAmount)
      if (paidAmount <= 0) return
      if (document.number) paidInvoiceNumbers.add(normalizeText(document.number))
      paidInvoiceSignatures.add(`${normalizeText(document.clientName)}::${paidAmount.toFixed(2)}`)
    })

    uniqueActiveDocuments.forEach((document) => {
      if (!isCurrentMonthDocument(document, now)) return

      const creatorName = document.creatorName || 'Unknown User'
      const staffRow = staffByName.get(creatorName) || {
        name: creatorName,
        role: document.creatorRole || 'staff',
        documentCount: 0,
        invoiceCount: 0,
        receiptCount: 0,
        receivedAmount: 0,
        dueAmount: 0
      }
      staffRow.documentCount += 1

      if (document.type === 'Quotation') summary.quotationCount += 1
      if (document.type === 'Invoice') {
        summary.invoiceCount += 1
        staffRow.invoiceCount += 1
        const invoiceTotal = toNumber(document.totalAmount || document.amount)
        const paidAmount = toNumber(document.paidAmount)
        const dueAmount = toNumber(document.dueAmount || Math.max(invoiceTotal - paidAmount, 0))
        summary.invoiceTotalAmount += invoiceTotal
        summary.totalReceivedAmount += paidAmount
        summary.dueAmount += dueAmount
        staffRow.receivedAmount += paidAmount
        staffRow.dueAmount += dueAmount

        if (dueAmount > 0) {
          summary.dueInvoices.push({
            id: document.id,
            number: document.number,
            clientName: document.clientName || 'Client Name',
            dueAmount,
            displayDate: document.displayDate || document.date || ''
          })
        }
      }
      if (document.type === 'Money Receipt') {
        summary.receiptCount += 1
        staffRow.receiptCount += 1
        const receiptAmount = toNumber(document.receivedAmount ?? document.totalAmount ?? document.amount)
        const receiptText = normalizeText(`${document.number || ''} ${document.workDetails || ''} ${document.notes || ''}`)
        const referencesPaidInvoice = [...paidInvoiceNumbers].some((invoiceNumber) => invoiceNumber && receiptText.includes(invoiceNumber))
        const receiptSignature = `${normalizeText(document.clientName)}::${receiptAmount.toFixed(2)}`

        if (receiptAmount > 0 && !referencesPaidInvoice && !paidInvoiceSignatures.has(receiptSignature)) {
          summary.totalReceivedAmount += receiptAmount
          staffRow.receivedAmount += receiptAmount
        }
      }

      staffByName.set(creatorName, staffRow)
    })

    summary.dueInvoices.sort((left, right) => right.dueAmount - left.dueAmount)
    summary.staffRows = [...staffByName.values()].sort((left, right) => right.documentCount - left.documentCount).slice(0, 5)
    summary.alerts = summary.dueInvoices.slice(0, 3)

    return summary
  }, [uniqueActiveDocuments])

  const canViewBusinessReports = hasPermission(PERMISSIONS.VIEW_HISTORY)

  const actions = [
    { label: t('nav_calculator'), path: '/calculator', icon: WalletCards },
    { label: t('nav_quotation'), path: '/quotation', icon: SquarePen },
    { label: t('nav_invoice'), path: '/invoice', icon: FileText },
    { label: t('nav_money_receipt'), path: '/money-receipt', icon: ReceiptText },
    ...(hasPermission(PERMISSIONS.VIEW_HISTORY)
      ? [{ label: t('dashboard_recent_documents'), path: '/history', icon: FileClock }]
      : []),
    ...(hasPermission(PERMISSIONS.VIEW_USERS)
      ? [{ label: t('nav_users'), path: '/users', icon: Users }]
      : []),
    ...(hasPermission(PERMISSIONS.MANAGE_SETTINGS)
      ? [{ label: t('nav_settings'), path: '/settings', icon: Settings }]
      : [])
  ]

  return (
    <div className="grid gap-5">
      <section className="rounded-lg bg-brand-600 px-5 py-6 text-white shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <img
            alt="Poly Pure"
            className="h-20 w-20 rounded-full border-2 border-white bg-white object-contain"
            src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
          />
          <div>
            <p className="text-sm font-semibold opacity-90">{APP_NAME}</p>
            <h2 className="mt-2 text-2xl font-bold">{t('dashboard_tagline')}</h2>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              className="flex min-h-28 items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200"
              key={action.path}
              to={action.path}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Icon size={24} aria-hidden="true" />
              </span>
              <span className="text-base font-bold text-slate-950">{action.label}</span>
            </Link>
          )
        })}
      </div>

      {canViewBusinessReports ? (
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Admin Business Summary</h3>
              <p className="text-sm text-slate-500">This month, from saved cloud/local documents.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <TrendingUp size={14} aria-hidden="true" />
              Live
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-500">Quotations</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{monthlySummary.quotationCount}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-500">Invoices</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{monthlySummary.invoiceCount}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-500">Money Receipts</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{monthlySummary.receiptCount}</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-sm text-emerald-700">Real Received</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">{formatCurrency(monthlySummary.totalReceivedAmount)}</p>
            </div>
            <div className="rounded-lg border border-brand-100 bg-brand-50 p-3">
              <p className="text-sm text-brand-700">Total Due</p>
              <p className="mt-1 text-xl font-bold text-brand-700">{formatCurrency(monthlySummary.dueAmount)}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-bold text-slate-950">Due Invoices</h4>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                  {monthlySummary.dueInvoices.length} open
                </span>
              </div>
              <div className="grid gap-2">
                {monthlySummary.dueInvoices.slice(0, 4).map((invoice) => (
                  <div className="rounded-lg bg-slate-50 p-3" key={invoice.id || invoice.number}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{invoice.clientName}</p>
                        <p className="text-xs text-slate-500">{invoice.number} | {invoice.displayDate}</p>
                      </div>
                      <p className="font-bold text-brand-700">{formatCurrency(invoice.dueAmount)}</p>
                    </div>
                  </div>
                ))}
                {monthlySummary.dueInvoices.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No due invoices this month.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-bold text-slate-950">Staff Activity</h4>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                  Top users
                </span>
              </div>
              <div className="grid gap-2">
                {monthlySummary.staffRows.map((staff) => (
                  <div className="rounded-lg bg-slate-50 p-3" key={staff.name}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{staff.name}</p>
                        <p className="text-xs text-slate-500">
                          {staff.documentCount} docs | {staff.invoiceCount} invoices | {staff.receiptCount} receipts
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-emerald-700">Received</p>
                        <p className="font-bold text-emerald-700">{formatCurrency(staff.receivedAmount)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {monthlySummary.staffRows.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No staff activity this month.</p>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-950">{t('dashboard_recent_documents')}</h3>
          <Link className="text-sm font-semibold text-brand-700" to="/history">
            {t('view_all')}
          </Link>
        </div>
        {!documentsLoaded ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Loading cloud documents...
          </div>
        ) : uniqueActiveDocuments.length ? (
          <div className="grid gap-3">
            {uniqueActiveDocuments.slice(0, 6).map((document) => (
              <div
                className="grid gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                key={document.id || document.number}
              >
                <div>
                  <p className="font-semibold text-slate-950">
                    {document.type} | {document.number}
                  </p>
                  <p className="text-sm text-slate-500">
                    {document.clientName} | {document.displayDate || document.date}
                  </p>
                  <p className="text-xs text-slate-400">
                    By {document.creatorName || 'Unknown User'} - {getDocumentSourceLabel(document)}
                  </p>
                </div>
                <p className="font-bold text-brand-700">{formatCurrency(document.totalAmount || document.amount)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No cloud documents yet.
          </div>
        )}
      </Card>
    </div>
  )
}
