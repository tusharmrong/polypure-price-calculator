import {
  AlertCircle,
  Archive,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Factory,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Kanban,
  Layers,
  LayoutGrid,
  MessageSquare,
  Package,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Scissors,
  Search,
  Send,
  Share2,
  Table as TableIcon,
  Trash2,
  Truck,
  User,
  X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import { useAuth } from '../utils/authContext.jsx'
import { loadDocuments, saveDocument, softDeleteDocument } from '../utils/documents.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { loadCompanySettings } from '../utils/companySettings.js'
import { PERMISSIONS } from '../utils/permissions.js'
import {
  PRODUCTION_STAGES,
  PRODUCTION_STAGE_MAP,
  generateWhatsAppStatusMessage,
  getDocProductionStatus,
  getNextStage,
  getPreviousStage,
  getProductionStage
} from '../utils/productionStatus.js'
import { useToast } from '../utils/toast.jsx'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function Production() {
  const companySettings = useMemo(() => loadCompanySettings(), [])
  const { language } = useUiLanguage()
  const isBn = language === 'bn'
  const { currentUser, hasPermission } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  // State
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('board') // 'board' | 'list'
  const [stageFilter, setStageFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals State
  const [jobCardDoc, setJobCardDoc] = useState(null)
  const [challanDoc, setChallanDoc] = useState(null)
  const [whatsAppModalDoc, setWhatsAppModalDoc] = useState(null)
  const [queueModalOpen, setQueueModalOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [selectedInitialStage, setSelectedInitialStage] = useState('confirmed')
  const [cleaningUp, setCleaningUp] = useState(false)

  // Load Invoices
  const reloadData = async () => {
    setLoading(true)
    try {
      const docs = await loadDocuments()
      const validInvoices = docs.filter((d) => !d.deletedAt && d.type === 'Invoice')
      setDocuments(validInvoices)
    } catch (err) {
      console.error('Failed to load production orders:', err)
      showToast('Unable to load production orders.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadData()
  }, [])

  // Update Production Status for an Order
  const handleUpdateStatus = async (doc, newStatusId) => {
    if (!hasPermission(PERMISSIONS.MANAGE_PRODUCTION)) {
      showToast('You do not have permission to update production status.', 'error')
      return
    }

    try {
      const updatedDoc = {
        ...doc,
        productionStatus: newStatusId,
        productionUpdatedAt: new Date().toISOString(),
        productionUpdatedBy: currentUser?.name || currentUser?.username || 'Staff'
      }

      await saveDocument(updatedDoc, currentUser)
      const stage = getProductionStage(newStatusId)
      showToast(`Order ${doc.number} moved to ${stage.label}.`, 'success')

      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? updatedDoc : d))
      )
    } catch (err) {
      console.error('Error updating production status:', err)
      showToast('Failed to update status.', 'error')
    }
  }

  // Queue an existing invoice manually
  const handleQueueOrder = async (e) => {
    if (e) e.preventDefault()
    if (!selectedInvoiceId) {
      showToast('Please select an invoice to queue.', 'error')
      return
    }
    const targetDoc = documents.find((d) => d.id === selectedInvoiceId)
    if (!targetDoc) return
    await handleUpdateStatus(targetDoc, selectedInitialStage)
    setQueueModalOpen(false)
    setSelectedInvoiceId('')
  }

  // One-click helper to archive older completed invoices so active pipeline is crystal clear
  const handleMarkPastOrdersDelivered = async () => {
    if (!window.confirm('Mark all older invoices without active progress as Delivered? This will clean up the active Kanban board so only your running jobs appear.')) {
      return
    }
    setCleaningUp(true)
    try {
      let count = 0
      for (const doc of documents) {
        if (!doc.productionStatus || doc.productionStatus === 'confirmed') {
          await saveDocument({
            ...doc,
            productionStatus: 'delivered',
            productionUpdatedAt: new Date().toISOString()
          }, currentUser)
          count++
        }
      }
      await reloadData()
      showToast(`Archived ${count} older orders as Delivered.`, 'success')
    } catch (err) {
      console.error('Failed to cleanup past orders:', err)
      showToast('Failed to archive past orders.', 'error')
    } finally {
      setCleaningUp(false)
    }
  }

  // Prepared Orders List
  const ordersList = useMemo(() => {
    return documents.map((doc) => {
      const statusId = getDocProductionStatus(doc)
      const stage = getProductionStage(statusId)
      const items = Array.isArray(doc.items) ? doc.items : []
      const totalQty = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0)
      const fc = doc.factoryCost || {}

      return {
        ...doc,
        currentStatusId: statusId,
        stage,
        items,
        totalQty,
        rawMaterialPounds: Number(fc.rawMaterialPounds || 0),
        clientName: doc.clientName || 'Unnamed Client',
        phone: doc.phone || '',
        address: doc.address || '',
        date: doc.date || doc.displayDate || ''
      }
    })
  }, [documents])

  // Summary Metrics
  const metrics = useMemo(() => {
    const activeOrders = ordersList.filter((o) => o.currentStatusId !== 'delivered')
    const totalBagsInPipeline = activeOrders.reduce((sum, o) => sum + o.totalQty, 0)
    const inExtrusionPrinting = ordersList.filter((o) =>
      ['film_blowing', 'printing'].includes(o.currentStatusId)
    ).length
    const inCuttingPacking = ordersList.filter((o) => o.currentStatusId === 'cutting_packing').length
    const readyForDelivery = ordersList.filter((o) => o.currentStatusId === 'ready').length
    const deliveredCount = ordersList.filter((o) => o.currentStatusId === 'delivered').length

    return {
      activeCount: activeOrders.length,
      totalBagsInPipeline,
      inExtrusionPrinting,
      inCuttingPacking,
      readyForDelivery,
      deliveredCount
    }
  }, [ordersList])

  // Filtered Orders for Table/Search
  const filteredOrders = useMemo(() => {
    let list = ordersList

    if (stageFilter !== 'all') {
      list = list.filter((o) => o.currentStatusId === stageFilter)
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (o) =>
          o.number.toLowerCase().includes(q) ||
          o.clientName.toLowerCase().includes(q) ||
          o.phone.toLowerCase().includes(q)
      )
    }

    return list
  }, [ordersList, stageFilter, searchQuery])

  // Group Orders by Stage for Kanban Board
  const boardColumns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const columns = {}
    PRODUCTION_STAGES.forEach((stage) => {
      let stageOrders = ordersList.filter((o) => o.currentStatusId === stage.id)
      if (q) {
        stageOrders = stageOrders.filter(
          (o) =>
            o.number.toLowerCase().includes(q) ||
            o.clientName.toLowerCase().includes(q) ||
            o.phone.toLowerCase().includes(q)
        )
      }
      columns[stage.id] = stageOrders
    })
    return columns
  }, [ordersList, searchQuery])

  // Delete / Trash Production Order
  const handleDeleteProductionOrder = async (order) => {
    if (!window.confirm(`Delete "${order.number}" (${order.clientName})? This will move it to Trash and remove it from Production.`)) return

    try {
      await softDeleteDocument(order.id)
      showToast(`Order ${order.number} moved to Trash.`, 'success')
      await reloadData()
    } catch (err) {
      console.error('Failed to delete order:', err)
      showToast('Failed to delete order.', 'error')
    }
  }

  // WhatsApp Message Generator Helper
  const handleOpenWhatsApp = (doc) => {
    setWhatsAppModalDoc(doc)
  }

  const handleSendWhatsAppDirect = (doc) => {
    const rawPhone = String(doc.phone || '').replace(/[^0-9]/g, '')
    let formattedPhone = rawPhone
    if (formattedPhone.startsWith('01')) {
      formattedPhone = '88' + formattedPhone
    }
    const message = generateWhatsAppStatusMessage(doc, doc.currentStatusId, companySettings.companyName, companySettings.phone)
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3.5 no-print">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
            <Factory size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                {isBn ? 'কারখানা উৎপাদন ট্র্যাকিং' : 'Factory Production Tracking'}
              </h1>
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 border border-brand-200">
                Live Factory Pipeline
              </span>
            </div>
            
          </div>
        </div>

        {/* Action Controls (Queue Order, Archive, View Switcher) */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {hasPermission(PERMISSIONS.MANAGE_PRODUCTION) && (
            <>
              <Button
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs"
                onClick={() => setQueueModalOpen(true)}
                type="button"
                variant="primary"
              >
                <Plus size={14} />
                <span>{isBn ? '+ নতুন অর্ডার যুক্ত করুন' : '+ Queue Order'}</span>
              </Button>

              <Button
                className="text-xs text-slate-600 hover:text-slate-900 border-slate-200"
                disabled={cleaningUp}
                onClick={handleMarkPastOrdersDelivered}
                title="Mark older invoices without active stage as Delivered"
                type="button"
                variant="secondary"
              >
                <Archive size={13} />
                <span>{cleaningUp ? 'Archiving...' : (isBn ? 'পুরাতন অর্ডার আর্কাইভ' : 'Archive Past Orders')}</span>
              </Button>
            </>
          )}

          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeView === 'board'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setActiveView('board')}
              type="button"
            >
              <Kanban size={14} />
              <span>{isBn ? 'বোর্ড ভিউ' : 'Pipeline Board'}</span>
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeView === 'list'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setActiveView('list')}
              type="button"
            >
              <TableIcon size={14} />
              <span>{isBn ? 'তালিকা ভিউ' : 'Orders List'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Factory KPI Metrics Cards */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 no-print">
        {/* 1. Bags in Production Queue */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-soft min-w-0 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {isBn ? 'কারখানায় মোট ব্যাগ' : 'Bags in Pipeline'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Package size={16} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-black text-slate-900 truncate tracking-tight">
            {metrics.totalBagsInPipeline.toLocaleString()} <span className="text-xs font-bold text-slate-500">pcs</span>
          </p>
          <div className="mt-1 text-xs text-slate-500">
            <span>{metrics.activeCount} {isBn ? 'টি সক্রিয় অর্ডার' : 'active orders in factory'}</span>
          </div>
        </div>

        {/* 2. Film Extrusion & Printing */}
        <div className="rounded-2xl border border-purple-200/90 bg-purple-50/40 p-4 shadow-soft min-w-0 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800">
              {isBn ? 'ফিল্ম ও প্রিন্টিংয়ে' : 'In Film & Printing'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
              <Layers size={16} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-black text-purple-900 truncate tracking-tight">{metrics.inExtrusionPrinting} Jobs</p>
          <div className="mt-1 text-xs text-purple-700">
            <span>{isBn ? 'মেশিনে রানিং' : 'Running on production line'}</span>
          </div>
        </div>

        {/* 3. Cutting, Handle & Packaging */}
        <div className="rounded-2xl border border-amber-200/90 bg-amber-50/40 p-4 shadow-soft min-w-0 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              {isBn ? 'কাটিং ও প্যাকিংয়ে' : 'Cutting & Packing'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Scissors size={16} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-black text-amber-800 truncate tracking-tight">{metrics.inCuttingPacking} Jobs</p>
          <div className="mt-1 text-xs text-amber-700">
            <span>{isBn ? 'সিলিং ও ফিনিশিং' : 'Sealing & master sacking'}</span>
          </div>
        </div>

        {/* 4. Ready for Delivery */}
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/40 p-4 shadow-soft min-w-0 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              {isBn ? 'ডেলিভারির জন্য প্রস্তুত' : 'Ready for Dispatch'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Truck size={16} />
            </div>
          </div>
          <p className="mt-2 text-lg sm:text-xl 2xl:text-2xl font-black text-emerald-800 truncate tracking-tight">{metrics.readyForDelivery} Jobs</p>
          <div className="mt-1 text-xs text-emerald-700">
            <span>{isBn ? 'চালান রেডি' : 'Delivery challan ready'}</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3 no-print">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex h-10 w-full sm:w-80 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs transition focus-within:border-brand-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input
              className="w-full border-0 bg-transparent text-slate-800 placeholder-slate-400 outline-none"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBn ? 'ইনভয়েস # বা ক্লায়েন্ট খুঁজুন...' : 'Search invoice #, client, phone...'}
              type="text"
              value={searchQuery}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} type="button">
                <X size={14} className="text-slate-400 hover:text-slate-700" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong>{filteredOrders.length}</strong> factory orders
          </div>
        </div>

        {/* Stage Filter Pills (when in List view) */}
        {activeView === 'list' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            <button
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                stageFilter === 'all'
                  ? 'bg-brand-700 text-white shadow-soft'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
              onClick={() => setStageFilter('all')}
              type="button"
            >
              All Stages ({ordersList.length})
            </button>
            {PRODUCTION_STAGES.map((stage) => {
              const count = ordersList.filter((o) => o.currentStatusId === stage.id).length
              return (
                <button
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
                    stageFilter === stage.id
                      ? 'bg-brand-700 text-white shadow-soft'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                  key={stage.id}
                  onClick={() => setStageFilter(stage.id)}
                  type="button"
                >
                  <span>{stage.label}</span>
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] text-slate-700">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ================= VIEW 1: INTERACTIVE KANBAN PIPELINE BOARD ================= */}
      {activeView === 'board' && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 items-start">
          {PRODUCTION_STAGES.map((stage) => {
            const stageOrders = boardColumns[stage.id] || []
            const stageTotalBags = stageOrders.reduce((sum, o) => sum + o.totalQty, 0)
            const nextStage = getNextStage(stage.id)
            const prevStage = getPreviousStage(stage.id)

            return (
              <div
                className="flex flex-col rounded-2xl border border-slate-200 bg-slate-100/70 p-3 min-h-[480px]"
                key={stage.id}
              >
                {/* Column Header */}
                <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${stage.dotColor}`} />
                    <h3 className="text-xs font-extrabold text-slate-900">{stage.label}</h3>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-slate-700 border border-slate-200 shadow-2xs">
                    {stageOrders.length}
                  </span>
                </div>

                {/* Subtitle with total quantity */}
                <div className="mb-2.5 text-[11px] text-slate-500 font-semibold px-1">
                  {stageTotalBags.toLocaleString()} pcs in stage
                </div>

                {/* Order Cards Container */}
                <div className="space-y-3 overflow-y-auto max-h-[75vh] pr-0.5">
                  {stageOrders.map((order) => (
                    <div
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-brand-300 hover:shadow-md space-y-2.5"
                      key={order.id}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-1.5 border-b border-slate-100 pb-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {order.number}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{order.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                            {order.items.length} {order.items.length === 1 ? 'type' : 'types'}
                          </span>
                          {hasPermission(PERMISSIONS.MANAGE_PRODUCTION) && (
                            <button
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition"
                              onClick={() => handleDeleteProductionOrder(order)}
                              title="Move to Trash / Delete"
                              type="button"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Client Badge */}
                      <div>
                        <span className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50/80 px-2 py-0.5 text-xs font-bold text-brand-950 max-w-full truncate">
                          <User size={11} className="text-brand-600 shrink-0" />
                          <span className="truncate">{order.clientName}</span>
                        </span>
                      </div>

                      {/* Items Preview */}
                      <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700 border border-slate-100 space-y-1">
                        {order.items.slice(0, 2).map((it, idx) => (
                          <div className="flex items-center justify-between" key={idx}>
                            <span className="truncate max-w-[140px] font-medium">• {it.description || 'Bag Item'}</span>
                            <span className="font-bold text-slate-900">{Number(it.quantity || 0).toLocaleString()} pcs</span>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-[10px] text-slate-400 italic">+{order.items.length - 2} more item(s)...</p>
                        )}
                      </div>

                      {/* Total Qty & Pounds Info */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                        <span>Total: <strong className="text-slate-800">{order.totalQty.toLocaleString()} pcs</strong></span>
                        {order.rawMaterialPounds > 0 && (
                          <span>Mat: <strong className="text-slate-800">{order.rawMaterialPounds} lbs</strong></span>
                        )}
                      </div>

                      {/* Printable Action Buttons */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                        <button
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition"
                          onClick={() => setJobCardDoc(order)}
                          title="Print Factory Job Card"
                          type="button"
                        >
                          <FileText size={11} />
                          <span>Job Card</span>
                        </button>
                        <button
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition"
                          onClick={() => setChallanDoc(order)}
                          title="Print Delivery Challan"
                          type="button"
                        >
                          <Truck size={11} />
                          <span>Challan</span>
                        </button>
                        <button
                          className="flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 transition"
                          onClick={() => handleOpenWhatsApp(order)}
                          title="Notify Client on WhatsApp"
                          type="button"
                        >
                          <MessageSquare size={11} />
                        </button>
                      </div>

                      {/* Stage Advancement Navigation */}
                      <div className="flex items-center gap-1 pt-1">
                        {prevStage && (
                          <button
                            className="flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                            onClick={() => handleUpdateStatus(order, prevStage.id)}
                            title={`Move back to ${prevStage.label}`}
                            type="button"
                          >
                            <ArrowLeft size={12} />
                          </button>
                        )}

                        {nextStage ? (
                          <button
                            className="w-full flex items-center justify-center gap-1 rounded-lg bg-brand-700 py-1.5 text-[11px] font-bold text-white shadow-2xs hover:bg-brand-800 transition"
                            onClick={() => handleUpdateStatus(order, nextStage.id)}
                            type="button"
                          >
                            <span>Move to {nextStage.shortLabel}</span>
                            <ArrowRight size={12} />
                          </button>
                        ) : (
                          <div className="w-full flex items-center justify-center gap-1 rounded-lg bg-teal-50 py-1 text-[11px] font-bold text-teal-800 border border-teal-200">
                            <CheckCircle2 size={12} />
                            <span>Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {stageOrders.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      No orders in this stage.
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ================= VIEW 2: ORDERS REGISTER LIST TABLE ================= */}
      {activeView === 'list' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 font-bold uppercase tracking-wider text-slate-600">
                  <th className="p-3.5">Invoice # & Date</th>
                  <th className="p-3.5">Client & Contact</th>
                  <th className="p-3.5 text-right">Total Bags</th>
                  <th className="p-3.5 text-right">Invoiced Total</th>
                  <th className="p-3.5 text-center">Production Stage</th>
                  <th className="p-3.5 text-right no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => (
                  <tr className="transition hover:bg-slate-50/80" key={order.id}>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{order.number}</p>
                      <p className="text-[11px] text-slate-500">{order.date}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-800">{order.clientName}</p>
                      <p className="text-[11px] text-slate-500">{order.phone || 'No phone'}</p>
                    </td>
                    <td className="p-3.5 text-right font-medium text-slate-800">
                      {order.totalQty.toLocaleString()} pcs
                    </td>
                    <td className="p-3.5 text-right font-bold text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="p-3.5 text-center">
                      <select
                        className={`rounded-lg border px-2.5 py-1 text-xs font-bold outline-none cursor-pointer ${order.stage.color}`}
                        onChange={(e) => handleUpdateStatus(order, e.target.value)}
                        value={order.currentStatusId}
                      >
                        {PRODUCTION_STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label} ({s.labelBn})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3.5 text-right no-print">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          className="text-xs px-2 py-1"
                          onClick={() => setJobCardDoc(order)}
                          title="Factory Job Card"
                          type="button"
                          variant="secondary"
                        >
                          <FileText size={12} />
                          <span>Job Card</span>
                        </Button>
                        <Button
                          className="text-xs px-2 py-1"
                          onClick={() => setChallanDoc(order)}
                          title="Delivery Challan"
                          type="button"
                          variant="secondary"
                        >
                          <Truck size={12} />
                          <span>Challan</span>
                        </Button>
                        <button
                          className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-800 hover:bg-emerald-100 transition"
                          onClick={() => handleOpenWhatsApp(order)}
                          title="WhatsApp Update"
                          type="button"
                        >
                          <MessageSquare size={13} />
                        </button>
                        {hasPermission(PERMISSIONS.MANAGE_PRODUCTION) && (
                          <button
                            className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100 transition"
                            onClick={() => handleDeleteProductionOrder(order)}
                            title="Delete / Move to Trash"
                            type="button"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td className="p-8 text-center text-slate-500" colSpan={6}>
                      No production orders found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: FACTORY JOB CARD (জব কার্ড) ================= */}
      <Modal
        isOpen={Boolean(jobCardDoc)}
        onClose={() => setJobCardDoc(null)}
        title={isBn ? 'কারখানা জব কার্ড (Job Ticket)' : 'Factory Production Job Card'}
      >
        {jobCardDoc && (
          <div className="space-y-4 text-xs">
            {/* Printable Job Ticket Container */}
            <div className="rounded-xl border-2 border-slate-800 bg-white p-5 text-slate-900 space-y-4 print:p-0 print:border-none" id="factory-job-card-print">
              {/* Job Card Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div>
                  <h2 className="text-base font-black tracking-wide text-slate-900">
                    POLY PURE PRINTING & PACKAGING
                  </h2>
                  <p className="text-[11px] font-bold text-slate-600">FACTORY PRODUCTION JOB CARD (জব কার্ড)</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-black text-brand-800">#{jobCardDoc.number}</p>
                  <p className="text-[11px] text-slate-500">Date: {jobCardDoc.date}</p>
                </div>
              </div>

              {/* Client & Production Info */}
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold">Client / Party:</span>
                  <p className="font-extrabold text-slate-900 text-sm">{jobCardDoc.clientName}</p>
                  <p className="text-slate-600">{jobCardDoc.phone || 'No Phone'} {jobCardDoc.address ? `• ${jobCardDoc.address}` : ''}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-400 font-bold">Current Production Stage:</span>
                  <p className="font-black text-brand-700 text-sm uppercase">{jobCardDoc.stage.label}</p>
                  <p className="text-slate-500">Total Quantity: <strong className="text-slate-900">{jobCardDoc.totalQty.toLocaleString()} pcs</strong></p>
                </div>
              </div>

              {/* Technical Bag Specs Table (No Prices for factory workers) */}
              <div>
                <p className="font-bold text-slate-800 mb-1.5 uppercase text-[11px]">Technical Bag Specifications (ব্যাগের বিবরণ):</p>
                <table className="w-full border-collapse border border-slate-300 text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-700">
                      <th className="border border-slate-300 p-2">Item #</th>
                      <th className="border border-slate-300 p-2">Bag Description / Size</th>
                      <th className="border border-slate-300 p-2 text-right">Order Quantity</th>
                      <th className="border border-slate-300 p-2">Finishing / Handle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobCardDoc.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 p-2 font-bold">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-semibold">{it.description || 'Bag Item'}</td>
                        <td className="border border-slate-300 p-2 text-right font-black text-sm">
                          {Number(it.quantity || 0).toLocaleString()} pcs
                        </td>
                        <td className="border border-slate-300 p-2 text-slate-600">
                          {/handle|হ্যান্ডেল/i.test(it.description) ? 'Handled (D-Cut / Loop)' : /courier|adhesive|আঠা/i.test(it.description) ? 'Courier Flap Adhesive' : 'Standard Cut'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Machine Operator Checklist & Signatures */}
              <div className="grid grid-cols-4 gap-2 pt-2 text-[10px] text-center border-t border-slate-200">
                <div className="rounded border border-slate-200 p-2">
                  <p className="font-bold text-slate-700">1. Film Extrusion</p>
                  <div className="h-8 border-b border-dashed border-slate-300 mt-2" />
                  <span className="text-slate-400 mt-1 block">Operator Sign</span>
                </div>
                <div className="rounded border border-slate-200 p-2">
                  <p className="font-bold text-slate-700">2. Printing Line</p>
                  <div className="h-8 border-b border-dashed border-slate-300 mt-2" />
                  <span className="text-slate-400 mt-1 block">Operator Sign</span>
                </div>
                <div className="rounded border border-slate-200 p-2">
                  <p className="font-bold text-slate-700">3. Cutting & Sealing</p>
                  <div className="h-8 border-b border-dashed border-slate-300 mt-2" />
                  <span className="text-slate-400 mt-1 block">Operator Sign</span>
                </div>
                <div className="rounded border border-slate-200 p-2">
                  <p className="font-bold text-slate-700">4. QA & Master Pack</p>
                  <div className="h-8 border-b border-dashed border-slate-300 mt-2" />
                  <span className="text-slate-400 mt-1 block">Supervisor Sign</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button onClick={() => setJobCardDoc(null)} type="button" variant="secondary">
                Close
              </Button>
              <Button onClick={() => window.print()} type="button" variant="primary">
                <Printer size={14} />
                <span>Print Job Card</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL 2: DELIVERY CHALLAN (ডেলিভারি চালান) ================= */}
      <Modal
        isOpen={Boolean(challanDoc)}
        onClose={() => setChallanDoc(null)}
        title={isBn ? 'ডেলিভারি চালান (Delivery Challan)' : 'Delivery Challan Slip'}
      >
        {challanDoc && (
          <div className="space-y-4 text-xs">
            {/* Printable Delivery Challan Slip */}
            <div className="rounded-xl border-2 border-slate-800 bg-white p-5 text-slate-900 space-y-4 print:p-0 print:border-none">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <div>
                  <h2 className="text-base font-black tracking-wide text-slate-900">
                    POLY PURE PRINTING & PACKAGING
                  </h2>
                  <p className="text-[11px] font-bold text-slate-600">DELIVERY CHALLAN (ডেলিভারি চালান)</p>
                  <p className="text-[10px] text-slate-500">{companySettings.address} • {companySettings.phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-black text-brand-800">CHALLAN #{challanDoc.number.replace('PP-I-', 'PP-DC-')}</p>
                  <p className="text-[11px] text-slate-500">Invoice Ref: #{challanDoc.number}</p>
                  <p className="text-[11px] text-slate-500">Date: {new Date().toISOString().slice(0, 10)}</p>
                </div>
              </div>

              {/* Consignee / Delivery Address */}
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="text-[10px] uppercase text-slate-400 font-bold">Deliver To / Consignee:</span>
                <p className="font-extrabold text-slate-900 text-sm">{challanDoc.clientName}</p>
                <p className="text-slate-700">{challanDoc.phone || 'No Phone'}</p>
                <p className="text-slate-600">{challanDoc.address || 'Delivery Address on file'}</p>
              </div>

              {/* Items List */}
              <table className="w-full border-collapse border border-slate-300 text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-700">
                    <th className="border border-slate-300 p-2">SL</th>
                    <th className="border border-slate-300 p-2">Description of Goods</th>
                    <th className="border border-slate-300 p-2 text-right">Dispatched Quantity</th>
                    <th className="border border-slate-300 p-2 text-center">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {challanDoc.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 p-2 font-bold">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-semibold">{it.description || 'Bag Item'}</td>
                      <td className="border border-slate-300 p-2 text-right font-black text-sm">
                        {Number(it.quantity || 0).toLocaleString()} pcs
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-500">Good Condition</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-black">
                    <td className="border border-slate-300 p-2" colSpan={2}>Total Quantity Dispatched:</td>
                    <td className="border border-slate-300 p-2 text-right text-brand-700 text-sm">
                      {challanDoc.totalQty.toLocaleString()} pcs
                    </td>
                    <td className="border border-slate-300 p-2" />
                  </tr>
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 pt-8 text-center text-[10px]">
                <div>
                  <div className="border-t border-slate-400 pt-1" />
                  <p className="font-bold text-slate-700">Prepared By</p>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1" />
                  <p className="font-bold text-slate-700">Driver / Transport Sign</p>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1" />
                  <p className="font-bold text-slate-700">Receiver's Signature & Stamp</p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button onClick={() => setChallanDoc(null)} type="button" variant="secondary">
                Close
              </Button>
              <Button onClick={() => window.print()} type="button" variant="primary">
                <Printer size={14} />
                <span>Print Delivery Challan</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL 3: WHATSAPP CLIENT NOTIFICATION ================= */}
      <Modal
        isOpen={Boolean(whatsAppModalDoc)}
        onClose={() => setWhatsAppModalDoc(null)}
        title={isBn ? 'ক্লায়েন্ট হোয়াটসঅ্যাপ নোটিফিকেশন' : 'WhatsApp Status Notification'}
      >
        {whatsAppModalDoc && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Send an instant production update directly to <strong>{whatsAppModalDoc.clientName}</strong>:
            </p>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 font-mono text-[11px] text-slate-800 whitespace-pre-wrap">
              {generateWhatsAppStatusMessage(whatsAppModalDoc, whatsAppModalDoc.currentStatusId, companySettings.companyName, companySettings.phone)}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(
                    generateWhatsAppStatusMessage(whatsAppModalDoc, whatsAppModalDoc.currentStatusId, companySettings.companyName, companySettings.phone)
                  )
                  showToast('WhatsApp message copied to clipboard!', 'success')
                }}
                type="button"
                variant="secondary"
              >
                <Copy size={13} />
                <span>Copy Text</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button onClick={() => setWhatsAppModalDoc(null)} type="button" variant="secondary">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleSendWhatsAppDirect(whatsAppModalDoc)
                    setWhatsAppModalDoc(null)
                  }}
                  type="button"
                  variant="primary"
                >
                  <Send size={14} />
                  <span>Send via WhatsApp</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {/* ================= MODAL 4: QUEUE ORDER TO FACTORY ================= */}
      <Modal
        isOpen={queueModalOpen}
        onClose={() => setQueueModalOpen(false)}
        title={isBn ? 'কারখানা প্রোডাকশনে অর্ডার যুক্ত করুন' : 'Queue Order to Factory Production'}
      >
        <form className="space-y-4 text-xs" onSubmit={handleQueueOrder}>
          <p className="text-slate-600">
            {isBn
              ? 'যেকোনো ইনভয়েস নির্বাচন করে কারখানার উৎপাদন লাইনে যুক্ত করুন:'
              : 'Select an existing invoice to start or update its factory manufacturing pipeline:'}
          </p>

          <div className="space-y-3">
            <Select
              id="queue-invoice-select"
              label={isBn ? 'ইনভয়েস নির্বাচন করুন' : 'Select Invoice Order'}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              required
              value={selectedInvoiceId}
            >
              <option value="">-- Choose an Invoice --</option>
              {documents.map((doc) => {
                const totalQty = (doc.items || []).reduce((sum, it) => sum + Number(it.quantity || 0), 0)
                const currentStatus = getDocProductionStatus(doc)
                return (
                  <option key={doc.id} value={doc.id}>
                    {doc.number} - {doc.clientName || 'Client'} ({totalQty.toLocaleString()} pcs) [{currentStatus.label}]
                  </option>
                )
              })}
            </Select>

            <Select
              id="queue-stage-select"
              label={isBn ? 'উৎপাদন পর্যায়' : 'Starting Production Stage'}
              onChange={(e) => setSelectedInitialStage(e.target.value)}
              value={selectedInitialStage}
            >
              {PRODUCTION_STAGES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label} ({st.labelBn})
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button onClick={() => setQueueModalOpen(false)} type="button" variant="secondary">
              Cancel
            </Button>
            <Button className="bg-brand-600 hover:bg-brand-700 text-white font-bold" type="submit" variant="primary">
              <Factory size={14} />
              <span>{isBn ? 'প্রোডাকশনে শুরু করুন' : 'Start Factory Job'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
