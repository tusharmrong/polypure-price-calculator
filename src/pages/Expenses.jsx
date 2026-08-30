import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
  Filter,
  Layers,
  Palette,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Scissors,
  Search,
  Sparkles,
  Tag,
  Trash2,
  TrendingDown,
  Truck,
  Users,
  Wallet,
  Wrench,
  X,
  Zap
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import TextArea from '../components/TextArea.jsx'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PRESETS,
  deleteExpense,
  loadExpenses,
  saveExpense
} from '../utils/expenses.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { formatDecimal } from '../utils/formatNumber.js'
import { useAuth } from '../utils/authContext.jsx'
import { useToast } from '../utils/toast.jsx'
import { useUiLanguage } from '../utils/uiLanguage.js'

function toNumber(val) {
  const num = Number(val || 0)
  return Number.isFinite(num) ? num : 0
}

function parseDate(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  const d = s.includes('T') ? new Date(s) : new Date(`${s}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const PAYMENT_METHODS = ['Cash', 'bKash / Nagad', 'Bank Transfer', 'Cheque']

export default function Expenses() {
  const { language } = useUiLanguage()
  const isBn = language === 'bn'
  const { currentUser } = useAuth()
  const { showToast } = useToast()

  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  // Express Input State
  const [expressTitle, setExpressTitle] = useState('')
  const [expressAmount, setExpressAmount] = useState('')
  const [expressCategory, setExpressCategory] = useState('raw_materials')
  const [expressPaymentMethod, setExpressPaymentMethod] = useState('Cash')
  const [expressDate, setExpressDate] = useState(new Date().toISOString().slice(0, 10))
  const [expressVendor, setExpressVendor] = useState('')
  const [expressReference, setExpressReference] = useState('')
  const [showMoreDetails, setShowMoreDetails] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Filters
  const [periodPreset, setPeriodPreset] = useState('this_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)

  const titleInputRef = useRef(null)

  const reloadExpenses = async () => {
    setLoading(true)
    try {
      const data = await loadExpenses()
      setExpenses(data)
    } catch (err) {
      console.error('Error loading expenses:', err)
      showToast('Unable to load expense records.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadExpenses()
  }, [])

  // Period Date Range
  const dateRange = useMemo(() => {
    const now = new Date()
    let start = new Date(0)
    let end = new Date(8640000000000000)

    if (periodPreset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    } else if (periodPreset === 'yesterday') {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0)
      end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59)
    } else if (periodPreset === 'this_week') {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday
      start = new Date(now.setDate(diff))
      start.setHours(0, 0, 0, 0)
      end = new Date()
      end.setHours(23, 59, 59, 999)
    } else if (periodPreset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    } else if (periodPreset === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0)
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
    } else if (periodPreset === 'custom' && (customStartDate || customEndDate)) {
      if (customStartDate) start = new Date(`${customStartDate}T00:00:00`)
      if (customEndDate) end = new Date(`${customEndDate}T23:59:59`)
    }

    return { start, end }
  }, [periodPreset, customStartDate, customEndDate])

  // KPIs
  const summaryKpis = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)

    let todayTotal = 0
    let todayCount = 0
    let monthTotal = 0
    let monthCount = 0
    let allTimeTotal = 0

    const catTotals = {}
    EXPENSE_CATEGORIES.forEach((c) => {
      catTotals[c.id] = 0
    })

    expenses.forEach((exp) => {
      const amt = toNumber(exp.amount)
      const d = parseDate(exp.date || exp.createdAt)
      allTimeTotal += amt

      if (d) {
        if (d >= todayStart) {
          todayTotal += amt
          todayCount += 1
        }
        if (d >= monthStart) {
          monthTotal += amt
          monthCount += 1
          const cid = exp.category || 'other'
          catTotals[cid] = (catTotals[cid] || 0) + amt
        }
      }
    })

    // Find top expense category this month
    let topCatId = 'raw_materials'
    let topCatAmt = 0
    Object.entries(catTotals).forEach(([cid, amt]) => {
      if (amt > topCatAmt) {
        topCatAmt = amt
        topCatId = cid
      }
    })

    const topCatObj = EXPENSE_CATEGORIES.find((c) => c.id === topCatId) || EXPENSE_CATEGORIES[0]

    return {
      todayTotal,
      todayCount,
      monthTotal,
      monthCount,
      allTimeTotal,
      topCatName: topCatObj.shortLabel || topCatObj.label,
      topCatAmt
    }
  }, [expenses])

  // Filtered Expenses List
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // Period filter
      const d = parseDate(exp.date || exp.createdAt)
      if (d && (d < dateRange.start || d > dateRange.end)) return false

      // Category filter
      if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchTitle = (exp.title || '').toLowerCase().includes(q)
        const matchVendor = (exp.vendor || '').toLowerCase().includes(q)
        const matchRef = (exp.reference || '').toLowerCase().includes(q)
        const matchCat = (exp.category || '').toLowerCase().includes(q)
        if (!matchTitle && !matchVendor && !matchRef && !matchCat) return false
      }

      return true
    })
  }, [expenses, dateRange, categoryFilter, searchQuery])

  // Express Submit Handler (Under 3 seconds!)
  const handleExpressSubmit = async (e) => {
    e?.preventDefault?.()
    const trimmedTitle = expressTitle.trim()
    const amountNum = toNumber(expressAmount)

    if (!trimmedTitle) {
      showToast(isBn ? 'খরচের বিবরণ লিখুন।' : 'Please enter expense description.', 'error')
      titleInputRef.current?.focus()
      return
    }
    if (amountNum <= 0) {
      showToast(isBn ? 'টাকার পরিমাণ ০ এর বেশি হতে হবে।' : 'Amount must be greater than zero.', 'error')
      return
    }

    setSubmitting(true)
    try {
      await saveExpense(
        {
          title: trimmedTitle,
          amount: amountNum,
          category: expressCategory,
          paymentMethod: expressPaymentMethod,
          date: expressDate,
          vendor: expressVendor.trim(),
          reference: expressReference.trim()
        },
        currentUser
      )

      showToast(
        isBn ? `খরচ সেভ হয়েছে: ৳${formatDecimal(amountNum)}` : `Recorded: ৳${formatDecimal(amountNum)}`,
        'success'
      )

      // Fast Reset for next entry
      setExpressTitle('')
      setExpressAmount('')
      setExpressVendor('')
      setExpressReference('')
      setShowMoreDetails(false)
      reloadExpenses()

      // Refocus ready for next expense immediately
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 50)
    } catch (err) {
      console.error('Express save error:', err)
      showToast('Failed to record expense.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Preset Click
  const handlePresetSelect = (preset) => {
    setExpressTitle(preset.title)
    setExpressCategory(preset.category)
    titleInputRef.current?.focus()
  }

  // Handle Delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return
    try {
      await deleteExpense(id)
      showToast('Expense record deleted.', 'success')
      reloadExpenses()
    } catch (err) {
      showToast('Unable to delete expense.', 'error')
    }
  }

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e?.preventDefault?.()
    if (!editingExpense) return

    try {
      await saveExpense(editingExpense, currentUser)
      showToast('Expense updated successfully.', 'success')
      setEditModalOpen(false)
      setEditingExpense(null)
      reloadExpenses()
    } catch (err) {
      showToast('Failed to update expense.', 'error')
    }
  }

  return (
    <div className="grid gap-6">
      {/* 1. EXPRESS SPEED LOGGER (Hero Card) */}
      <div className="rounded-2xl border-2 border-brand-500/30 bg-gradient-to-br from-white via-slate-50 to-brand-50/20 p-4 sm:p-5 shadow-soft">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isBn ? 'এক্সপ্রেস খরচ এন্ট্রি (Express Logger)' : 'Express Expense Logger'}
              </h2>
              <p className="text-xs text-slate-500">
                {isBn
                  ? 'বিবরণ ও টাকা লিখে এন্টার চাপুন — ৩ সেকেন্ডে সেভ!'
                  : 'Fast 1-step entry: Type expense, amount, and tap enter.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800">
              {isBn ? 'আজকের মোট:' : "Today's Spent:"} {formatCurrency(summaryKpis.todayTotal)}
            </span>
          </div>
        </div>

        {/* Quick One-Tap Presets */}
        <div className="mb-4">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {isBn ? '⚡ দ্রুত বাছাই (Quick Presets)' : '⚡ Quick Presets (1-Tap Fill)'}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {EXPENSE_PRESETS.map((preset) => (
              <button
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                key={preset.title}
                onClick={() => handlePresetSelect(preset)}
                type="button"
              >
                <span>{preset.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Express Input Form */}
        <form onSubmit={handleExpressSubmit}>
          <div className="grid gap-3 sm:grid-cols-12">
            {/* Title / Description */}
            <div className="sm:col-span-5">
              <input
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                onChange={(e) => setExpressTitle(e.target.value)}
                placeholder={isBn ? 'খরচের বিবরণ (যেমন: পেপার রিল, ড্রাইভার মজুরি)...' : 'Expense title (e.g. Paper Reel, Worker Tea)...'}
                ref={titleInputRef}
                required
                type="text"
                value={expressTitle}
              />
            </div>

            {/* Amount */}
            <div className="sm:col-span-3">
              <div className="relative">
                <span className="absolute left-3 top-3 text-sm font-bold text-slate-400">৳</span>
                <input
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-7 pr-3 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  min="0"
                  onChange={(e) => setExpressAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  step="0.01"
                  type="number"
                  value={expressAmount}
                />
              </div>
            </div>

            {/* Date */}
            <div className="sm:col-span-2">
              <input
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-brand-500"
                onChange={(e) => setExpressDate(e.target.value)}
                type="date"
                value={expressDate}
              />
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-2">
              <Button
                className="h-11 w-full justify-center text-sm font-bold shadow-sm"
                disabled={submitting}
                type="submit"
                variant="primary"
              >
                <Plus size={16} />
                <span>{isBn ? 'সেভ করুন' : 'Add Cost'}</span>
              </Button>
            </div>
          </div>

          {/* Category Chips Selector */}
          <div className="mt-3.5">
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isBn ? 'খরচের ক্যাটাগরি' : 'Category'}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    expressCategory === cat.id
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  key={cat.id}
                  onClick={() => setExpressCategory(cat.id)}
                  type="button"
                >
                  {cat.shortLabel || cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Pills */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">{isBn ? 'পেমেন্ট মাধ্যম:' : 'Payment:'}</span>
              <div className="flex items-center gap-1">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      expressPaymentMethod === method
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    key={method}
                    onClick={() => setExpressPaymentMethod(method)}
                    type="button"
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
              onClick={() => setShowMoreDetails((prev) => !prev)}
              type="button"
            >
              <span>{showMoreDetails ? (isBn ? 'কম বিস্তারিত' : 'Fewer fields') : (isBn ? '+ ভেন্ডর বা বিল নম্বর' : '+ Add Vendor / Bill #')}</span>
              {showMoreDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Expandable Vendor & Reference Fields */}
          {showMoreDetails && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 rounded-xl border border-slate-200 bg-white p-3">
              <Input
                id="exp-vendor"
                label={isBn ? 'ভেন্ডর / সাপ্লায়ার নাম' : 'Vendor / Supplier Name'}
                onChange={(e) => setExpressVendor(e.target.value)}
                placeholder="e.g. Akij Paper, Dhaka Die Makers"
                value={expressVendor}
              />
              <Input
                id="exp-ref"
                label={isBn ? 'বিল বা ভাউচার নম্বর' : 'Bill / Voucher Reference'}
                onChange={(e) => setExpressReference(e.target.value)}
                placeholder="e.g. Bill #1042"
                value={expressReference}
              />
            </div>
          )}
        </form>
      </div>

      {/* 2. SUMMARY KPI PILLARS */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {/* Today */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft min-w-0 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {isBn ? 'আজকের খরচ' : "Today's Spent"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Calendar size={16} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-black text-slate-900 truncate tracking-tight">
            {formatCurrency(summaryKpis.todayTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{summaryKpis.todayCount} entries today</p>
        </div>

        {/* This Month */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-soft min-w-0 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              {isBn ? 'চলতি মাসের মোট' : 'This Month Total'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
              <TrendingDown size={16} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-black text-rose-800 truncate tracking-tight">
            {formatCurrency(summaryKpis.monthTotal)}
          </p>
          <p className="mt-1 text-xs text-rose-700">{summaryKpis.monthCount} entries this month</p>
        </div>

        {/* Top Category Spent */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-soft min-w-0 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              {isBn ? 'সর্বোচ্চ খরচ খাত' : 'Top Cost Sector'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Tag size={16} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-black text-amber-900 truncate tracking-tight">
            {summaryKpis.topCatName}
          </p>
          <p className="mt-1 text-xs font-bold text-amber-700">{formatCurrency(summaryKpis.topCatAmt)}</p>
        </div>

        {/* All Time Total */}
        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white shadow-soft min-w-0 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isBn ? 'সর্বমোট রেকর্ড' : 'All Time Records'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white">
              <Receipt size={16} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-black text-white truncate tracking-tight">
            {formatCurrency(summaryKpis.allTimeTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{expenses.length} total entries</p>
        </div>
      </div>

      {/* 3. FILTER & SEARCH CONTROL BAR */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs no-print">
        {/* Period Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: isBn ? 'আজকে' : 'Today' },
              { id: 'yesterday', label: isBn ? 'গতকাল' : 'Yesterday' },
              { id: 'this_week', label: isBn ? 'এই সপ্তাহ' : 'This Week' },
              { id: 'this_month', label: isBn ? 'চলতি মাস' : 'This Month' },
              { id: 'this_year', label: isBn ? 'এই বছর' : 'This Year' },
              { id: 'all', label: isBn ? 'সব' : 'All Time' },
              { id: 'custom', label: isBn ? 'কাস্টম রেঞ্জ' : 'Custom' }
            ].map((p) => (
              <button
                className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                  periodPreset === p.id
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                key={p.id}
                onClick={() => setPeriodPreset(p.id)}
                type="button"
              >
                {p.label}
              </button>
            ))}
          </div>

          {periodPreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs"
                onChange={(e) => setCustomStartDate(e.target.value)}
                type="date"
                value={customStartDate}
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs"
                onChange={(e) => setCustomEndDate(e.target.value)}
                type="date"
                value={customEndDate}
              />
            </div>
          )}
        </div>

        {/* Category Pills & Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            <button
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setCategoryFilter('all')}
              type="button"
            >
              All
            </button>
            {EXPENSE_CATEGORIES.map((cat) => (
              <button
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  categoryFilter === cat.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                type="button"
              >
                {cat.shortLabel || cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-brand-500 focus:bg-white"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBn ? 'খরচ বা ভেন্ডর খুঁজুন...' : 'Search title, vendor, ref...'}
              type="text"
              value={searchQuery}
            />
          </div>
        </div>
      </div>

      {/* 4. EXPENSES LOG TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 font-bold uppercase tracking-wider text-slate-600">
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Expense Details</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Vendor / Ref</th>
                <th className="p-3.5 text-right">Amount (BDT)</th>
                <th className="p-3.5 text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => {
                const catObj =
                  EXPENSE_CATEGORIES.find((c) => c.id === exp.category) || {
                    label: 'Other',
                    shortLabel: 'Other'
                  }
                return (
                  <tr className="transition hover:bg-slate-50/80" key={exp.id}>
                    <td className="p-3.5 font-medium text-slate-600 whitespace-nowrap">{exp.date}</td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{exp.title}</p>
                      {exp.notes && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">{exp.notes}</p>
                      )}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                        {catObj.shortLabel || catObj.label}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700 whitespace-nowrap">{exp.paymentMethod}</td>
                    <td className="p-3.5 text-slate-700">
                      <p>{exp.vendor || '—'}</p>
                      {exp.reference && (
                        <p className="text-[10px] text-slate-400">Ref: {exp.reference}</p>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-rose-700 text-sm whitespace-nowrap">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="p-3.5 text-right no-print whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          onClick={() => {
                            setEditingExpense({ ...exp })
                            setEditModalOpen(true)
                          }}
                          title="Edit"
                          type="button"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          onClick={() => handleDelete(exp.id)}
                          title="Delete"
                          type="button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td className="p-8 text-center text-slate-500" colSpan={7}>
                    {isBn
                      ? 'এই সময়ের জন্য কোনো খরচের হিসাব পাওয়া যায়নি।'
                      : 'No expenses found. Use the express logger above to add one in seconds!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Expense Modal */}
      {editingExpense && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setEditingExpense(null)
          }}
          title={isBn ? 'খরচ পরিবর্তন করুন' : 'Edit Expense'}
        >
          <form className="grid gap-4" onSubmit={handleEditSubmit}>
            <Input
              id="edit-exp-title"
              label="Expense Title"
              onChange={(e) => setEditingExpense({ ...editingExpense, title: e.target.value })}
              required
              value={editingExpense.title}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                id="edit-exp-category"
                label="Category"
                onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                value={editingExpense.category}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </Select>

              <Input
                id="edit-exp-amount"
                label="Amount (BDT)"
                min="0"
                onChange={(e) => setEditingExpense({ ...editingExpense, amount: e.target.value })}
                required
                step="0.01"
                type="number"
                value={editingExpense.amount}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                id="edit-exp-date"
                label="Date"
                onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                type="date"
                value={editingExpense.date}
              />

              <Select
                id="edit-exp-payment"
                label="Payment Method"
                onChange={(e) => setEditingExpense({ ...editingExpense, paymentMethod: e.target.value })}
                value={editingExpense.paymentMethod}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                id="edit-exp-vendor"
                label="Vendor"
                onChange={(e) => setEditingExpense({ ...editingExpense, vendor: e.target.value })}
                value={editingExpense.vendor || ''}
              />

              <Input
                id="edit-exp-ref"
                label="Reference #"
                onChange={(e) => setEditingExpense({ ...editingExpense, reference: e.target.value })}
                value={editingExpense.reference || ''}
              />
            </div>

            <TextArea
              id="edit-exp-notes"
              label="Notes"
              onChange={(e) => setEditingExpense({ ...editingExpense, notes: e.target.value })}
              value={editingExpense.notes || ''}
            />

            <div className="mt-2 flex items-center justify-end gap-2.5">
              <Button
                onClick={() => {
                  setEditModalOpen(false)
                  setEditingExpense(null)
                }}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Update Expense
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
