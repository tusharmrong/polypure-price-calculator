import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  Calendar,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Factory,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  LayoutGrid,
  Package,
  Percent,
  Phone,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  Table as TableIcon,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Wallet,
  X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import TextArea from '../components/TextArea.jsx'
import { loadDocuments } from '../utils/documents.js'
import {
  EXPENSE_CATEGORIES,
  deleteExpense,
  loadExpenses,
  saveExpense
} from '../utils/expenses.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { formatDecimal } from '../utils/formatNumber.js'
import { useAuth } from '../utils/authContext.jsx'
import { PERMISSIONS } from '../utils/permissions.js'
import { useToast } from '../utils/toast.jsx'
import { useUiLanguage } from '../utils/uiLanguage.js'

function toNumber(val) {
  const num = Number(val || 0)
  return Number.isFinite(num) ? num : 0
}

function parseDocDate(raw) {
  if (!raw) return null
  const dateStr = String(raw).trim()
  const d = dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export default function Reports() {
  const { language } = useUiLanguage()
  const isBn = language === 'bn'
  const { currentUser, hasPermission } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  // State
  const [documents, setDocuments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pl') // 'pl' | 'dues' | 'expenses'
  const [dueViewMode, setDueViewMode] = useState('clients') // 'clients' | 'invoices'

  // Period Filter
  const [periodPreset, setPeriodPreset] = useState('this_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all')

  // Expense Modal State
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'raw_materials',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Cash',
    vendor: '',
    reference: '',
    notes: ''
  })

  // Load Data
  const reloadData = async () => {
    setLoading(true)
    try {
      const [docsData, expData] = await Promise.all([
        loadDocuments(),
        loadExpenses()
      ])
      setDocuments(docsData.filter((d) => !d.deletedAt))
      setExpenses(expData)
    } catch (err) {
      console.error('Failed to load reports data:', err)
      showToast('Unable to load latest financial records.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadData()
  }, [])

  // Calculate Date Boundaries
  const dateRange = useMemo(() => {
    const now = new Date()
    let start = new Date(0)
    let end = new Date(8640000000000000)

    if (periodPreset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    } else if (periodPreset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    } else if (periodPreset === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0)
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    } else if (periodPreset === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0)
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
    } else if (periodPreset === 'custom' && (customStartDate || customEndDate)) {
      if (customStartDate) start = new Date(`${customStartDate}T00:00:00`)
      if (customEndDate) end = new Date(`${customEndDate}T23:59:59`)
    }

    return { start, end }
  }, [periodPreset, customStartDate, customEndDate])

  // Filter Documents & Expenses in Period
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const d = parseDocDate(doc.date || doc.createdAt)
      if (!d) return false
      return d >= dateRange.start && d <= dateRange.end
    })
  }, [documents, dateRange])

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const d = parseDocDate(exp.date || exp.createdAt)
      if (!d) return false
      return d >= dateRange.start && d <= dateRange.end
    })
  }, [expenses, dateRange])

  // Aggregate Financial Calculations
  const financialSummary = useMemo(() => {
    let totalInvoicedRevenue = 0
    let totalCollectedAmount = 0
    let totalDueAmount = 0
    let quotationTotalAmount = 0
    let invoiceCount = 0
    let quotationCount = 0
    let receiptCount = 0

    // Process Invoices
    const paidInvoiceNumbers = new Set()
    filteredDocuments.forEach((doc) => {
      if (doc.type === 'Quotation') {
        quotationCount += 1
        quotationTotalAmount += toNumber(doc.totalAmount)
      } else if (doc.type === 'Invoice') {
        invoiceCount += 1
        const total = toNumber(doc.totalAmount)
        const paid = toNumber(doc.paidAmount)
        const due = toNumber(doc.dueAmount || Math.max(total - paid, 0))

        totalInvoicedRevenue += total
        totalCollectedAmount += paid
        totalDueAmount += due

        if (paid > 0 && doc.number) {
          paidInvoiceNumbers.add(String(doc.number).trim().toLowerCase())
        }
      } else if (doc.type === 'Money Receipt') {
        receiptCount += 1
        const recAmount = toNumber(doc.receivedAmount || doc.totalAmount)
        const workDetailText = String(doc.workDetails || doc.notes || '').toLowerCase()
        const isReferencedInPaidInvoice = [...paidInvoiceNumbers].some(
          (invNo) => invNo && workDetailText.includes(invNo)
        )
        if (!isReferencedInPaidInvoice) {
          totalCollectedAmount += recAmount
        }
      }
    })

    // Process Expenses
    let totalExpensesAmount = 0
    const expensesByCategory = {}
    EXPENSE_CATEGORIES.forEach((cat) => {
      expensesByCategory[cat.id] = 0
    })

    filteredExpenses.forEach((exp) => {
      const amount = toNumber(exp.amount)
      totalExpensesAmount += amount
      const cat = exp.category || 'other'
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amount
    })

    const netProfit = totalInvoicedRevenue - totalExpensesAmount
    const cashNetProfit = totalCollectedAmount - totalExpensesAmount
    const profitMargin = totalInvoicedRevenue > 0 ? (netProfit / totalInvoicedRevenue) * 100 : 0

    return {
      totalInvoicedRevenue,
      totalCollectedAmount,
      totalDueAmount,
      totalExpensesAmount,
      netProfit,
      cashNetProfit,
      profitMargin,
      invoiceCount,
      quotationCount,
      receiptCount,
      quotationTotalAmount,
      expensesByCategory
    }
  }, [filteredDocuments, filteredExpenses])

  // Extract Outstanding Due Invoices & Client-wise Due Summaries
  const { clientDuesList, invoiceDuesList } = useMemo(() => {
    const allInvoices = documents.filter((d) => d.type === 'Invoice')
    const dueInvoices = []
    const clientMap = new Map()

    const now = new Date()

    allInvoices.forEach((inv) => {
      const total = toNumber(inv.totalAmount)
      const paid = toNumber(inv.paidAmount)
      const due = toNumber(inv.dueAmount || Math.max(total - paid, 0))

      if (due > 0) {
        const invDate = parseDocDate(inv.date || inv.createdAt)
        const ageDays = invDate
          ? Math.max(0, Math.floor((now.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24)))
          : 0

        dueInvoices.push({
          id: inv.id,
          rawDoc: inv,
          number: inv.number,
          clientName: inv.clientName || 'Unknown Client',
          phone: inv.phone || '',
          address: inv.address || '',
          date: inv.date || '',
          displayDate: inv.displayDate || inv.date || '',
          totalAmount: total,
          paidAmount: paid,
          dueAmount: due,
          ageDays
        })

        const key = (inv.clientName || 'Unknown Client').trim().toLowerCase()
        const existing = clientMap.get(key) || {
          clientName: inv.clientName || 'Unknown Client',
          phone: inv.phone || '',
          address: inv.address || '',
          totalInvoiced: 0,
          totalPaid: 0,
          totalDue: 0,
          invoiceCount: 0,
          lastInvoiceNumber: inv.number,
          lastInvoiceDate: inv.displayDate || inv.date
        }

        existing.totalInvoiced += total
        existing.totalPaid += paid
        existing.totalDue += due
        existing.invoiceCount += 1
        if (!existing.phone && inv.phone) existing.phone = inv.phone
        if (!existing.address && inv.address) existing.address = inv.address

        clientMap.set(key, existing)
      }
    })

    return {
      clientDuesList: Array.from(clientMap.values()).sort((a, b) => b.totalDue - a.totalDue),
      invoiceDuesList: dueInvoices.sort((a, b) => b.dueAmount - a.dueAmount)
    }
  }, [documents])

  const filteredClientDues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return clientDuesList
    return clientDuesList.filter(
      (c) =>
        c.clientName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    )
  }, [clientDuesList, searchQuery])

  const filteredInvoiceDues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return invoiceDuesList
    return invoiceDuesList.filter(
      (inv) =>
        inv.clientName.toLowerCase().includes(q) ||
        inv.number.toLowerCase().includes(q) ||
        inv.phone.toLowerCase().includes(q)
    )
  }, [invoiceDuesList, searchQuery])

  // Order-wise Factory Cost & Profitability Register
  const orderProfitList = useMemo(() => {
    return filteredDocuments
      .filter((doc) => doc.type === 'Invoice')
      .map((inv) => {
        const invoicedAmount = toNumber(inv.totalAmount)
        const itemsList = Array.isArray(inv.items) ? inv.items : []
        const totalQty = itemsList.reduce((sum, it) => sum + toNumber(it.quantity), 0)
        const bagTypesCount = itemsList.length

        const fc = inv.factoryCost || {}
        const totalFactoryCost = toNumber(fc.totalFactoryCost || 0)
        const netProfit = invoicedAmount - totalFactoryCost
        const marginPct = invoicedAmount > 0 ? (netProfit / invoicedAmount) * 100 : 0

        return {
          id: inv.id,
          rawDoc: inv,
          number: inv.number,
          date: inv.date || inv.displayDate,
          clientName: inv.clientName || 'Unnamed Client',
          bagTypesCount,
          totalQty,
          invoicedAmount,
          rawMaterialPounds: toNumber(fc.rawMaterialPounds || 0),
          poundRate: toNumber(fc.poundRate || 0),
          rawMaterialCost: toNumber(fc.rawMaterialCost || 0),
          totalPrintCost: toNumber(fc.totalPrintCost || 0),
          totalHandleCost: toNumber(fc.totalHandleCost || 0),
          totalAdhesiveCost: toNumber(fc.totalAdhesiveCost || 0),
          blockCharge: toNumber(fc.blockCharge || 0),
          extraFinishingCost: toNumber(fc.extraFinishingCost || 0),
          totalFactoryCost,
          netProfit,
          marginPct,
          hasCostData: totalFactoryCost > 0
        }
      })
  }, [filteredDocuments])

  // Displayed Expenses with Category & Search
  const displayedExpenses = useMemo(() => {
    let list = filteredExpenses
    if (expenseCategoryFilter !== 'all') {
      list = list.filter((e) => e.category === expenseCategoryFilter)
    }
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (e) =>
          (e.title || '').toLowerCase().includes(q) ||
          (e.vendor || '').toLowerCase().includes(q) ||
          (e.reference || '').toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  }, [filteredExpenses, expenseCategoryFilter, searchQuery])

  // Handlers
  const handleSaveExpense = async (e) => {
    e.preventDefault()
    if (!expenseForm.title || !expenseForm.amount) {
      showToast('Please enter title and amount.', 'error')
      return
    }

    try {
      const payload = {
        ...expenseForm,
        amount: Number(expenseForm.amount),
        id: editingExpenseId || `exp_${Date.now()}`
      }
      await saveExpense(payload, currentUser)
      showToast('Expense saved successfully.', 'success')
      setExpenseModalOpen(false)
      setEditingExpenseId(null)
      await reloadData()
    } catch (err) {
      console.error('Failed to save expense:', err)
      showToast('Error saving expense.', 'error')
    }
  }

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense entry?')) return
    try {
      await deleteExpense(id)
      showToast('Expense deleted.', 'success')
      await reloadData()
    } catch (err) {
      console.error('Failed to delete expense:', err)
      showToast('Failed to delete.', 'error')
    }
  }

  const openEditExpense = (exp) => {
    setEditingExpenseId(exp.id)
    setExpenseForm({
      title: exp.title || '',
      category: exp.category || 'raw_materials',
      amount: String(exp.amount || ''),
      date: exp.date || new Date().toISOString().slice(0, 10),
      paymentMethod: exp.paymentMethod || 'Cash',
      vendor: exp.vendor || '',
      reference: exp.reference || '',
      notes: exp.notes || ''
    })
    setExpenseModalOpen(true)
  }

  const handleCollectDue = (client) => {
    navigate('/money-receipt', {
      state: {
        prefillClient: {
          clientName: client.clientName,
          phone: client.phone,
          address: client.address,
          amount: client.totalDue,
          workDetails: `Payment collection for outstanding dues (Total Due: BDT ${formatDecimal(client.totalDue)})`
        }
      }
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const periodLabels = {
    today: isBn ? 'আজ' : 'Today',
    this_month: isBn ? 'চলতি মাস' : 'This Month',
    last_month: isBn ? 'গত মাস' : 'Last Month',
    this_year: isBn ? 'চলতি বছর' : 'This Year',
    all_time: isBn ? 'সর্বমোট' : 'All Time',
    custom: isBn ? 'কাস্টম রেঞ্জ' : 'Custom Range'
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Period Toolbar */}
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200/80 pb-3.5 no-print">
        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex flex-wrap items-center rounded-xl border border-slate-200 bg-slate-100 p-1">
            {['this_month', 'last_month', 'this_year', 'all_time', 'custom'].map((preset) => (
              <button
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  periodPreset === preset
                    ? 'bg-white text-brand-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                key={preset}
                onClick={() => setPeriodPreset(preset)}
                type="button"
              >
                {periodLabels[preset]}
              </button>
            ))}
          </div>

          {periodPreset === 'custom' && (
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 text-xs">
              <input
                className="h-7 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs outline-none"
                onChange={(e) => setCustomStartDate(e.target.value)}
                type="date"
                value={customStartDate}
              />
              <span className="text-slate-400 font-semibold">to</span>
              <input
                className="h-7 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs outline-none"
                onChange={(e) => setCustomEndDate(e.target.value)}
                type="date"
                value={customEndDate}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {hasPermission(PERMISSIONS.MANAGE_EXPENSES) && (
            <Button
              className="text-xs py-2"
              onClick={() => {
                setEditingExpenseId(null)
                setExpenseForm({
                  title: '',
                  category: 'raw_materials',
                  amount: '',
                  date: new Date().toISOString().slice(0, 10),
                  paymentMethod: 'Cash',
                  vendor: '',
                  reference: '',
                  notes: ''
                })
                setExpenseModalOpen(true)
              }}
              type="button"
              variant="primary"
            >
              <Plus size={14} />
              <span>{isBn ? 'খরচ এন্ট্রি' : 'Add Expense'}</span>
            </Button>
          )}

          <Button className="text-xs py-2" onClick={handlePrint} type="button" variant="secondary">
            <Printer size={14} />
            <span>{isBn ? 'প্রিন্ট' : 'Print Statement'}</span>
          </Button>
        </div>
      </div>

      {/* 4 Responsive Financial Pillar Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total Invoiced Revenue */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {isBn ? 'মোট ইনভয়েস রেভিনিউ' : 'Total Revenue'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <FileText size={16} />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-slate-900">
            {formatCurrency(financialSummary.totalInvoicedRevenue)}
          </p>
          <div className="mt-1 text-xs text-slate-500">
            <span>{financialSummary.invoiceCount} {isBn ? 'টি ইনভয়েস' : 'invoiced orders'}</span>
          </div>
        </div>

        {/* 2. Real Cash Collections */}
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/40 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              {isBn ? 'আদায়কৃত ক্যাশ' : 'Cash Collected'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Wallet size={16} />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-emerald-800">
            {formatCurrency(financialSummary.totalCollectedAmount)}
          </p>
          <div className="mt-1 text-xs text-emerald-700">
            <span>{isBn ? 'ইনফ্লো ও অগ্রিম রিসিপ্ট' : 'Inflow & receipts collected'}</span>
          </div>
        </div>

        {/* 3. Total Expenses */}
        <div className="rounded-2xl border border-rose-200/90 bg-rose-50/40 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              {isBn ? 'মোট ব্যবসায়িক খরচ' : 'Total Expenses'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
              <TrendingDown size={16} />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-rose-800">
            {formatCurrency(financialSummary.totalExpensesAmount)}
          </p>
          <div className="mt-1 text-xs text-rose-700">
            <span>{filteredExpenses.length} {isBn ? 'টি খরচের রেকর্ড' : 'expense entries'}</span>
          </div>
        </div>

        {/* 4. Net Profit & Margin */}
        <div
          className={`rounded-2xl border p-4 shadow-soft ${
            financialSummary.netProfit >= 0
              ? 'border-emerald-300 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white'
              : 'border-rose-300 bg-gradient-to-br from-rose-600 via-rose-700 to-rose-800 text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/90">
              {financialSummary.netProfit >= 0
                ? isBn ? 'নিট লাভ (Net Profit)' : 'Net Profit'
                : isBn ? 'নিট ক্ষতি (Net Loss)' : 'Net Loss'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white">
              {financialSummary.netProfit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>
          </div>
          <p className="mt-2 text-xl font-black">
            {financialSummary.netProfit >= 0 ? '+' : '-'} {formatCurrency(Math.abs(financialSummary.netProfit))}
          </p>
          <div className="mt-1 flex items-center justify-between text-xs text-white/85">
            <span>Margin: {financialSummary.profitMargin.toFixed(1)}%</span>
            <span>Cash: {formatCurrency(financialSummary.cashNetProfit)}</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation (Sleek Pills) */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200/80 pb-3 no-print">
        <button
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'pl'
              ? 'bg-brand-700 text-white shadow-soft'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
          onClick={() => setActiveTab('pl')}
          type="button"
        >
          <TrendingUp size={15} />
          <span>{isBn ? 'লাভ-ক্ষতি বিবরণী (P&L)' : 'Profit & Loss Statement'}</span>
        </button>

        <button
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'dues'
              ? 'bg-brand-700 text-white shadow-soft'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
          onClick={() => setActiveTab('dues')}
          type="button"
        >
          <AlertCircle size={15} />
          <span>{isBn ? 'বকেয়া তালিকা' : 'Outstanding Due List'}</span>
          {clientDuesList.length > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                activeTab === 'dues' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {clientDuesList.length}
            </span>
          )}
        </button>

        <button
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'expenses'
              ? 'bg-brand-700 text-white shadow-soft'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
          onClick={() => setActiveTab('expenses')}
          type="button"
        >
          <CreditCard size={15} />
          <span>{isBn ? 'খরচ ব্যবস্থাপনা' : 'Expense Manager'}</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              activeTab === 'expenses' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {filteredExpenses.length}
          </span>
        </button>
      </div>

      {/* ================= TAB 1: PROFIT & LOSS STATEMENT ================= */}
      {activeTab === 'pl' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            {/* Income & Expense Breakdown Statement */}
            <Card>
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isBn ? 'লাভ-ক্ষতি ও আয়-ব্যয় বিবরণী' : 'Income & Expense Statement'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {periodLabels[periodPreset]} ({dateRange.start.toLocaleDateString()} –{' '}
                    {dateRange.end.toLocaleDateString()})
                  </p>
                </div>
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    financialSummary.netProfit >= 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {financialSummary.netProfit >= 0 ? 'Profitable' : 'Deficit / Loss'}
                </span>
              </div>

              <div className="space-y-4 text-xs">
                {/* 1. REVENUE SECTION */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    1. Revenue & Sales (আয়)
                  </p>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/60">
                    <div className="flex items-center justify-between p-3">
                      <span className="text-slate-700 font-medium">
                        Invoiced Orders ({financialSummary.invoiceCount} invoices)
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(financialSummary.totalInvoicedRevenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3">
                      <span className="text-slate-700 font-medium">
                        Actual Cash Collected (Inflow)
                      </span>
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(financialSummary.totalCollectedAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3">
                      <span className="text-slate-700 font-medium">Pending Uncollected Invoices (Dues)</span>
                      <span className="font-bold text-amber-700">
                        {formatCurrency(financialSummary.totalDueAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. EXPENSES SECTION */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    2. Operating & Material Costs (ব্যয়)
                  </p>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/60">
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const catAmount = financialSummary.expensesByCategory[cat.id] || 0
                      if (catAmount <= 0) return null
                      return (
                        <div className="flex items-center justify-between p-3" key={cat.id}>
                          <span className="text-slate-700">{cat.label}</span>
                          <span className="font-bold text-rose-700">{formatCurrency(catAmount)}</span>
                        </div>
                      )
                    })}
                    <div className="flex items-center justify-between bg-rose-50/60 p-3 font-bold text-rose-900">
                      <span>Total Operating Expenses</span>
                      <span>{formatCurrency(financialSummary.totalExpensesAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. NET PROFIT / LOSS SUMMARY */}
                <div className="rounded-2xl border-2 border-slate-900 bg-slate-900 p-4 text-white">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-sm font-bold">Invoiced Net Profit / (Loss)</span>
                    <span
                      className={`text-base font-extrabold ${
                        financialSummary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {financialSummary.netProfit >= 0 ? '+' : '-'} {formatCurrency(Math.abs(financialSummary.netProfit))}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                    <span>Net Realized Cash Profit (Cash Inflow - Expenses)</span>
                    <span
                      className={`font-bold ${
                        financialSummary.cashNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {financialSummary.cashNetProfit >= 0 ? '+' : '-'} {formatCurrency(Math.abs(financialSummary.cashNetProfit))}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Right Column: Expense Category Distribution & Health Ratios */}
            <div className="space-y-6">
              <Card>
                <h3 className="mb-4 text-base font-bold text-slate-900">
                  {isBn ? 'ব্যয় বিশ্লেষণ (Expense Breakdown)' : 'Cost Breakdown by Category'}
                </h3>
                <div className="space-y-3.5">
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const amount = financialSummary.expensesByCategory[cat.id] || 0
                    const pct =
                      financialSummary.totalExpensesAmount > 0
                        ? (amount / financialSummary.totalExpensesAmount) * 100
                        : 0
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700">{cat.label}</span>
                          <span className="font-bold text-slate-900">
                            {formatCurrency(amount)} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand-600 transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Quotation Pipeline Summary Card */}
              <Card>
                <h3 className="mb-2 text-base font-bold text-slate-900">
                  {isBn ? 'কোটেশন পাইপলাইন' : 'Quotation Pipeline'}
                </h3>
                <p className="text-xs text-slate-500">
                  {financialSummary.quotationCount} quotations generated in this period worth{' '}
                  <strong className="text-brand-700 font-bold">
                    {formatCurrency(financialSummary.quotationTotalAmount)}
                  </strong>
                  .
                </p>
              </Card>
            </div>
          </div>

          {/* ORDER PRODUCTION COST & PROFITABILITY REGISTER */}
          <Card>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Factory size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isBn ? '🏭 অর্ডারভিত্তিক কারখানা খরচ ও মুনাফা' : '🏭 Order Production Cost & Profitability'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isBn
                      ? 'প্রতিটি অর্ডারের কাঁচামাল পাউন্ড, প্রিন্ট, হ্যান্ডেল ও উৎপাদন খরচ'
                      : 'Per-order raw material weight (lbs), print, handle/courier finishing & net profit'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  Orders: {orderProfitList.length}
                </span>
                <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800 border border-rose-200">
                  Total COGS: {formatCurrency(orderProfitList.reduce((s, o) => s + o.totalFactoryCost, 0))}
                </span>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                  Order Profit: {formatCurrency(orderProfitList.reduce((s, o) => s + o.netProfit, 0))}
                </span>
              </div>
            </div>

            {orderProfitList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {isBn ? 'এই সময়সীমার মধ্যে কোনো ইনভয়েস নেই।' : 'No invoice orders found for the selected date range.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
                      <th className="py-3 px-3">{isBn ? 'তারিখ / ইনভয়েস' : 'Date / Invoice'}</th>
                      <th className="py-3 px-3">{isBn ? 'ক্লায়েন্ট' : 'Client'}</th>
                      <th className="py-3 px-3 text-right">{isBn ? 'অর্ডার পরিমাণ' : 'Quantity'}</th>
                      <th className="py-3 px-3 text-right">{isBn ? 'বিক্রয় মূল্য' : 'Invoiced Sale'}</th>
                      <th className="py-3 px-3 text-right">{isBn ? 'কাঁচামাল খরচ' : 'Raw Material'}</th>
                      <th className="py-3 px-3 text-right">{isBn ? 'প্রিন্ট ও ফিনিশিং' : 'Finishing & Custom'}</th>
                      <th className="py-3 px-3 text-right">{isBn ? 'মোট কারখানা খরচ' : 'Total Cost (COGS)'}</th>
                      <th className="py-3 px-3 text-right">{isBn ? 'নিট লাভ' : 'Net Profit'}</th>
                      <th className="py-3 px-3 text-center">{isBn ? 'মার্জিন' : 'Margin %'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderProfitList.map((order) => {
                      const finishingTotal =
                        order.totalPrintCost +
                        order.totalHandleCost +
                        order.totalAdhesiveCost +
                        order.blockCharge +
                        order.extraFinishingCost

                      return (
                        <tr className="hover:bg-slate-50/80 transition" key={order.id}>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900">{order.number}</p>
                            <p className="text-[11px] text-slate-500">{order.date}</p>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{order.clientName}</td>
                          <td className="py-3 px-3 text-right font-medium text-slate-700">
                            {order.totalQty.toLocaleString()} pcs
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(order.invoicedAmount)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {order.rawMaterialPounds > 0 ? (
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {formatCurrency(order.rawMaterialCost)}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {order.rawMaterialPounds} lbs
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-700">
                            {finishingTotal > 0 ? formatCurrency(finishingTotal) : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-rose-700">
                            {order.totalFactoryCost > 0 ? (
                              formatCurrency(order.totalFactoryCost)
                            ) : (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                                Not recorded
                              </span>
                            )}
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-extrabold ${
                              order.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {order.netProfit >= 0 ? '+' : '-'}
                            {formatCurrency(Math.abs(order.netProfit))}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                order.marginPct >= 15
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.marginPct >= 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {order.marginPct.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ================= TAB 2: DUE LIST & RECOVERY ================= */}
      {activeTab === 'dues' && (
        <div className="space-y-4">
          {/* Due List Filter & Switcher Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between no-print">
            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                <button
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    dueViewMode === 'clients'
                      ? 'bg-white text-brand-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setDueViewMode('clients')}
                  type="button"
                >
                  {isBn ? 'ক্লায়েন্ট সারাংশ' : 'Client-Wise Summary'} ({clientDuesList.length})
                </button>
                <button
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    dueViewMode === 'invoices'
                      ? 'bg-white text-brand-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setDueViewMode('invoices')}
                  type="button"
                >
                  {isBn ? 'ইনভয়েস তালিকা' : 'Invoice-Wise Sheet'} ({invoiceDuesList.length})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-brand-500 focus:bg-white"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isBn ? 'ক্লায়েন্ট বা ইনভয়েস খুঁজুন...' : 'Search client, phone, or inv #...'}
                  type="text"
                  value={searchQuery}
                />
              </div>
            </div>
          </div>

          {/* View Mode 1: Client-Wise Aggregated Dues */}
          {dueViewMode === 'clients' && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90 font-bold uppercase tracking-wider text-slate-600">
                      <th className="p-3.5">Client & Contact</th>
                      <th className="p-3.5 text-center">Unpaid Invoices</th>
                      <th className="p-3.5 text-right">Total Invoiced</th>
                      <th className="p-3.5 text-right">Total Paid</th>
                      <th className="p-3.5 text-right">Outstanding Due</th>
                      <th className="p-3.5 text-right no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClientDues.map((client) => (
                      <tr className="transition hover:bg-slate-50/80" key={client.clientName + client.phone}>
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900">{client.clientName}</p>
                          <p className="text-[11px] text-slate-500">
                            {client.phone || 'No phone'} {client.address ? `• ${client.address}` : ''}
                          </p>
                        </td>
                        <td className="p-3.5 text-center font-semibold text-slate-700">
                          <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-amber-800 font-bold">
                            {client.invoiceCount}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-medium text-slate-700">
                          {formatCurrency(client.totalInvoiced)}
                        </td>
                        <td className="p-3.5 text-right font-medium text-emerald-700">
                          {formatCurrency(client.totalPaid)}
                        </td>
                        <td className="p-3.5 text-right font-extrabold text-rose-700 text-sm">
                          {formatCurrency(client.totalDue)}
                        </td>
                        <td className="p-3.5 text-right no-print">
                          <Button
                            className="text-xs px-2.5 py-1"
                            onClick={() => handleCollectDue(client)}
                            type="button"
                            variant="primary"
                          >
                            <Receipt size={13} />
                            <span>{isBn ? 'টাকা গ্রহণ' : 'Collect Due'}</span>
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {filteredClientDues.length === 0 && (
                      <tr>
                        <td className="p-8 text-center text-slate-500" colSpan={6}>
                          No outstanding client dues found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View Mode 2: Invoice-Wise Detailed Dues Sheet */}
          {dueViewMode === 'invoices' && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90 font-bold uppercase tracking-wider text-slate-600">
                      <th className="p-3.5">Invoice # & Date</th>
                      <th className="p-3.5">Client & Phone</th>
                      <th className="p-3.5 text-right">Invoiced Amount</th>
                      <th className="p-3.5 text-right">Paid Amount</th>
                      <th className="p-3.5 text-right">Pending Due</th>
                      <th className="p-3.5 text-center">Aging</th>
                      <th className="p-3.5 text-right no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoiceDues.map((inv) => (
                      <tr className="transition hover:bg-slate-50/80" key={inv.id}>
                        <td className="p-3.5 font-bold text-slate-900">
                          {inv.number}
                          <span className="block text-[11px] font-normal text-slate-500">{inv.displayDate}</span>
                        </td>
                        <td className="p-3.5">
                          <p className="font-semibold text-slate-800">{inv.clientName}</p>
                          <p className="text-[11px] text-slate-500">{inv.phone}</p>
                        </td>
                        <td className="p-3.5 text-right font-medium text-slate-700">
                          {formatCurrency(inv.totalAmount)}
                        </td>
                        <td className="p-3.5 text-right font-medium text-emerald-700">
                          {formatCurrency(inv.paidAmount)}
                        </td>
                        <td className="p-3.5 text-right font-extrabold text-rose-700 text-sm">
                          {formatCurrency(inv.dueAmount)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              inv.ageDays > 30
                                ? 'bg-rose-100 text-rose-800'
                                : inv.ageDays > 15
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {inv.ageDays} days
                          </span>
                        </td>
                        <td className="p-3.5 text-right no-print">
                          <Button
                            className="text-xs px-2.5 py-1"
                            onClick={() =>
                              handleCollectDue({
                                clientName: inv.clientName,
                                phone: inv.phone,
                                address: inv.address,
                                totalDue: inv.dueAmount
                              })
                            }
                            type="button"
                            variant="primary"
                          >
                            <Receipt size={13} />
                            <span>Collect</span>
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {filteredInvoiceDues.length === 0 && (
                      <tr>
                        <td className="p-8 text-center text-slate-500" colSpan={7}>
                          No overdue invoices found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: EXPENSE MANAGER ================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between no-print">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                  expenseCategoryFilter === 'all'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => setExpenseCategoryFilter('all')}
                type="button"
              >
                All Categories
              </button>
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    expenseCategoryFilter === cat.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  key={cat.id}
                  onClick={() => setExpenseCategoryFilter(cat.id)}
                  type="button"
                >
                  {cat.label.split(' ')[0]}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-brand-500 focus:bg-white"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expenses or vendor..."
                type="text"
                value={searchQuery}
              />
            </div>
          </div>

          {/* Expenses Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 font-bold uppercase tracking-wider text-slate-600">
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Expense Title / Details</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Vendor / Party</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5 text-right">Amount</th>
                    <th className="p-3.5 text-right no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedExpenses.map((exp) => {
                    const catObj =
                      EXPENSE_CATEGORIES.find((c) => c.id === exp.category) || {
                        label: 'Other',
                        color: 'slate'
                      }
                    return (
                      <tr className="transition hover:bg-slate-50/80" key={exp.id}>
                        <td className="p-3.5 font-medium text-slate-600">{exp.date}</td>
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900">{exp.title}</p>
                          {exp.reference && (
                            <p className="text-[11px] text-slate-500">Ref: {exp.reference}</p>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                            {catObj.label}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-700">{exp.vendor || '—'}</td>
                        <td className="p-3.5 text-slate-700">{exp.paymentMethod}</td>
                        <td className="p-3.5 text-right font-extrabold text-rose-700 text-sm">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="p-3.5 text-right no-print">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition font-bold"
                              onClick={() => openEditExpense(exp)}
                              title="Edit"
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                              onClick={() => handleDeleteExpense(exp.id)}
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

                  {displayedExpenses.length === 0 && (
                    <tr>
                      <td className="p-8 text-center text-slate-500" colSpan={7}>
                        No expenses found for this period. Click "+ Add Expense" to record one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal (Add / Edit) */}
      <Modal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title={editingExpenseId ? 'Edit Expense' : 'Record Business Expense'}
      >
        <form className="grid gap-4" onSubmit={handleSaveExpense}>
          <Input
            id="exp-title"
            label="Expense Title / Description"
            onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
            placeholder="e.g. Paper raw material roll, Cylinder plate charge, Electricity bill"
            required
            value={expenseForm.title}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id="exp-category"
              label="Expense Category"
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
              value={expenseForm.category}
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </Select>

            <Input
              id="exp-amount"
              label="Amount (BDT)"
              min="0"
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={expenseForm.amount}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="exp-date"
              label="Date"
              onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
              type="date"
              value={expenseForm.date}
            />

            <Select
              id="exp-method"
              label="Payment Method"
              onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
              value={expenseForm.paymentMethod}
            >
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Mobile Banking</option>
              <option>Cheque</option>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="exp-vendor"
              label="Vendor / Supplier Name"
              onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
              placeholder="e.g. Akij Paper, Dhaka Die Makers"
              value={expenseForm.vendor}
            />

            <Input
              id="exp-ref"
              label="Bill / Invoice Reference #"
              onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
              placeholder="e.g. Bill #1042"
              value={expenseForm.reference}
            />
          </div>

          <TextArea
            id="exp-notes"
            label="Notes (Optional)"
            onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
            placeholder="Additional notes or specifications..."
            value={expenseForm.notes}
          />

          <div className="mt-2 flex items-center justify-end gap-2.5">
            <Button onClick={() => setExpenseModalOpen(false)} type="button" variant="secondary">
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingExpenseId ? 'Update Expense' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
