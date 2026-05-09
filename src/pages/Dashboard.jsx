import {
  FileClock,
  FileText,
  ReceiptText,
  Settings,
  SquarePen,
  TrendingUp,
  WalletCards
} from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card.jsx'
import { sampleDocuments } from '../data/sampleDocuments.js'
import { loadDocuments } from '../utils/documents.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function Dashboard() {
  const { t } = useUiLanguage()
  const savedDocuments = useMemo(() => loadDocuments(), [])
  const documents = savedDocuments.length > 0 ? savedDocuments : sampleDocuments
  const activeDocuments = useMemo(
    () => documents.filter((document) => !document.deletedAt),
    [documents]
  )
  const monthlySummary = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    const summary = {
      quotationCount: 0,
      invoiceCount: 0,
      receiptCount: 0,
      totalAmount: 0
    }

    activeDocuments.forEach((document) => {
      const dateValue = document.date ? new Date(`${document.date}T00:00:00`) : null
      if (!dateValue || Number.isNaN(dateValue.getTime())) return
      if (dateValue.getMonth() !== month || dateValue.getFullYear() !== year) return

      if (document.type === 'Quotation') summary.quotationCount += 1
      if (document.type === 'Invoice') summary.invoiceCount += 1
      if (document.type === 'Money Receipt') summary.receiptCount += 1
      summary.totalAmount += Number(document.totalAmount ?? document.amount ?? 0)
    })

    return summary
  }, [activeDocuments])

  const actions = [
    { label: t('nav_calculator'), path: '/calculator', icon: WalletCards },
    { label: t('nav_quotation'), path: '/quotation', icon: SquarePen },
    { label: t('nav_invoice'), path: '/invoice', icon: FileText },
    { label: t('nav_money_receipt'), path: '/money-receipt', icon: ReceiptText },
    { label: t('dashboard_recent_documents'), path: '/history', icon: FileClock },
    { label: t('nav_settings'), path: '/settings', icon: Settings }
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
            <p className="text-sm font-semibold opacity-90">Poly Pure Price Calculator</p>
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

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-950">This Month Summary</h3>
          <span className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <TrendingUp size={14} aria-hidden="true" />
            Live
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          <div className="rounded-lg border border-brand-100 bg-brand-50 p-3">
            <p className="text-sm text-brand-700">Total Amount</p>
            <p className="mt-1 text-xl font-bold text-brand-700">{formatCurrency(monthlySummary.totalAmount)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-950">{t('dashboard_recent_documents')}</h3>
          <Link className="text-sm font-semibold text-brand-700" to="/history">
            {t('view_all')}
          </Link>
        </div>
        <div className="grid gap-3">
          {activeDocuments.slice(0, 6).map((document) => (
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
              </div>
              <p className="font-bold text-brand-700">{formatCurrency(document.totalAmount || document.amount)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
