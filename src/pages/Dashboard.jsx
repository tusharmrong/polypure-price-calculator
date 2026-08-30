import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Factory,
  FileClock,
  FileText,
  Kanban,
  Layers,
  MessageSquare,
  Package,
  Phone,
  Plus,
  Printer,
  ReceiptText,
  Scissors,
  Settings,
  Sparkles,
  SquarePen,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  Users,
  WalletCards
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import { APP_NAME } from '../utils/appMeta.js'
import { useAuth } from '../utils/authContext.jsx'
import { loadDocuments } from '../utils/documents.js'
import { loadExpenses } from '../utils/expenses.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { PERMISSIONS } from '../utils/permissions.js'
import {
  PRODUCTION_STAGES,
  getDocProductionStatus,
  getProductionStage
} from '../utils/productionStatus.js'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function Dashboard() {
  const { language, t } = useUiLanguage()
  const isBn = language === 'bn'
  const { currentUser, hasPermission } = useAuth()
  const [savedDocuments, setSavedDocuments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [documentsLoaded, setDocumentsLoaded] = useState(false)

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

    Promise.all([loadDocuments(), loadExpenses()])
      .then(([docs, expList]) => {
        if (!isMounted) return
        setSavedDocuments(docs || [])
        setExpenses(expList || [])
        setDocumentsLoaded(true)
      })
      .catch((error) => {
        console.error('Unable to load dashboard data.', error)
        if (!isMounted) return
        setSavedDocuments([])
        setExpenses([])
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

  const currentMonthExpenses = useMemo(() => {
    const now = new Date()
    return expenses.filter((e) => {
      if (!e.date) return false
      const expDate = new Date(e.date)
      return !isNaN(expDate.getTime()) && expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
    })
  }, [expenses])

  const totalMonthlyExpenses = useMemo(() => {
    return currentMonthExpenses.reduce((sum, e) => sum + toNumber(e.amount), 0)
  }, [currentMonthExpenses])

  const monthlySummary = useMemo(() => {
    const now = new Date()
    const summary = {
      quotationCount: 0,
      invoiceCount: 0,
      receiptCount: 0,
      invoiceTotalAmount: 0,
      totalReceivedAmount: 0,
      totalCostOfGoods: 0,
      dueAmount: 0,
      dueInvoices: [],
      staffRows: [],
      readyOrders: [],
      activeProductionOrders: []
    }
    const paidInvoiceNumbers = new Set()
    const paidInvoiceSignatures = new Set()
    const staffByName = new Map()

    uniqueActiveDocuments.forEach((document) => {
      if (document.type === 'Invoice') {
        const prodStatus = getDocProductionStatus(document)
        const stage = getProductionStage(prodStatus)
        const items = Array.isArray(document.items) ? document.items : []
        const totalQty = items.reduce((sum, it) => sum + toNumber(it.quantity), 0)

        const orderObj = {
          ...document,
          prodStatus,
          stage,
          totalQty,
          clientName: document.clientName || 'Client Name'
        }

        if (prodStatus === 'ready') {
          summary.readyOrders.push(orderObj)
        }
        if (prodStatus !== 'delivered') {
          summary.activeProductionOrders.push(orderObj)
        }
      }

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
        const costAmount = toNumber(document.factoryCost?.totalFactoryCost || 0)

        summary.invoiceTotalAmount += invoiceTotal
        summary.totalReceivedAmount += paidAmount
        summary.totalCostOfGoods += costAmount
        summary.dueAmount += dueAmount
        staffRow.receivedAmount += paidAmount
        staffRow.dueAmount += dueAmount

        if (dueAmount > 0) {
          summary.dueInvoices.push({
            id: document.id,
            number: document.number,
            clientName: document.clientName || 'Client Name',
            phone: document.phone || '',
            dueAmount,
            totalAmount: invoiceTotal,
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

    return summary
  }, [uniqueActiveDocuments])

  const productionMetrics = useMemo(() => {
    const active = monthlySummary.activeProductionOrders
    const totalBags = active.reduce((sum, o) => sum + o.totalQty, 0)
    const inExtrusionPrinting = active.filter((o) => ['film_blowing', 'printing'].includes(o.prodStatus)).length
    const inCuttingPacking = active.filter((o) => o.prodStatus === 'cutting_packing').length
    const readyCount = active.filter((o) => o.prodStatus === 'ready').length

    const stageCounts = {}
    PRODUCTION_STAGES.forEach((st) => {
      stageCounts[st.id] = active.filter((o) => o.prodStatus === st.id).length
    })

    return {
      activeTotal: active.length,
      totalBags,
      inExtrusionPrinting,
      inCuttingPacking,
      readyCount,
      stageCounts
    }
  }, [monthlySummary.activeProductionOrders])

  const estimatedNetProfit = useMemo(() => {
    const grossProfit = monthlySummary.invoiceTotalAmount - monthlySummary.totalCostOfGoods
    return grossProfit - totalMonthlyExpenses
  }, [monthlySummary.invoiceTotalAmount, monthlySummary.totalCostOfGoods, totalMonthlyExpenses])

  const quickActions = [
    { label: isBn ? '+ নতুন কোটেশন' : '+ New Quotation', path: '/quotation', icon: SquarePen, color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    { label: isBn ? '+ নতুন ইনভয়েস' : '+ New Invoice', path: '/invoice', icon: FileText, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    { label: isBn ? '+ মানি রিসিট' : '+ Money Receipt', path: '/money-receipt', icon: ReceiptText, color: 'bg-purple-600 hover:bg-purple-700 text-white' },
    { label: isBn ? '+ খরচ যুক্ত করুন' : '+ Log Expense', path: '/expenses', icon: CreditCard, color: 'bg-amber-600 hover:bg-amber-700 text-white' },
    { label: isBn ? 'প্রোডাকশন বোর্ড' : 'Production Board', path: '/production', icon: Kanban, color: 'bg-brand-600 hover:bg-brand-700 text-white' },
    { label: isBn ? 'ক্যালকুলেটর' : 'Price Calculator', path: '/calculator', icon: WalletCards, color: 'bg-slate-800 hover:bg-slate-900 text-white' }
  ]

  const handleWhatsAppDueReminder = (invoice) => {
    const rawPhone = String(invoice.phone || '').replace(/[^0-9]/g, '')
    let formattedPhone = rawPhone
    if (formattedPhone.startsWith('01')) {
      formattedPhone = '88' + formattedPhone
    }
    const message = `আসসালামু আলাইকুম ${invoice.clientName},\n\nপলিপিউর প্রিন্টিং অ্যান্ড প্যাকেজিং থেকে বকেয়া বিল সংক্রান্ত স্মরণিকা:\n\n📄 ইনভয়েস নং: ${invoice.number}\n📅 তারিখ: ${invoice.displayDate}\n💰 মোট বিল: ৳${invoice.totalAmount?.toLocaleString() || ''}\n🔴 বকেয়া পরিমাণ: ৳${invoice.dueAmount?.toLocaleString() || ''}\n\nঅনুগ্রহপূর্বক বকেয়া বিল পরিশোধের ব্যবস্থা গ্রহণ করার জন্য অনুরোধ জানাচ্ছি। কোনো তথ্য জানার থাকলে আমাদের সাথে যোগাযোগ করুন।\n\nধন্যবাদ,\nপলিপিউর টিম\n📞 01914-981793`
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const currentDateDisplay = useMemo(() => {
    const now = new Date()
    return now.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, [isBn])

  return (
    <div className="space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-indigo-700 p-5 sm:p-6 text-white shadow-soft">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img
              alt="Poly Pure"
              className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl border-2 border-white/40 bg-white p-1 object-contain shadow-md"
              src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs">
                  {APP_NAME}
                </span>
                <span className="text-xs text-brand-100 font-medium">
                  {currentDateDisplay}
                </span>
              </div>
              <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight">
                {isBn ? 'ব্যবসা ও কারখানা কন্ট্রোল ড্যাশবোর্ড' : 'Business & Factory Command Center'}
              </h1>
              <p className="text-xs text-brand-100/90 font-medium mt-0.5">
                {isBn ? 'স্বাগতম, ' : 'Welcome back, '}
                <strong className="text-white font-bold">{currentUser?.name || currentUser?.username || 'Admin'}</strong>
                {currentUser?.role ? ` (${currentUser.role.toUpperCase()})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/25 border border-white/20"
              to="/reports"
            >
              <TrendingUp size={15} />
              <span>{isBn ? 'P&L রিপোর্টস →' : 'P&L Reports →'}</span>
            </Link>
          </div>
        </div>
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {quickActions.map((act) => {
          const Icon = act.icon
          return (
            <Link
              className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-bold shadow-soft transition hover:-translate-y-0.5 ${act.color}`}
              key={act.path}
              to={act.path}
            >
              <Icon size={16} />
              <span>{act.label}</span>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/40 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              {isBn ? 'নগদ আদায় (চলতি মাস)' : 'Real Cash Received'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900">
            {formatCurrency(monthlySummary.totalReceivedAmount)}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-emerald-700">
            <span>From Invoices & Receipts</span>
            <span className="font-bold">{monthlySummary.receiptCount + monthlySummary.invoiceCount} entries</span>
          </div>
        </div>

        <div className="rounded-2xl border border-rose-200/90 bg-rose-50/40 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              {isBn ? 'মোট বকেয়া পাওনা' : 'Total Outstanding Due'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <Clock size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-rose-900">
            {formatCurrency(monthlySummary.dueAmount)}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-rose-700">
            <span>{monthlySummary.dueInvoices.length} clients with open dues</span>
            <Link className="font-bold hover:underline" to="/reports">
              View List →
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/40 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              {isBn ? 'অপারেটিং খরচ (চলতি মাস)' : 'Operating Expenses'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <TrendingDown size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900">
            {formatCurrency(totalMonthlyExpenses)}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-amber-700">
            <span>Factory & Admin costs</span>
            <Link className="font-bold hover:underline" to="/expenses">
              Expenses →
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-200/90 bg-indigo-50/40 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
              {isBn ? 'আনুমানিক নিট লাভ' : 'Estimated Net Profit'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-indigo-900">
            {formatCurrency(estimatedNetProfit)}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-indigo-700">
            <span>Sales - (COGS + Expenses)</span>
            <Link className="font-bold hover:underline" to="/reports">
              P&L Statement →
            </Link>
          </div>
        </div>
      </div>

      {hasPermission(PERMISSIONS.VIEW_PRODUCTION) && (
        <Card className="border-brand-200 bg-gradient-to-br from-white via-brand-50/20 to-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
                <Factory size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">
                    {isBn ? 'কারখানা প্রোডাকশন লাইভ পালস' : 'Factory Production Live Pipeline'}
                  </h3>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 animate-pulse">
                    Live Active
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {productionMetrics.activeTotal} {isBn ? 'টি অর্ডার কারখানায় রানিং' : 'running jobs on factory line'} •{' '}
                  <strong className="text-slate-800 font-bold">{productionMetrics.totalBags.toLocaleString()} pcs</strong> total bags
                </p>
              </div>
            </div>

            <Link
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-soft transition hover:bg-brand-700 self-start sm:self-auto"
              to="/production"
            >
              <Kanban size={14} />
              <span>{isBn ? 'সম্পূর্ণ পাইপলাইন বোর্ড খুলুন →' : 'Open Production Board →'}</span>
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 text-center">
            {PRODUCTION_STAGES.slice(0, 5).map((stage) => {
              const count = productionMetrics.stageCounts[stage.id] || 0
              return (
                <div
                  className={`rounded-xl border p-3 transition ${
                    count > 0 ? 'bg-white shadow-xs border-slate-300' : 'bg-slate-50/60 border-slate-200/60 opacity-70'
                  }`}
                  key={stage.id}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${stage.dotColor}`} />
                    <span className="text-[11px] font-bold text-slate-700 truncate">{stage.shortLabel}</span>
                  </div>
                  <p className="mt-1 text-lg font-black text-slate-900">{count} <span className="text-[10px] font-normal text-slate-500">jobs</span></p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-rose-600" />
              <h3 className="text-sm font-bold text-slate-950">
                {isBn ? 'বকেয়া কালেকশন ও রিমাইন্ডার' : 'Top Due Collections & Reminders'}
              </h3>
            </div>
            <Link className="text-xs font-bold text-brand-700 hover:underline" to="/reports">
              {monthlySummary.dueInvoices.length} open • View All →
            </Link>
          </div>

          {monthlySummary.dueInvoices.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500">
              🎉 No open dues this month! All payments are up to date.
            </div>
          ) : (
            <div className="space-y-2.5">
              {monthlySummary.dueInvoices.slice(0, 4).map((invoice) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-brand-300 transition"
                  key={invoice.id || invoice.number}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-xs truncate">{invoice.clientName}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="font-mono">{invoice.number}</span>
                      <span>•</span>
                      <span>{invoice.displayDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-rose-600 font-bold block uppercase">Due</span>
                      <span className="font-black text-rose-700 text-xs">
                        {formatCurrency(invoice.dueAmount)}
                      </span>
                    </div>

                    {invoice.phone ? (
                      <button
                        className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition shadow-2xs"
                        onClick={() => handleWhatsAppDueReminder(invoice)}
                        title="Send WhatsApp Payment Reminder"
                        type="button"
                      >
                        <MessageSquare size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-950">
                {isBn ? 'ডেলিভারির জন্য প্রস্তুত অর্ডার' : 'Orders Ready for Dispatch'}
              </h3>
            </div>
            <Link className="text-xs font-bold text-brand-700 hover:underline" to="/production">
              {monthlySummary.readyOrders.length} ready • Production →
            </Link>
          </div>

          {monthlySummary.readyOrders.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                No orders currently waiting for dispatch. All packed goods are cleared.
              </div>

              {monthlySummary.staffRows.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Top Staff Activity (This Month)
                  </span>
                  <div className="space-y-1.5">
                    {monthlySummary.staffRows.slice(0, 3).map((st) => (
                      <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50" key={st.name}>
                        <span className="font-semibold text-slate-800">{st.name}</span>
                        <span className="text-slate-500 font-medium">
                          {st.documentCount} docs • <strong className="text-emerald-700">{formatCurrency(st.receivedAmount)}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {monthlySummary.readyOrders.slice(0, 4).map((order) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/30 p-3 shadow-2xs"
                  key={order.id}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      <p className="font-bold text-slate-900 text-xs truncate">{order.clientName}</p>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{order.number} • {order.totalQty.toLocaleString()} pcs packed</p>
                  </div>

                  <Link
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-2xs"
                    to="/production"
                  >
                    <Printer size={12} />
                    <span>Challan</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-950">{t('dashboard_recent_documents')}</h3>
            <p className="text-xs text-slate-500">Latest invoices, quotations & receipts created</p>
          </div>
          <Link className="text-xs font-bold text-brand-700 hover:underline" to="/history">
            {t('view_all')} →
          </Link>
        </div>

        {!documentsLoaded ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
            Loading documents...
          </div>
        ) : uniqueActiveDocuments.length ? (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {uniqueActiveDocuments.slice(0, 6).map((document) => {
              const docType = document.type || 'Document'
              const isInvoice = docType === 'Invoice'
              const isQuotation = docType === 'Quotation'

              const badgeColor = isInvoice
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : isQuotation
                ? 'bg-purple-50 text-purple-800 border-purple-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'

              return (
                <div
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-brand-200 transition space-y-2"
                  key={document.id || document.number}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${badgeColor}`}>
                      {docType}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {document.displayDate || document.date || '-'}
                    </span>
                  </div>

                  <div>
                    <p className="font-bold text-slate-900 text-xs truncate">
                      {document.clientName || 'Client Name'}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                      {document.number}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                      By {document.creatorName || 'Staff'}
                    </span>
                    <span className="font-black text-slate-900 text-xs">
                      {formatCurrency(document.totalAmount || document.amount || document.receivedAmount || 0)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-500">
            No documents created yet.
          </div>
        )}
      </Card>
    </div>
  )
}
