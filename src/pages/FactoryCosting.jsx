import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
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
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Table as TableIcon,
  Tag,
  TrendingUp,
  User,
  Wand2,
  X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import { useAuth } from '../utils/authContext.jsx'
import { loadDocuments, saveDocument } from '../utils/documents.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { PERMISSIONS } from '../utils/permissions.js'
import { useToast } from '../utils/toast.jsx'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function FactoryCosting() {
  const { language } = useUiLanguage()
  const isBn = language === 'bn'
  const { currentUser, hasPermission } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [activeTab, setActiveTab] = useState('register') // 'register' | 'calculator'
  const [displayLayout, setDisplayLayout] = useState('cards') // 'cards' | 'table'
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [marginFilter, setMarginFilter] = useState('all') // 'all' | 'costed' | 'profitable' | 'low_margin' | 'loss' | 'not_costed'

  // Selected Order for Cost Editing
  const [selectedDocId, setSelectedDocId] = useState('')
  const [selectedDoc, setSelectedDoc] = useState(null)

  // Multi-Item Factory Cost State
  const [itemCosts, setItemCosts] = useState([])

  // Shared / Order-Level Overheads
  const [orderOverheads, setOrderOverheads] = useState({
    blockCharge: '',
    orderExtraFinishingCost: '',
    wastagePercent: '3'
  })

  // Load Documents on Mount
  const reloadData = async () => {
    setLoading(true)
    try {
      const docs = await loadDocuments()
      const validDocs = docs.filter((d) => !d.deletedAt && d.type === 'Invoice')
      setDocuments(validDocs)
    } catch (err) {
      console.error('Failed to load documents for factory costing:', err)
      showToast('Unable to load invoices list.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadData()
  }, [])

  // Check if passed a prefill document from navigation state
  useEffect(() => {
    if (location.state?.prefillDocument) {
      handleSelectDocument(location.state.prefillDocument)
      setActiveTab('calculator')
    }
  }, [location.state])

  const toNumber = (val) => {
    const num = Number(val || 0)
    return Number.isFinite(num) ? num : 0
  }

  // Handle Document Selection and Initialize Multi-Item Costs
  const handleSelectDocument = (doc) => {
    if (!doc) {
      setSelectedDocId('')
      setSelectedDoc(null)
      setItemCosts([])
      setOrderOverheads({ blockCharge: '', orderExtraFinishingCost: '', wastagePercent: '3' })
      return
    }

    setSelectedDocId(doc.id || doc.number)
    setSelectedDoc(doc)

    const docItems = Array.isArray(doc.items) && doc.items.length > 0 ? doc.items : []
    const savedFc = doc.factoryCost || {}
    const savedItemCosts = Array.isArray(savedFc.itemCosts) ? savedFc.itemCosts : []

    // Build item-by-item cost state
    const builtItemCosts = docItems.map((item, index) => {
      const existing = savedItemCosts.find((c) => c.itemId === item.id) || savedItemCosts[index]

      const desc = item.description || ''
      const isHandleBag = /handle|d-cut|loop|হ্যান্ডেল/i.test(desc)
      const isCourierBag = /courier|adhesive|flap|security|কুরিয়ার|আঠা|গাম/i.test(desc)

      const legacyRawPounds = index === 0 && savedFc.rawMaterialPounds ? String(savedFc.rawMaterialPounds) : ''
      const legacyPoundRate = savedFc.poundRate ? String(savedFc.poundRate) : '140'
      const legacyPrintRate = index === 0 && savedFc.printCostPerUnit ? String(savedFc.printCostPerUnit) : ''

      return {
        itemId: item.id || `item-${index}`,
        description: desc || `Bag Item #${index + 1}`,
        quantity: toNumber(item.quantity),
        rate: toNumber(item.rate),
        rawMaterialPounds: existing?.rawMaterialPounds !== undefined
          ? String(existing.rawMaterialPounds || '')
          : legacyRawPounds,
        poundRate: existing?.poundRate !== undefined
          ? String(existing.poundRate || '140')
          : legacyPoundRate,
        printCostPerUnit: existing?.printCostPerUnit !== undefined
          ? String(existing.printCostPerUnit || '')
          : legacyPrintRate,
        hasHandle: existing?.hasHandle !== undefined
          ? Boolean(existing.hasHandle)
          : (savedFc.hasHandle && index === 0) || isHandleBag,
        handleCostPerUnit: existing?.handleCostPerUnit !== undefined
          ? String(existing.handleCostPerUnit || '')
          : (existing?.hasHandle || isHandleBag ? (savedFc.handleCostPerUnit ? String(savedFc.handleCostPerUnit) : '2.00') : ''),
        hasAdhesive: existing?.hasAdhesive !== undefined
          ? Boolean(existing.hasAdhesive)
          : (savedFc.hasAdhesive && index === 0) || isCourierBag,
        adhesiveCostPerUnit: existing?.adhesiveCostPerUnit !== undefined
          ? String(existing.adhesiveCostPerUnit || '')
          : (existing?.hasAdhesive || isCourierBag ? (savedFc.adhesiveCostPerUnit ? String(savedFc.adhesiveCostPerUnit) : '0.50') : ''),
        extraFinishingCost: existing?.extraFinishingCost !== undefined
          ? String(existing.extraFinishingCost || '')
          : (index === 0 && savedFc.extraFinishingCost ? String(savedFc.extraFinishingCost) : '')
      }
    })

    setItemCosts(builtItemCosts)

    // Order-Level Overheads
    setOrderOverheads({
      blockCharge: savedFc.blockCharge !== undefined ? String(savedFc.blockCharge || '') : '',
      orderExtraFinishingCost: savedFc.orderExtraFinishingCost !== undefined ? String(savedFc.orderExtraFinishingCost || '') : '',
      wastagePercent: savedFc.wastagePercent !== undefined ? String(savedFc.wastagePercent ?? '3') : '3'
    })
  }

  // Update a specific field for a specific bag item
  const handleItemCostChange = (index, field, value) => {
    setItemCosts((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        [field]: value
      }
      return updated
    })
  }

  // Helper: Apply same pound rate to all bag items
  const handleApplyPoundRateToAll = (rate) => {
    setItemCosts((prev) =>
      prev.map((item) => ({
        ...item,
        poundRate: rate
      }))
    )
    showToast(`Applied ৳${rate}/lb to all bag types.`, 'success')
  }

  // Helper: Apply same print cost to all bag items
  const handleApplyPrintRateToAll = (rate) => {
    setItemCosts((prev) =>
      prev.map((item) => ({
        ...item,
        printCostPerUnit: rate
      }))
    )
    showToast(`Applied ৳${rate}/bag print cost to all bag types.`, 'success')
  }

  // Calculate Order Quantity & Sale Total
  const totalOrderQuantity = useMemo(() => {
    return itemCosts.reduce((sum, item) => sum + item.quantity, 0)
  }, [itemCosts])

  const totalInvoicedAmount = useMemo(() => {
    return toNumber(selectedDoc?.totalAmount || 0)
  }, [selectedDoc])

  // Computed Item-by-Item & Overall Order Cost Calculations
  const calculatedData = useMemo(() => {
    const itemCalculations = itemCosts.map((item) => {
      const qty = item.quantity
      const pounds = toNumber(item.rawMaterialPounds)
      const pRate = toNumber(item.poundRate)
      const rawMaterialTotal = pounds * pRate

      const printRate = toNumber(item.printCostPerUnit)
      const printTotal = printRate * qty

      const handleRate = item.hasHandle ? toNumber(item.handleCostPerUnit) : 0
      const handleTotal = handleRate * qty

      const adhesiveRate = item.hasAdhesive ? toNumber(item.adhesiveCostPerUnit) : 0
      const adhesiveTotal = adhesiveRate * qty

      const extraFinishing = toNumber(item.extraFinishingCost)

      const itemDirectCost = rawMaterialTotal + printTotal + handleTotal + adhesiveTotal + extraFinishing
      const itemInvoicedAmount = qty * item.rate
      const itemDirectProfit = itemInvoicedAmount - itemDirectCost
      const itemMarginPct = itemInvoicedAmount > 0 ? (itemDirectProfit / itemInvoicedAmount) * 100 : 0

      const costPerBag = qty > 0 ? itemDirectCost / qty : 0
      const salePerBag = item.rate
      const profitPerBag = qty > 0 ? itemDirectProfit / qty : 0

      return {
        ...item,
        rawMaterialTotal,
        printTotal,
        handleTotal,
        adhesiveTotal,
        extraFinishing,
        itemDirectCost,
        itemInvoicedAmount,
        itemDirectProfit,
        itemMarginPct,
        costPerBag,
        salePerBag,
        profitPerBag
      }
    })

    const totalRawMaterialPounds = itemCalculations.reduce((sum, it) => sum + toNumber(it.rawMaterialPounds), 0)
    const totalRawMaterialCost = itemCalculations.reduce((sum, it) => sum + it.rawMaterialTotal, 0)
    const totalPrintCost = itemCalculations.reduce((sum, it) => sum + it.printTotal, 0)
    const totalHandleCost = itemCalculations.reduce((sum, it) => sum + it.handleTotal, 0)
    const totalAdhesiveCost = itemCalculations.reduce((sum, it) => sum + it.adhesiveTotal, 0)
    const totalItemExtraFinishing = itemCalculations.reduce((sum, it) => sum + it.extraFinishing, 0)
    const totalDirectProductionCost = itemCalculations.reduce((sum, it) => sum + it.itemDirectCost, 0)

    const blockCharge = toNumber(orderOverheads.blockCharge)
    const orderExtraFinishing = toNumber(orderOverheads.orderExtraFinishingCost)
    const subTotalCost = totalDirectProductionCost + blockCharge + orderExtraFinishing

    const wastagePct = toNumber(orderOverheads.wastagePercent)
    const wastageCost = (subTotalCost * wastagePct) / 100
    const totalProductionCost = Math.round((subTotalCost + wastageCost) * 100) / 100

    const netOrderProfit = Math.round((totalInvoicedAmount - totalProductionCost) * 100) / 100
    const marginPercent = totalInvoicedAmount > 0 ? (netOrderProfit / totalInvoicedAmount) * 100 : 0

    const avgCostPerBag = totalOrderQuantity > 0 ? totalProductionCost / totalOrderQuantity : 0
    const avgSalePerBag = totalOrderQuantity > 0 ? totalInvoicedAmount / totalOrderQuantity : 0
    const avgProfitPerBag = totalOrderQuantity > 0 ? netOrderProfit / totalOrderQuantity : 0

    return {
      itemCalculations,
      totalRawMaterialPounds,
      totalRawMaterialCost,
      totalPrintCost,
      totalHandleCost,
      totalAdhesiveCost,
      totalItemExtraFinishing,
      totalDirectProductionCost,
      blockCharge,
      orderExtraFinishing,
      wastageCost,
      totalProductionCost,
      netOrderProfit,
      marginPercent,
      avgCostPerBag,
      avgSalePerBag,
      avgProfitPerBag
    }
  }, [itemCosts, orderOverheads, totalOrderQuantity, totalInvoicedAmount])

  // Save Factory Costing to Selected Document
  const handleSaveCosting = async () => {
    if (!selectedDoc) {
      showToast('Please select an invoice first.', 'error')
      return
    }

    setSaving(true)
    try {
      const detailedItemCosts = calculatedData.itemCalculations.map((item) => ({
        itemId: item.itemId,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        invoicedAmount: item.itemInvoicedAmount,
        rawMaterialPounds: toNumber(item.rawMaterialPounds),
        poundRate: toNumber(item.poundRate),
        rawMaterialCost: item.rawMaterialTotal,
        printCostPerUnit: toNumber(item.printCostPerUnit),
        totalPrintCost: item.printTotal,
        hasHandle: Boolean(item.hasHandle),
        handleCostPerUnit: toNumber(item.handleCostPerUnit),
        totalHandleCost: item.handleTotal,
        hasAdhesive: Boolean(item.hasAdhesive),
        adhesiveCostPerUnit: toNumber(item.adhesiveCostPerUnit),
        totalAdhesiveCost: item.adhesiveTotal,
        extraFinishingCost: item.extraFinishing,
        itemProductionCost: item.itemDirectCost,
        itemNetProfit: item.itemDirectProfit,
        itemMarginPercent: item.itemMarginPct,
        costPerBag: item.costPerBag
      }))

      const updatedFactoryCost = {
        itemCosts: detailedItemCosts,
        itemCount: detailedItemCosts.length,
        rawMaterialPounds: calculatedData.totalRawMaterialPounds,
        poundRate: detailedItemCosts[0]?.poundRate || 140,
        rawMaterialCost: calculatedData.totalRawMaterialCost,
        totalPrintCost: calculatedData.totalPrintCost,
        totalHandleCost: calculatedData.totalHandleCost,
        totalAdhesiveCost: calculatedData.totalAdhesiveCost,
        blockCharge: calculatedData.blockCharge,
        extraFinishingCost: calculatedData.totalItemExtraFinishing + calculatedData.orderExtraFinishing,
        orderExtraFinishingCost: calculatedData.orderExtraFinishing,
        wastagePercent: toNumber(orderOverheads.wastagePercent),
        wastageCost: calculatedData.wastageCost,
        totalFactoryCost: calculatedData.totalProductionCost,
        netOrderProfit: calculatedData.netOrderProfit,
        marginPercent: calculatedData.marginPercent,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.name || currentUser?.username || 'Admin'
      }

      const updatedDocument = {
        ...selectedDoc,
        factoryCost: updatedFactoryCost
      }

      await saveDocument(updatedDocument, currentUser)

      showToast(`Factory cost for ${selectedDoc.number} saved successfully!`, 'success')
      await reloadData()
      setSelectedDoc(updatedDocument)
    } catch (err) {
      console.error('Error saving factory cost:', err)
      showToast('Failed to save factory cost.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Master List Calculations
  const allOrdersList = useMemo(() => {
    return documents.map((doc) => {
      const invoicedAmount = toNumber(doc.totalAmount)
      const itemsList = Array.isArray(doc.items) ? doc.items : []
      const totalQty = itemsList.reduce((sum, it) => sum + toNumber(it.quantity), 0)
      const bagTypesCount = itemsList.length

      const fc = doc.factoryCost || {}
      const totalFactoryCost = toNumber(fc.totalFactoryCost || 0)
      const hasCostData = totalFactoryCost > 0
      const netProfit = invoicedAmount - totalFactoryCost
      const marginPct = invoicedAmount > 0 ? (netProfit / invoicedAmount) * 100 : 0

      return {
        id: doc.id,
        rawDoc: doc,
        number: doc.number,
        date: doc.date || doc.displayDate || '',
        clientName: doc.clientName || 'Unnamed Client',
        phone: doc.phone || '',
        address: doc.address || '',
        items: itemsList,
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
        hasCostData,
        costPerBag: totalQty > 0 && hasCostData ? totalFactoryCost / totalQty : 0,
        salePerBag: totalQty > 0 ? invoicedAmount / totalQty : 0,
        profitPerBag: totalQty > 0 && hasCostData ? netProfit / totalQty : 0,
        itemCosts: Array.isArray(fc.itemCosts) ? fc.itemCosts : []
      }
    })
  }, [documents])

  // Filter Counts
  const filterCounts = useMemo(() => {
    return {
      all: allOrdersList.length,
      costed: allOrdersList.filter((o) => o.hasCostData).length,
      profitable: allOrdersList.filter((o) => o.hasCostData && o.marginPct >= 15).length,
      low_margin: allOrdersList.filter((o) => o.hasCostData && o.marginPct >= 0 && o.marginPct < 15).length,
      loss: allOrdersList.filter((o) => o.hasCostData && o.marginPct < 0).length,
      not_costed: allOrdersList.filter((o) => !o.hasCostData).length
    }
  }, [allOrdersList])

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    let list = allOrdersList

    if (marginFilter === 'costed') {
      list = list.filter((o) => o.hasCostData)
    } else if (marginFilter === 'profitable') {
      list = list.filter((o) => o.hasCostData && o.marginPct >= 15)
    } else if (marginFilter === 'low_margin') {
      list = list.filter((o) => o.hasCostData && o.marginPct >= 0 && o.marginPct < 15)
    } else if (marginFilter === 'loss') {
      list = list.filter((o) => o.hasCostData && o.marginPct < 0)
    } else if (marginFilter === 'not_costed') {
      list = list.filter((o) => !o.hasCostData)
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (o) =>
          o.number.toLowerCase().includes(q) ||
          o.clientName.toLowerCase().includes(q) ||
          o.phone.toLowerCase().includes(q) ||
          o.date.toLowerCase().includes(q)
      )
    }

    return list
  }, [allOrdersList, marginFilter, searchQuery])

  // Executive KPIs
  const kpis = useMemo(() => {
    const totalSales = allOrdersList.reduce((sum, o) => sum + o.invoicedAmount, 0)
    const totalCost = allOrdersList.reduce((sum, o) => sum + o.totalFactoryCost, 0)
    const costedOrders = allOrdersList.filter((o) => o.hasCostData)
    const costedSales = costedOrders.reduce((sum, o) => sum + o.invoicedAmount, 0)
    const totalProfit = costedSales - totalCost
    const avgMargin = costedSales > 0 ? (totalProfit / costedSales) * 100 : 0

    return {
      totalSales,
      totalCost,
      totalProfit,
      avgMargin,
      costedCount: costedOrders.length,
      totalCount: allOrdersList.length
    }
  }, [allOrdersList])

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Invoice Number',
      'Date',
      'Client Name',
      'Bag Types Count',
      'Total Quantity (pcs)',
      'Invoiced Sale Amount (BDT)',
      'Raw Material Pounds (lbs)',
      'Raw Material Cost (BDT)',
      'Printing Cost (BDT)',
      'Handle Cost (BDT)',
      'Courier Adhesive Cost (BDT)',
      'Block Charge (BDT)',
      'Total Factory Cost (BDT)',
      'Net Profit (BDT)',
      'Profit Margin (%)'
    ]

    const rows = filteredOrders.map((o) => [
      `"${o.number}"`,
      `"${o.date}"`,
      `"${o.clientName}"`,
      o.bagTypesCount,
      o.totalQty,
      o.invoicedAmount,
      o.rawMaterialPounds,
      o.rawMaterialCost,
      o.totalPrintCost,
      o.totalHandleCost,
      o.totalAdhesiveCost,
      o.blockCharge,
      o.totalFactoryCost,
      o.netProfit,
      o.hasCostData ? o.marginPct.toFixed(1) : 'N/A'
    ])

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Factory_Costing_Report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Security Check: Only Admins with MANAGE_FACTORY_COST permission
  if (!hasPermission(PERMISSIONS.MANAGE_FACTORY_COST)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
          <ShieldAlert size={32} />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">
          {isBn ? 'অ্যাডমিন অ্যাক্সেস প্রয়োজন' : 'Administrator Access Required'}
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          {isBn
            ? 'কারখানা কস্টিং এবং প্রফিট শীট শুধুমাত্র অ্যাডমিনদের জন্য উন্মুক্ত।'
            : 'Factory Costing & Order Profit management is confidential and restricted to Administrator accounts only.'}
        </p>
        <Button className="mt-6" onClick={() => navigate('/')} variant="secondary">
          {isBn ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to Dashboard'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Sleek Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
            <Factory size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                {isBn ? 'কারখানা কস্টিং ও প্রফিট' : 'Factory Costing & Profit'}
              </h1>
              <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                Admin Confidential
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex rounded-xl border border-slate-200 bg-slate-100/90 p-1">
            <button
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'register'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('register')}
              type="button"
            >
              <FileSpreadsheet size={14} />
              <span>{isBn ? 'অর্ডার তালিকা' : 'Orders Register'}</span>
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'calculator'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('calculator')}
              type="button"
            >
              <Calculator size={14} />
              <span>{isBn ? 'কস্টিং এডিটর' : 'Cost Editor'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total Invoiced Revenue */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {isBn ? 'মোট ইনভয়েস বিক্রয়' : 'Total Invoiced Sales'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <FileText size={16} />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-slate-900">{formatCurrency(kpis.totalSales)}</p>
          <div className="mt-1 text-xs text-slate-500">
            <span>{kpis.totalCount} {isBn ? 'টি অর্ডার ইনভয়েস' : 'total order invoices'}</span>
          </div>
        </div>

        {/* 2. Total Factory Cost (COGS) */}
        <div className="rounded-2xl border border-rose-200/90 bg-rose-50/30 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              {isBn ? 'মোট কারখানা খরচ' : 'Total Production Cost'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
              <Factory size={16} />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-rose-800">{formatCurrency(kpis.totalCost)}</p>
          <div className="mt-1 text-xs text-rose-700">
            <span>{kpis.costedCount} {isBn ? 'টি অর্ডারের কস্টিং যুক্ত' : 'orders costed'}</span>
          </div>
        </div>

        {/* 3. Net Production Profit */}
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/40 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              {isBn ? 'নিট গ্রস প্রফিট' : 'Net Gross Profit'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-emerald-800">{formatCurrency(kpis.totalProfit)}</p>
          <div className="mt-1 text-xs text-emerald-700">
            <span>{isBn ? 'বিক্রয় মূল্য − কারখানা উৎপাদন খরচ' : 'Invoiced Sales − Total COGS'}</span>
          </div>
        </div>

        {/* 4. Average Gross Margin */}
        <div className="rounded-2xl border border-purple-200/90 bg-purple-50/40 p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
              {isBn ? 'গড় মার্জিন %' : 'Average Margin %'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
              <Percent size={16} />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-purple-900">{kpis.avgMargin.toFixed(1)}%</p>
          <div className="mt-1 text-xs text-purple-700">
            <span>{isBn ? 'গড় অর্ডার মুনাফা শতকরা হার' : 'Weighted average markup'}</span>
          </div>
        </div>
      </div>

      {/* ================= TAB 1: ORDERS COST REGISTER ================= */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Search Bar */}
              <div className="flex h-10 w-full sm:w-80 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs transition focus-within:border-brand-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  className="w-full border-0 bg-transparent text-slate-800 placeholder-slate-400 outline-none"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isBn ? 'ইনভয়েস #, ক্লায়েন্ট বা ফোন নম্বর...' : 'Search invoice #, client, phone...'}
                  type="text"
                  value={searchQuery}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} type="button">
                    <X size={14} className="text-slate-400 hover:text-slate-700" />
                  </button>
                )}
              </div>

              {/* Actions & Layout Switcher */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* Cards vs Table View Toggle */}
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      displayLayout === 'cards'
                        ? 'bg-white text-brand-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    onClick={() => setDisplayLayout('cards')}
                    title="Cards Grid View"
                    type="button"
                  >
                    <LayoutGrid size={14} />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                  <button
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      displayLayout === 'table'
                        ? 'bg-white text-brand-700 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    onClick={() => setDisplayLayout('table')}
                    title="Compact Table View"
                    type="button"
                  >
                    <TableIcon size={14} />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                </div>

                <Button className="text-xs py-2" onClick={handleExportCSV} type="button" variant="secondary">
                  <Download size={13} />
                  <span className="hidden sm:inline">Export CSV</span>
                </Button>

                <Button
                  className="text-xs py-2"
                  onClick={() => {
                    setSelectedDoc(null)
                    setSelectedDocId('')
                    setActiveTab('calculator')
                  }}
                  type="button"
                  variant="primary"
                >
                  <Plus size={13} />
                  <span>{isBn ? 'নতুন কস্টিং' : 'New Costing'}</span>
                </Button>
              </div>
            </div>

            {/* Filter Pills with Counts */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              {[
                { id: 'all', label: isBn ? 'সকল অর্ডার' : 'All Orders', count: filterCounts.all },
                { id: 'costed', label: isBn ? 'কস্টিং যুক্ত' : 'Costed', count: filterCounts.costed },
                { id: 'profitable', label: isBn ? 'উচ্চ লাভ (≥১৫%)' : 'High Profit (≥15%)', count: filterCounts.profitable },
                { id: 'low_margin', label: isBn ? 'স্বল্প লাভ (০-১৫%)' : 'Low Margin (0-15%)', count: filterCounts.low_margin },
                { id: 'loss', label: isBn ? 'ঘাটতি / লোকসান' : 'Deficit / Loss', count: filterCounts.loss },
                { id: 'not_costed', label: isBn ? 'কস্টিং বাকি' : 'Not Costed Yet', count: filterCounts.not_costed }
              ].map((f) => {
                const isSelected = marginFilter === f.id
                return (
                  <button
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                      isSelected
                        ? 'bg-brand-700 text-white shadow-soft'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                    key={f.id}
                    onClick={() => setMarginFilter(f.id)}
                    type="button"
                  >
                    <span>{f.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {f.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Results Summary Header */}
          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span>
              Showing <strong>{filteredOrders.length}</strong> of {allOrdersList.length} orders
            </span>
            {marginFilter !== 'all' && (
              <button
                className="font-bold text-brand-700 hover:underline"
                onClick={() => setMarginFilter('all')}
                type="button"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 rounded-2xl border border-slate-200 bg-white">
              Loading orders and costing records...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-500 rounded-2xl border border-slate-200 bg-white space-y-2">
              <Package size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">
                {isBn ? 'কোনো অর্ডার পাওয়া যায়নি।' : 'No orders matched your search or filter.'}
              </p>
              <p className="text-xs text-slate-400">Try adjusting your keywords or clearing the filter.</p>
            </div>
          ) : displayLayout === 'cards' ? (
            /* ================= 🗂️ CLEAN CARD GRID VIEW (LIKE HISTORY) ================= */
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {filteredOrders.map((order) => {
                const finishingTotal =
                  order.totalPrintCost +
                  order.totalHandleCost +
                  order.totalAdhesiveCost +
                  order.blockCharge +
                  order.extraFinishingCost

                const isMultiBag = order.bagTypesCount > 1

                return (
                  <div
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-soft transition hover:border-brand-300 hover:shadow-md"
                    key={order.id || order.number}
                  >
                    <div>
                      {/* Card Top: Number, Bag Badge & Date */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {order.number}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${
                                isMultiBag
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <Package size={10} />
                              <span>{order.bagTypesCount} {order.bagTypesCount === 1 ? 'Bag Type' : 'Bag Types'}</span>
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 mt-0.5 block">{order.date}</span>
                        </div>

                        {/* Costing Margin Badge */}
                        <div className="shrink-0 text-right">
                          {order.hasCostData ? (
                            <span
                              className={`inline-block rounded-lg px-2.5 py-1 text-xs font-black shadow-2xs ${
                                order.marginPct >= 15
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : order.marginPct >= 0
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {order.marginPct >= 0 ? '+' : ''}
                              {order.marginPct.toFixed(1)}% margin
                            </span>
                          ) : (
                            <span className="inline-block rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700 border border-amber-200">
                              Not Costed
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Client Info Badge */}
                      <div className="mt-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50/70 px-2.5 py-1 text-xs font-bold text-brand-950 max-w-full truncate shadow-2xs">
                            <User size={12} className="text-brand-600 shrink-0" />
                            <span className="truncate">{order.clientName}</span>
                          </span>
                        </div>
                      </div>

                      {/* Items Description Preview */}
                      <div className="mt-2.5 rounded-xl bg-slate-50/70 p-2.5 text-xs text-slate-600 border border-slate-100 space-y-1">
                        {order.items.slice(0, 2).map((item, idx) => (
                          <div className="flex items-center justify-between text-[11px]" key={idx}>
                            <span className="truncate max-w-[200px] font-medium text-slate-800">
                              • {item.description || 'Bag Item'}
                            </span>
                            <span className="shrink-0 font-semibold text-slate-600">
                              {Number(item.quantity || 0).toLocaleString()} pcs
                            </span>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-[10px] text-slate-400 italic">
                            +{order.items.length - 2} more bag item(s)...
                          </p>
                        )}
                      </div>

                      {/* 3-Column Financials Box (Like History) */}
                      <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-2 text-center text-xs">
                        <div className="min-w-0">
                          <span className="block text-[10px] uppercase text-slate-400 font-bold truncate">Invoiced Sale</span>
                          <span className="font-extrabold text-slate-900 truncate block text-xs mt-0.5">
                            {formatCurrency(order.invoicedAmount)}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <span className="block text-[10px] uppercase text-slate-400 font-bold truncate">Factory Cost</span>
                          <span className={`font-bold truncate block text-xs mt-0.5 ${order.hasCostData ? 'text-rose-700' : 'text-slate-400'}`}>
                            {order.hasCostData ? formatCurrency(order.totalFactoryCost) : '—'}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <span className="block text-[10px] uppercase text-slate-400 font-bold truncate">Net Profit</span>
                          <span
                            className={`font-black truncate block text-xs mt-0.5 ${
                              !order.hasCostData
                                ? 'text-slate-400'
                                : order.netProfit >= 0
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {order.hasCostData ? (
                              <>
                                {order.netProfit >= 0 ? '+' : '-'}
                                {formatCurrency(Math.abs(order.netProfit))}
                              </>
                            ) : (
                              '—'
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Cost Breakdown Details if Recorded */}
                      {order.hasCostData && (
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500 px-1">
                          <span>
                            Raw Mat: <strong className="text-slate-800">{order.rawMaterialPounds} lbs</strong> ({formatCurrency(order.rawMaterialCost)})
                          </span>
                          <span>
                            Cost/Bag: <strong className="text-rose-700">৳{order.costPerBag.toFixed(2)}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-3.5 flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                      <div className="text-[11px] text-slate-400 font-semibold">
                        Total: {order.totalQty.toLocaleString()} pcs
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          className="min-h-7 px-2.5 py-1 text-xs"
                          onClick={() => navigate('/invoice', { state: { prefillDocument: order.rawDoc } })}
                          type="button"
                          variant="secondary"
                        >
                          <FileText size={12} />
                          <span>Invoice</span>
                        </Button>
                        <Button
                          className="min-h-7 px-3 py-1 text-xs font-bold"
                          onClick={() => {
                            handleSelectDocument(order.rawDoc)
                            setActiveTab('calculator')
                          }}
                          type="button"
                          variant="primary"
                        >
                          <Calculator size={12} />
                          <span>{order.hasCostData ? 'Edit Cost' : '+ Add Cost'}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* ================= 📊 COMPACT TABLE VIEW ================= */
            <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
                      <th className="py-3 px-3.5">{isBn ? 'তারিখ / ইনভয়েস' : 'Date / Invoice'}</th>
                      <th className="py-3 px-3">{isBn ? 'ক্লায়েন্ট' : 'Client'}</th>
                      <th className="py-3 px-3 text-center">{isBn ? 'ব্যাগ প্রকার' : 'Bag Types'}</th>
                      <th className="py-3 px-3 text-right">{isBn ? 'মোট পরিমাণ' : 'Total Qty'}</th>
                      <th className="py-3 px-3 text-right">{isBn ? 'বিক্রয় মূল্য' : 'Sale Amount'}</th>
                      <th className="py-3 px-3 text-right">{isBn ? 'কাঁচামাল (পাউন্ড)' : 'Raw Material'}</th>
                      <th className="py-3 px-3 text-right">{isBn ? 'ফিনিশিং / ডাই' : 'Finishing & Die'}</th>
                      <th className="py-3 px-3 text-right">{isBn ? 'মোট কারখানা খরচ' : 'Total Cost (COGS)'}</th>
                      <th className="py-3 px-3 text-right">{isBn ? 'নিট লাভ' : 'Net Profit'}</th>
                      <th className="py-3 px-3 text-center">{isBn ? 'মার্জিন' : 'Margin %'}</th>
                      <th className="py-3 px-3.5 text-center">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order) => {
                      const finishingTotal =
                        order.totalPrintCost +
                        order.totalHandleCost +
                        order.totalAdhesiveCost +
                        order.blockCharge +
                        order.extraFinishingCost

                      return (
                        <tr className="hover:bg-slate-50/80 transition" key={order.id || order.number}>
                          <td className="py-3 px-3.5">
                            <p className="font-bold text-slate-900">{order.number}</p>
                            <p className="text-[11px] text-slate-500">{order.date}</p>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-slate-800">{order.clientName}</p>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              order.bagTypesCount > 1
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              <Package size={11} />
                              <span>{order.bagTypesCount} {order.bagTypesCount === 1 ? 'type' : 'types'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-700">
                            {order.totalQty.toLocaleString()} pcs
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(order.invoicedAmount)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {order.rawMaterialPounds > 0 ? (
                              <div>
                                <p className="font-semibold text-slate-800">{formatCurrency(order.rawMaterialCost)}</p>
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
                            {order.hasCostData ? (
                              formatCurrency(order.totalFactoryCost)
                            ) : (
                              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                Not Costed
                              </span>
                            )}
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-extrabold ${
                              !order.hasCostData
                                ? 'text-slate-400'
                                : order.netProfit >= 0
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {order.hasCostData ? (
                              <>
                                {order.netProfit >= 0 ? '+' : '-'}
                                {formatCurrency(Math.abs(order.netProfit))}
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {order.hasCostData ? (
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
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <button
                              className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-100 transition"
                              onClick={() => {
                                handleSelectDocument(order.rawDoc)
                                setActiveTab('calculator')
                              }}
                              type="button"
                            >
                              {order.hasCostData ? 'Edit Cost' : '+ Add Cost'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: MULTI-BAG ORDER COST CALCULATOR & EDITOR ================= */}
      {activeTab === 'calculator' && (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          {/* Left Column: Multi-Bag Form Inputs */}
          <div className="space-y-5">
            {/* 1. Choose Invoice Selector */}
            <Card>
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-brand-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    {isBn ? 'ইনভয়েস বা অর্ডার নির্বাচন করুন' : 'Select Invoice Order to Cost'}
                  </h3>
                </div>
                {selectedDoc && (
                  <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                    {selectedDoc.number} Loaded ({itemCosts.length} {itemCosts.length === 1 ? 'Bag Type' : 'Bag Types'})
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-brand-500 focus:bg-white"
                  onChange={(e) => {
                    const doc = documents.find((d) => (d.id || d.number) === e.target.value)
                    handleSelectDocument(doc || null)
                  }}
                  value={selectedDocId}
                >
                  <option value="">-- Choose an Invoice ({documents.length} available) --</option>
                  {documents.map((doc) => {
                    const itemsCount = (doc.items || []).length
                    return (
                      <option key={doc.id || doc.number} value={doc.id || doc.number}>
                        {doc.number} — {doc.clientName} ({doc.displayDate || doc.date}) [{itemsCount} {itemsCount === 1 ? 'bag' : 'bags'}] [৳{doc.totalAmount}]
                      </option>
                    )
                  })}
                </select>

                {selectedDoc && (
                  <Button
                    className="text-xs"
                    onClick={() => {
                      setSelectedDoc(null)
                      setSelectedDocId('')
                    }}
                    type="button"
                    variant="secondary"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {selectedDoc && (
                <div className="mt-3 grid gap-2 rounded-xl border border-brand-100 bg-brand-50/40 p-3 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-700">
                    <span>Client: <strong className="text-slate-900">{selectedDoc.clientName}</strong></span>
                    <span>Order Date: <strong className="text-slate-900">{selectedDoc.displayDate || selectedDoc.date}</strong></span>
                  </div>
                  <div className="flex items-center justify-between border-t border-brand-100/80 pt-2 text-xs">
                    <span>
                      Bag Types: <strong className="text-brand-700">{itemCosts.length} items ({totalOrderQuantity.toLocaleString()} pcs total)</strong>
                    </span>
                    <span>Invoiced Total: <strong className="text-brand-700">{formatCurrency(totalInvoicedAmount)}</strong></span>
                  </div>
                </div>
              )}
            </Card>

            {/* Quick Multi-Bag Automation Helpers (when 2+ items exist) */}
            {itemCosts.length > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-200 bg-purple-50/60 p-3 text-xs">
                <div className="flex items-center gap-2 text-purple-900 font-bold">
                  <Wand2 size={15} />
                  <span>{isBn ? 'কুইক অ্যাকশন (সব ব্যাগে এক ক্লিকে প্রয়োগ)' : 'Quick Helpers (Apply Across All Bag Types)'}:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    className="rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-[11px] font-bold text-purple-800 hover:bg-purple-100 transition"
                    onClick={() => handleApplyPoundRateToAll('140')}
                    type="button"
                  >
                    Set ৳140/lb
                  </button>
                  <button
                    className="rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-[11px] font-bold text-purple-800 hover:bg-purple-100 transition"
                    onClick={() => handleApplyPoundRateToAll('135')}
                    type="button"
                  >
                    Set ৳135/lb
                  </button>
                  <button
                    className="rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-[11px] font-bold text-purple-800 hover:bg-purple-100 transition"
                    onClick={() => handleApplyPrintRateToAll('0.40')}
                    type="button"
                  >
                    Set ৳0.40 Print
                  </button>
                </div>
              </div>
            )}

            {/* If no document is selected */}
            {!selectedDoc && (
              <Card className="py-12 text-center text-slate-500">
                <Package size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">
                  {isBn ? 'অনুগ্রহ করে উপরের ড্রপডাউন থেকে একটি ইনভয়েস নির্বাচন করুন।' : 'Please select an invoice order above to calculate factory costs.'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {isBn ? 'ইনভয়েসের সব ধরনের ব্যাগের জন্য আলাদা ইনপুট ফিল্ড আসবে।' : 'All bag types in the selected order will be automatically detected with dedicated cost fields.'}
                </p>
              </Card>
            )}

            {/* 2. DEDICATED COST CARDS FOR EACH BAG TYPE */}
            {itemCosts.map((item, index) => {
              const calc = calculatedData.itemCalculations[index] || {}

              return (
                <Card
                  className="border-2 border-slate-200/90 shadow-sm relative overflow-hidden"
                  key={item.itemId || index}
                >
                  {/* Bag Header Tag */}
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-700 text-white text-xs font-black">
                        #{index + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {item.description || `Bag Type #${index + 1}`}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span>Quantity: <strong className="text-slate-800">{item.quantity.toLocaleString()} pcs</strong></span>
                          <span>•</span>
                          <span>Invoiced Rate: <strong className="text-slate-800">৳{item.rate.toFixed(2)}</strong></span>
                          <span>•</span>
                          <span>Total: <strong className="text-brand-700">{formatCurrency(item.quantity * item.rate)}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        Cost: {formatCurrency(calc.itemDirectCost || 0)}
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        (calc.itemDirectProfit || 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {(calc.itemDirectProfit || 0) >= 0 ? '+' : ''}
                        {formatCurrency(calc.itemDirectProfit || 0)} ({(calc.itemMarginPct || 0).toFixed(0)}%)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* 1. Raw Materials: Pounds × Rate */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          {isBn ? '১. কাঁচামাল পাউন্ড ও রেট' : '1. Raw Material Weight (lbs)'}
                        </span>
                        <span className="text-xs font-extrabold text-brand-700">
                          Subtotal: {formatCurrency(calc.rawMaterialTotal || 0)}
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          id={`item-${index}-pounds`}
                          label={isBn ? 'ব্যবহৃত কাঁচামাল পাউন্ড (lbs)' : `Material Used (lbs) for Bag #${index + 1}`}
                          min="0"
                          onChange={(e) => handleItemCostChange(index, 'rawMaterialPounds', e.target.value)}
                          placeholder="e.g. 65"
                          step="0.01"
                          type="number"
                          value={item.rawMaterialPounds}
                        />
                        <Input
                          id={`item-${index}-rate`}
                          label={isBn ? 'পাউন্ড দর (৳ / lb)' : 'Pound Rate (৳ / lb)'}
                          min="0"
                          onChange={(e) => handleItemCostChange(index, 'poundRate', e.target.value)}
                          placeholder="140"
                          step="0.01"
                          type="number"
                          value={item.poundRate}
                        />
                      </div>
                    </div>

                    {/* 2. Printing Cost */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          {isBn ? '২. প্রিন্টিং খরচ' : '2. Printing Cost'}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          Subtotal: {formatCurrency(calc.printTotal || 0)}
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-1">
                        <Input
                          id={`item-${index}-print`}
                          label={isBn ? 'প্রতি পিস প্রিন্ট খরচ (৳ / pc)' : `Print Cost per Bag (৳ / pc) [${item.quantity.toLocaleString()} pcs]`}
                          min="0"
                          onChange={(e) => handleItemCostChange(index, 'printCostPerUnit', e.target.value)}
                          placeholder="0.40"
                          step="0.01"
                          type="number"
                          value={item.printCostPerUnit}
                        />
                      </div>
                    </div>

                    {/* 3. Handle & Courier Adhesive (Conditional Toggles) */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          {isBn ? '৩. হ্যান্ডেল ও আঠা / ফ্ল্যাপ' : '3. Handle & Courier Adhesive Costs'}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          Subtotal: {formatCurrency((calc.handleTotal || 0) + (calc.adhesiveTotal || 0))}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {/* Handle Cost Toggle */}
                        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                          <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input
                              checked={item.hasHandle}
                              className="h-4 w-4 rounded text-brand-600"
                              onChange={(e) => handleItemCostChange(index, 'hasHandle', e.target.checked)}
                              type="checkbox"
                            />
                            <span className="text-xs font-bold text-slate-800">
                              {isBn ? 'হ্যান্ডেল ব্যাগ (Handled Bag)' : 'Handled Bag (D-Cut / Loop)'}
                            </span>
                          </label>
                          {item.hasHandle && (
                            <Input
                              id={`item-${index}-handle-cost`}
                              label={isBn ? 'হ্যান্ডেল খরচ প্রতি পিস (৳)' : 'Handle Cost per Bag (৳)'}
                              min="0"
                              onChange={(e) => handleItemCostChange(index, 'handleCostPerUnit', e.target.value)}
                              placeholder="2.00"
                              step="0.01"
                              type="number"
                              value={item.handleCostPerUnit}
                            />
                          )}
                        </div>

                        {/* Courier Adhesive Toggle */}
                        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                          <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input
                              checked={item.hasAdhesive}
                              className="h-4 w-4 rounded text-brand-600"
                              onChange={(e) => handleItemCostChange(index, 'hasAdhesive', e.target.checked)}
                              type="checkbox"
                            />
                            <span className="text-xs font-bold text-slate-800">
                              {isBn ? 'কুরিয়ার আঠা / ফ্ল্যাপ' : 'Courier / Security Adhesive'}
                            </span>
                          </label>
                          {item.hasAdhesive && (
                            <Input
                              id={`item-${index}-adhesive-cost`}
                              label={isBn ? 'আঠা খরচ প্রতি পিস (৳)' : 'Adhesive Cost per Bag (৳)'}
                              min="0"
                              onChange={(e) => handleItemCostChange(index, 'adhesiveCostPerUnit', e.target.value)}
                              placeholder="0.50"
                              step="0.01"
                              type="number"
                              value={item.adhesiveCostPerUnit}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 4. Extra Custom Finishing for this bag */}
                    <div className="grid gap-3 sm:grid-cols-1 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                      <Input
                        id={`item-${index}-extra`}
                        label={isBn ? 'এই ব্যাগের অতিরিক্ত ফিনিশিং খরচ (মোট ৳)' : `Extra Finishing Cost for Bag #${index + 1} (Total ৳)`}
                        min="0"
                        onChange={(e) => handleItemCostChange(index, 'extraFinishingCost', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        type="number"
                        value={item.extraFinishingCost}
                      />
                    </div>

                    {/* Mini Unit Economics Footer for this bag type */}
                    <div className="flex flex-wrap items-center justify-between rounded-xl bg-slate-900 p-2.5 text-white text-xs">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-[10px] text-slate-400">Bag #{index + 1} Unit Cost:</span>
                          <p className="font-bold text-rose-300">৳{(calc.costPerBag || 0).toFixed(2)} / pc</p>
                        </div>
                        <div className="border-l border-slate-700 pl-3">
                          <span className="text-[10px] text-slate-400">Sale Rate:</span>
                          <p className="font-bold text-slate-200">৳{(calc.salePerBag || 0).toFixed(2)} / pc</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400">Net Profit per Bag:</span>
                        <p className={`font-black ${(calc.profitPerBag || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {(calc.profitPerBag || 0) >= 0 ? '+' : ''}
                          ৳{(calc.profitPerBag || 0).toFixed(2)} ({(calc.itemMarginPct || 0).toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}

            {/* 3. ORDER-LEVEL SHARED OVERHEADS (Block Charge, Order Finishing, Wastage) */}
            {selectedDoc && (
              <Card>
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {isBn ? '🏭 সামগ্রিক অর্ডার ওভারহেড (সিলিন্ডার / ডাই ও ওয়েস্টেজ)' : '🏭 Shared Order Overheads & Wastage Buffer'}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Subtotal: {formatCurrency(calculatedData.blockCharge + calculatedData.orderExtraFinishing + calculatedData.wastageCost)}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    id="admin-fc-block"
                    label={isBn ? 'ব্লক / সিলিন্ডার ফি (মোট ৳)' : 'Block / Cylinder Fee (৳)'}
                    min="0"
                    onChange={(e) => setOrderOverheads({ ...orderOverheads, blockCharge: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={orderOverheads.blockCharge}
                  />
                  <Input
                    id="admin-fc-order-extra"
                    label={isBn ? 'অন্যান্য প্যাকেজিং ও ডেলিভারি (৳)' : 'Order Transport & Pack (৳)'}
                    min="0"
                    onChange={(e) => setOrderOverheads({ ...orderOverheads, orderExtraFinishingCost: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={orderOverheads.orderExtraFinishingCost}
                  />
                  <Input
                    id="admin-fc-wastage"
                    label={isBn ? 'উৎপাদন ওয়েস্টেজ বাফার (%)' : 'Production Wastage (%)'}
                    min="0"
                    onChange={(e) => setOrderOverheads({ ...orderOverheads, wastagePercent: e.target.value })}
                    placeholder="3"
                    step="0.1"
                    type="number"
                    value={orderOverheads.wastagePercent}
                  />
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Live Profit Analysis & Action Card */}
          <div className="space-y-5">
            <Card className="sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {isBn ? '📊 সামগ্রিক অর্ডার প্রফিট বিশ্লেষণ' : '📊 Combined Order Profit Analysis'}
                </h3>
                {selectedDoc && (
                  <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-800 border border-purple-200">
                    {itemCosts.length} {itemCosts.length === 1 ? 'Bag' : 'Bags'} Total
                  </span>
                )}
              </div>

              {/* Profit Headline Banner */}
              <div
                className={`mt-4 rounded-2xl p-5 text-white shadow-md ${
                  calculatedData.netOrderProfit >= 0
                    ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800'
                    : 'bg-gradient-to-br from-rose-600 via-rose-700 to-red-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-medium text-white/80">
                  <span>Total Order Net Profit</span>
                  <span>Overall Margin %</span>
                </div>

                <div className="mt-1 flex items-baseline justify-between">
                  <p className="text-2xl font-black">
                    {calculatedData.netOrderProfit >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(calculatedData.netOrderProfit))}
                  </p>
                  <p className="text-xl font-extrabold">{calculatedData.marginPercent.toFixed(1)}%</p>
                </div>
              </div>

              {/* Multi-Bag Itemized Breakdown Table */}
              <div className="mt-4 divide-y divide-slate-100 text-xs">
                <div className="flex items-center justify-between py-2 font-bold text-slate-900 bg-slate-50 px-2 rounded-lg">
                  <span>Total Invoiced Sale:</span>
                  <span>{formatCurrency(totalInvoicedAmount)}</span>
                </div>

                {/* List each bag's direct cost */}
                {calculatedData.itemCalculations.map((calc, i) => (
                  <div className="py-2.5 space-y-1" key={calc.itemId || i}>
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span className="truncate max-w-[200px]">Bag #{i + 1} ({calc.quantity.toLocaleString()} pcs):</span>
                      <span className="text-rose-700">{formatCurrency(calc.itemDirectCost)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pl-2">
                      <span>• Raw Mat: {calc.rawMaterialPounds} lbs (৳{calc.rawMaterialTotal})</span>
                      <span>• Finishing: ৳{calc.printTotal + calc.handleTotal + calc.adhesiveTotal + calc.extraFinishing}</span>
                    </div>
                  </div>
                ))}

                {/* Overheads breakdown */}
                {calculatedData.blockCharge > 0 && (
                  <div className="flex items-center justify-between py-2 text-slate-700">
                    <span>Block / Cylinder Die Fee:</span>
                    <span className="font-semibold text-rose-700">{formatCurrency(calculatedData.blockCharge)}</span>
                  </div>
                )}

                {calculatedData.orderExtraFinishing > 0 && (
                  <div className="flex items-center justify-between py-2 text-slate-700">
                    <span>Order Extra Finishing / Transport:</span>
                    <span className="font-semibold text-rose-700">{formatCurrency(calculatedData.orderExtraFinishing)}</span>
                  </div>
                )}

                {calculatedData.wastageCost > 0 && (
                  <div className="flex items-center justify-between py-2 text-slate-700">
                    <span>Wastage Buffer ({orderOverheads.wastagePercent}%):</span>
                    <span className="font-semibold text-rose-700">{formatCurrency(calculatedData.wastageCost)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-3 font-bold bg-rose-50 px-2 rounded-lg text-rose-900">
                  <span>Total Production Cost (COGS):</span>
                  <span>{formatCurrency(calculatedData.totalProductionCost)}</span>
                </div>
              </div>

              {/* Per-Bag Overall Unit Economics */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs">
                <p className="font-bold text-slate-700 mb-2">Overall Unit Economics ({totalOrderQuantity.toLocaleString()} pcs total):</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-white p-2 border border-slate-100">
                    <p className="text-[10px] text-slate-500">Avg Sale / pc</p>
                    <p className="font-bold text-slate-900">৳{calculatedData.avgSalePerBag.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-white p-2 border border-slate-100">
                    <p className="text-[10px] text-slate-500">Avg Cost / pc</p>
                    <p className="font-bold text-rose-700">৳{calculatedData.avgCostPerBag.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-white p-2 border border-slate-100">
                    <p className="text-[10px] text-slate-500">Avg Profit / pc</p>
                    <p
                      className={`font-bold ${
                        calculatedData.avgProfitPerBag >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      ৳{calculatedData.avgProfitPerBag.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Save Costing Action */}
              <div className="mt-5 space-y-2">
                <Button
                  className="w-full justify-center py-2.5"
                  disabled={!selectedDoc || saving}
                  onClick={handleSaveCosting}
                  type="button"
                  variant="primary"
                >
                  <Save size={16} />
                  <span>
                    {saving
                      ? 'Saving Costing...'
                      : selectedDoc
                      ? `Save & Attach to ${selectedDoc.number} (${itemCosts.length} bags)`
                      : 'Select Invoice to Save'}
                  </span>
                </Button>

                {selectedDoc && (
                  <Button
                    className="w-full justify-center py-2 text-xs"
                    onClick={() => navigate('/invoice', { state: { prefillDocument: selectedDoc } })}
                    type="button"
                    variant="secondary"
                  >
                    <FileText size={14} />
                    <span>Open Invoiced Document</span>
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
