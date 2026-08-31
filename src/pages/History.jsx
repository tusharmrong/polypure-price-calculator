import {
  Cloud,
  Copy,
  Download,
  FileText,
  LayoutGrid,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Table as TableIcon,
  Trash2,
  Undo,
  User,
  X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import {
  hardDeleteDocument,
  loadDocuments,
  restoreDocument,
  softDeleteDocument,
  syncLocalDocumentsToCloud
} from '../utils/documents.js'
import { useAuth } from '../utils/authContext.jsx'
import { formatCurrency } from '../utils/formatCurrency.js'
import { useToast } from '../utils/toast.jsx'
import { useUiLanguage } from '../utils/uiLanguage.js'

function renderHighlightedText(text, query) {
  if (!text) return 'Unnamed Client'
  if (!query || !query.trim()) {
    return text
  }
  const q = query.trim()
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = String(text).split(regex)
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark className="bg-amber-200 text-amber-950 rounded px-0.5 font-bold" key={i}>
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function getDocumentTypeBadge(type) {
  switch (type) {
    case 'Invoice':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'Quotation':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'Money Receipt':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200'
  }
}

export default function History() {
  const { t } = useUiLanguage()
  const { showToast } = useToast()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [savedDocuments, setSavedDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('active')
  const [displayLayout, setDisplayLayout] = useState('auto')
  const [undoInfo, setUndoInfo] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  const documents = savedDocuments
  const activeCount = useMemo(() => savedDocuments.filter((doc) => !doc.deletedAt).length, [savedDocuments])
  const trashCount = useMemo(() => savedDocuments.filter((doc) => doc.deletedAt).length, [savedDocuments])

  const refreshDocuments = async () => {
    setSavedDocuments(await loadDocuments())
    setIsLoading(false)
  }

  const getDocumentSourceLabel = (document) => {
    if (document.importedFromLocal) return 'Device'
    if (document.cloudBacked) return 'Cloud'
    return 'Local'
  }

  const getDocumentSourceClass = (document) => {
    if (document.importedFromLocal) return 'border-amber-200 bg-amber-50 text-amber-700'
    if (document.cloudBacked) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    return 'border-slate-200 bg-slate-50 text-slate-600'
  }

  const formatAuditDate = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDocumentAmount = (document) => Number(document.totalAmount ?? document.amount ?? document.receivedAmount ?? 0) || 0

  const getPaidAmount = (document) => {
    if (document.type === 'Invoice') return Number(document.paidAmount || 0) || 0
    if (document.type === 'Money Receipt') return Number(document.receivedAmount ?? document.totalAmount ?? document.amount ?? 0) || 0
    return 0
  }

  const getDueAmount = (document) => {
    if (document.type !== 'Invoice') return 0
    const total = getDocumentAmount(document)
    const paid = getPaidAmount(document)
    return Number(document.dueAmount ?? Math.max(total - paid, 0)) || 0
  }

  useEffect(() => {
    refreshDocuments()
  }, [])

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      if (viewMode === 'active' && document.deletedAt) return false
      if (viewMode === 'trash' && !document.deletedAt) return false
      const typeMatch = typeFilter === 'All' || document.type === typeFilter
      const searchText = `${document.number} ${document.clientName} ${document.phone} ${document.address} ${document.creatorName}`.toLowerCase()
      const searchMatch = search.trim() === '' || searchText.includes(search.trim().toLowerCase())
      return typeMatch && searchMatch
    })
  }, [documents, search, typeFilter, viewMode])

  const sheetSummary = useMemo(() => {
    return filteredDocuments.reduce(
      (summary, document) => ({
        count: summary.count + 1,
        totalAmount: summary.totalAmount + getDocumentAmount(document),
        paidAmount: summary.paidAmount + getPaidAmount(document),
        dueAmount: summary.dueAmount + getDueAmount(document)
      }),
      { count: 0, totalAmount: 0, paidAmount: 0, dueAmount: 0 }
    )
  }, [filteredDocuments])

  const duplicateClusters = useMemo(() => {
    const activeDocs = documents.filter((doc) => !doc.deletedAt)
    const clusterMap = new Map()

    activeDocs.forEach((doc) => {
      const type = (doc.type || '').trim()
      const client = (doc.clientName || '').trim().toLowerCase()
      const amount = Math.round(getDocumentAmount(doc))

      if (amount > 0 && client && client !== 'unnamed client' && client !== 'unknown client') {
        const key = `${type}::${client}::${amount}`
        const list = clusterMap.get(key) || []
        list.push(doc)
        clusterMap.set(key, list)
      }
    })

    const duplicates = []
    clusterMap.forEach((docs, key) => {
      if (docs.length > 1) {
        docs.sort((a, b) => {
          const dateB = new Date(b.updatedAt || b.savedAt || b.createdAt || b.date || 0)
          const dateA = new Date(a.updatedAt || a.savedAt || a.createdAt || a.date || 0)
          return dateB - dateA
        })
        duplicates.push({
          key,
          type: docs[0].type,
          clientName: docs[0].clientName,
          totalAmount: getDocumentAmount(docs[0]),
          docs
        })
      }
    })

    return duplicates.sort((a, b) => b.totalAmount - a.totalAmount)
  }, [documents])

  const duplicateCount = useMemo(() => {
    return duplicateClusters.reduce((sum, cl) => sum + (cl.docs.length - 1), 0)
  }, [duplicateClusters])

  const handleKeepLatestAndTrashOthers = async (cluster) => {
    const keepDoc = cluster.docs[0]
    const duplicatesToTrash = cluster.docs.slice(1)
    if (!window.confirm(`Keep latest ${cluster.type} "${keepDoc.number}" (${keepDoc.displayDate || keepDoc.date}) and move ${duplicatesToTrash.length} older duplicate(s) to Trash?`)) return

    try {
      for (const doc of duplicatesToTrash) {
        await softDeleteDocument(doc.id)
      }
      showToast(`Cleaned ${duplicatesToTrash.length} duplicate(s). Kept ${keepDoc.number}.`, 'success')
      await refreshDocuments()
    } catch (err) {
      console.error('Failed to trash duplicates:', err)
      showToast('Error cleaning up duplicates.', 'error')
    }
  }

  const handleCleanAllDuplicates = async () => {
    if (!duplicateClusters.length) return
    if (!window.confirm(`Clean all ${duplicateCount} duplicate documents across ${duplicateClusters.length} groups? The latest document for each order will be kept.`)) return

    try {
      let totalCleaned = 0
      for (const cluster of duplicateClusters) {
        const duplicatesToTrash = cluster.docs.slice(1)
        for (const doc of duplicatesToTrash) {
          await softDeleteDocument(doc.id)
          totalCleaned += 1
        }
      }
      showToast(`Successfully moved ${totalCleaned} duplicate documents to Trash!`, 'success')
      await refreshDocuments()
    } catch (err) {
      console.error('Failed to cleanup all duplicates:', err)
      showToast('Error cleaning all duplicates.', 'error')
    }
  }

  const typeCounts = useMemo(() => {
    const list = documents.filter((doc) => (viewMode === 'active' ? !doc.deletedAt : doc.deletedAt))
    return {
      All: list.length,
      Quotation: list.filter((d) => d.type === 'Quotation').length,
      Invoice: list.filter((d) => d.type === 'Invoice').length,
      'Money Receipt': list.filter((d) => d.type === 'Money Receipt').length
    }
  }, [documents, viewMode])

  const exportHistoryCsv = () => {
    if (!savedDocuments.length) {
      showToast('No saved documents to export.', 'error')
      return
    }
    const rows = savedDocuments.map((doc) => ({
      date: doc.displayDate || doc.date || '',
      type: doc.type || '',
      number: doc.number || '',
      client: doc.clientName || '',
      phone: doc.phone || '',
      amount: getDocumentAmount(doc),
      paidAmount: getPaidAmount(doc),
      dueAmount: getDueAmount(doc),
      status: doc.deletedAt ? 'Trash' : 'Active',
      source: getDocumentSourceLabel(doc),
      createdBy: doc.creatorName || '',
      updatedBy: doc.updatedByName || ''
    }))

    const header = ['Date', 'Document Type', 'Document Number', 'Client Name', 'Phone', 'Amount', 'Paid Amount', 'Due Amount', 'Status', 'Source', 'Created By', 'Updated By']
    const escapeValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const lines = [
      header.join(','),
      ...rows.map((row) =>
        [
          escapeValue(row.date),
          escapeValue(row.type),
          escapeValue(row.number),
          escapeValue(row.client),
          escapeValue(row.phone),
          escapeValue(Number(row.amount).toFixed(2)),
          escapeValue(Number(row.paidAmount).toFixed(2)),
          escapeValue(Number(row.dueAmount).toFixed(2)),
          escapeValue(row.status),
          escapeValue(row.source),
          escapeValue(row.createdBy),
          escapeValue(row.updatedBy)
        ].join(',')
      )
    ]

    const csv = '\uFEFF' + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `polypure-history-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    showToast('History CSV exported.', 'success')
  }

  const handleSyncNow = async () => {
    setIsSyncing(true)
    setSyncMessage('')
    try {
      const result = await syncLocalDocumentsToCloud(currentUser)
      await refreshDocuments()
      const message = `Sync complete: ${result.uploaded} uploaded, ${result.skipped} already in cloud.`
      setSyncMessage(message)
      showToast(message, 'success')
    } catch (error) {
      console.error('Manual document sync failed.', error)
      const message = 'Sync failed. Please check login and internet connection.'
      setSyncMessage(message)
      showToast(message, 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  const openDocument = (document, duplicate = false) => {
    if (document.deletedAt) return
    const targetByType = {
      Quotation: '/quotation',
      Invoice: '/invoice',
      'Money Receipt': '/money-receipt'
    }
    const targetPath = targetByType[document.type]
    if (!targetPath) return

    const prefillDocument = duplicate ? { ...document, id: '', number: '' } : document
    navigate(targetPath, { state: { prefillDocument } })
  }

  const handleSoftDelete = (documentId) => {
    const target = savedDocuments.find((doc) => doc.id === documentId)
    if (!target) return
    const ok = window.confirm(`Move "${target.number}" to Trash?`)
    if (!ok) return
    softDeleteDocument(documentId).then(refreshDocuments)
    setUndoInfo(target)
    showToast('Moved to trash.', 'success')
    window.setTimeout(() => {
      setUndoInfo((current) => (current?.id === target.id ? null : current))
    }, 8000)
  }

  const handleRestore = (documentId) => {
    restoreDocument(documentId).then(async () => {
      await refreshDocuments()
      showToast('Document restored.', 'success')
    })
  }

  const handleHardDelete = (documentId) => {
    const target = savedDocuments.find((doc) => doc.id === documentId)
    if (!target) return
    const ok = window.confirm(`Permanently delete "${target.number}"? This cannot be undone.`)
    if (!ok) return
    hardDeleteDocument(documentId).then(async () => {
      await refreshDocuments()
      showToast('Document permanently deleted.', 'success')
    })
  }

  const undoSoftDelete = () => {
    if (!undoInfo?.id) return
    restoreDocument(undoInfo.id).then(async () => {
      await refreshDocuments()
      setUndoInfo(null)
      showToast('Delete undone.', 'success')
    })
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          
          <h1 className="text-xl sm:text-2xl font-bold text-slate-950">{t('history_title')}</h1>
          
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="min-h-9 px-3 py-1.5 text-xs"
            disabled={isSyncing}
            onClick={handleSyncNow}
            type="button"
            variant="primary"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Cloud'}
          </Button>
          <Button
            className="min-h-9 px-3 py-1.5 text-xs"
            disabled={!savedDocuments.length}
            onClick={exportHistoryCsv}
            type="button"
            variant="secondary"
          >
            <Download size={13} />
            Export CSV
          </Button>
        </div>
      </div>

      {syncMessage ? (
        <div className="rounded-lg border border-brand-200 bg-brand-50/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-brand-800 flex items-center gap-2">
          <Cloud size={16} className="shrink-0 text-brand-600" />
          <span>{syncMessage}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-soft min-w-0 overflow-hidden">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
            Rows Showing
          </p>
          <p className="mt-1 text-base sm:text-xl xl:text-2xl font-bold text-slate-950 truncate">
            {sheetSummary.count} <span className="text-xs font-normal text-slate-400">/ {documents.length}</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-soft min-w-0 overflow-hidden">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
            Document Total
          </p>
          <p className="mt-1 text-base sm:text-xl xl:text-2xl font-bold text-slate-950 truncate">
            {formatCurrency(sheetSummary.totalAmount)}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 sm:p-4 shadow-soft min-w-0 overflow-hidden">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 truncate">
            Received / Paid
          </p>
          <p className="mt-1 text-base sm:text-xl xl:text-2xl font-bold text-emerald-700 truncate">
            {formatCurrency(sheetSummary.paidAmount)}
          </p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-3.5 sm:p-4 shadow-soft min-w-0 overflow-hidden">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-700 truncate">
            Due Amount
          </p>
          <p className="mt-1 text-base sm:text-xl xl:text-2xl font-bold text-rose-600 truncate">
            {formatCurrency(sheetSummary.dueAmount)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-soft">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 min-w-0">
              <div className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
                <Search size={16} className="text-slate-400 shrink-0" aria-hidden="true" />
                <input
                  className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search document #, client, phone, creator..."
                  type="text"
                  value={search}
                />
                {search ? (
                  <button
                    className="text-slate-400 hover:text-slate-600"
                    onClick={() => setSearch('')}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1">
                <button
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    viewMode === 'active'
                      ? 'bg-white text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setViewMode('active')}
                  type="button"
                >
                  Active ({activeCount})
                </button>
                <button
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    viewMode === 'trash'
                      ? 'bg-white text-rose-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setViewMode('trash')}
                  type="button"
                >
                  Trash ({trashCount})
                </button>
              </div>

              <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1">
                <button
                  className={`rounded-md p-1.5 text-xs transition ${
                    displayLayout === 'auto'
                      ? 'bg-white text-brand-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  onClick={() => setDisplayLayout('auto')}
                  title="Auto Responsive View"
                  type="button"
                >
                  <span className="text-[11px] font-bold px-1">Auto</span>
                </button>
                <button
                  className={`rounded-md p-1.5 text-xs transition ${
                    displayLayout === 'cards'
                      ? 'bg-white text-brand-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  onClick={() => setDisplayLayout('cards')}
                  title="Card Grid View"
                  type="button"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  className={`rounded-md p-1.5 text-xs transition ${
                    displayLayout === 'table'
                      ? 'bg-white text-brand-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  onClick={() => setDisplayLayout('table')}
                  title="Sheet Table View"
                  type="button"
                >
                  <TableIcon size={15} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
            {['All', 'Quotation', 'Invoice', 'Money Receipt'].map((type) => {
              const isSelected = typeFilter === type
              const count = typeCounts[type] || 0
              return (
                <button
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-brand-700 text-white shadow-soft'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  type="button"
                >
                  <span>{type === 'All' ? 'All Types' : type}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {viewMode === 'duplicates' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 shadow-soft">
            <div className="flex items-start sm:items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-amber-900 font-black text-lg">
                🔍
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-amber-950">
                  Smart Duplicate Scanner (স্মার্ট ডুপ্লিকেট স্ক্যানার)
                </h3>
                <p className="text-xs text-amber-800">
                  {duplicateClusters.length > 0
                    ? `Detected ${duplicateClusters.length} duplicate order groups (${duplicateCount} redundant records).`
                    : 'All saved active documents are clean and unique! No duplicates detected.'}
                </p>
              </div>
            </div>

            {duplicateClusters.length > 0 && (
              <Button
                className="text-xs px-3.5 py-2 font-bold shadow-xs bg-amber-700 hover:bg-amber-800 text-white"
                onClick={handleCleanAllDuplicates}
                type="button"
                variant="primary"
              >
                <span>⚡ Clean All (${duplicateCount} Duplicates)</span>
              </Button>
            )}
          </div>

          {duplicateClusters.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 text-2xl font-bold border border-emerald-200">
                ✓
              </div>
              <h4 className="text-base font-bold text-slate-900">No Duplicate Records Found</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Your database is completely optimized. Every active Quotation, Invoice, and Money Receipt has unique entries.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {duplicateClusters.map((cluster) => {
                const latestDoc = cluster.docs[0]
                const olderDuplicates = cluster.docs.slice(1)

                return (
                  <div
                    key={cluster.key}
                    className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden space-y-3 p-4 sm:p-5"
                  >
                    {/* Cluster Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${getDocumentTypeBadge(
                              cluster.type
                            )}`}
                          >
                            {cluster.type}
                          </span>
                          <h4 className="text-sm sm:text-base font-bold text-slate-950">{cluster.clientName}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {cluster.docs.length} matching documents found • Total Order Value:{' '}
                          <strong className="text-slate-900 font-bold">{formatCurrency(cluster.totalAmount)}</strong>
                        </p>
                      </div>

                      <Button
                        className="text-xs px-3 py-1.5 font-bold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                        onClick={() => handleKeepLatestAndTrashOthers(cluster)}
                        type="button"
                        variant="primary"
                      >
                        <span>⚡ Keep Latest ({latestDoc.number}) & Trash {olderDuplicates.length} Old</span>
                      </Button>
                    </div>

                    {/* Cluster Document Comparison List */}
                    <div className="space-y-2">
                      {cluster.docs.map((doc, idx) => {
                        const isLatest = idx === 0
                        const total = getDocumentAmount(doc)
                        const paid = getPaidAmount(doc)
                        const due = getDueAmount(doc)

                        return (
                          <div
                            key={doc.id || doc.number}
                            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl p-3 text-xs border transition ${
                              isLatest
                                ? 'border-emerald-300 bg-emerald-50/40'
                                : 'border-rose-200 bg-rose-50/30'
                            }`}
                          >
                            <div className="flex items-start sm:items-center gap-2.5">
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                  isLatest
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {isLatest ? '⭐ Active (Latest)' : '⚠️ Duplicate'}
                              </span>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-slate-900">{doc.number}</span>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-600">{doc.displayDate || doc.date}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Created by: <strong className="text-slate-700">{doc.creatorName || 'Unknown'}</strong>{' '}
                                  {doc.createdAt ? `(${formatAuditDate(doc.createdAt)})` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block uppercase">
                                  {doc.type === 'Invoice' ? `Paid: ${formatCurrency(paid)} | Due: ${formatCurrency(due)}` : 'Amount'}
                                </span>
                                <span className="font-bold text-slate-900">{formatCurrency(total)}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Button
                                  className="text-xs px-2 py-1"
                                  onClick={() => handleOpenDocument(doc)}
                                  type="button"
                                  variant="secondary"
                                >
                                  Open
                                </Button>

                                {!isLatest && (
                                  <Button
                                    className="text-xs px-2 py-1 text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100"
                                    onClick={() => handleSoftDelete(doc.id)}
                                    type="button"
                                    variant="secondary"
                                  >
                                    <Trash2 size={13} />
                                    <span>Trash</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
      <div className="rounded-xl border border-slate-200 bg-white shadow-soft overflow-hidden">
        <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-950 text-sm sm:text-base">Previous Documents Sheet</h3>
            <p className="text-xs text-slate-500">
              Showing {filteredDocuments.length} document{filteredDocuments.length === 1 ? '' : 's'}
            </p>
          </div>

          {displayLayout === 'auto' ? (
            <span className="text-[11px] font-semibold text-slate-500">
              Sheet view on desktop • Card view on mobile
            </span>
          ) : null}
        </div>

        <div
          className={`${
            displayLayout === 'cards'
              ? 'block'
              : displayLayout === 'table'
              ? 'hidden'
              : 'block lg:hidden'
          } p-3.5 sm:p-4`}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDocuments.map((document, index) => (
              <div
                className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-brand-200 hover:shadow-sm"
                key={document.id || document.number}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${getDocumentTypeBadge(document.type)}`}>
                      {document.type}
                    </span>
                    <p className="mt-1 font-mono text-xs font-bold text-slate-900 truncate">
                      {document.number || '-'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-slate-500 block">
                      {document.displayDate || document.date || '-'}
                    </span>
                    <span className={`inline-block mt-0.5 rounded-full border px-2 py-0.2 text-[10px] font-bold ${getDocumentSourceClass(document)}`}>
                      {getDocumentSourceLabel(document)}
                    </span>
                  </div>
                </div>

                {/* Client Info with Highlighted Name Badge */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-950 max-w-full truncate shadow-2xs">
                      <User size={12} className="text-brand-600 shrink-0" aria-hidden="true" />
                      <span className="truncate">{renderHighlightedText(document.clientName || 'Unnamed Client', search)}</span>
                    </span>
                  </div>
                  {document.phone ? (
                    <a
                      className="mt-1 flex items-center gap-1 text-brand-700 hover:underline font-medium"
                      href={`tel:${document.phone}`}
                    >
                      <Phone size={11} className="text-slate-400" />
                      {document.phone}
                    </a>
                  ) : null}
                  {document.address ? (
                    <p className="mt-0.5 text-slate-500 truncate text-[11px]">
                      {document.address}
                    </p>
                  ) : null}
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-center text-xs">
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase text-slate-400 font-semibold truncate">Total</span>
                    <span className="font-bold text-slate-900 truncate block text-xs">
                      {formatCurrency(getDocumentAmount(document))}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase text-slate-400 font-semibold truncate">Paid</span>
                    <span className="font-bold text-emerald-700 truncate block text-xs">
                      {formatCurrency(getPaidAmount(document))}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] uppercase text-slate-400 font-semibold truncate">Due</span>
                    <span className="font-bold text-rose-600 truncate block text-xs">
                      {formatCurrency(getDueAmount(document))}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="text-[10px] text-slate-400 truncate">
                    <span>{document.creatorName || 'System'}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {viewMode === 'active' ? (
                      <>
                        <Button
                          className="min-h-7 px-2 py-0.5 text-[11px]"
                          onClick={() => openDocument(document)}
                          type="button"
                          variant="secondary"
                        >
                          <FileText size={12} />
                          Open
                        </Button>
                        <Button
                          className="min-h-7 px-2 py-0.5 text-[11px]"
                          onClick={() => openDocument(document, true)}
                          type="button"
                          variant="secondary"
                        >
                          <Copy size={12} />
                          Copy
                        </Button>
                        <Button
                          className="min-h-7 px-2 py-0.5 text-[11px] text-rose-600 hover:bg-rose-50"
                          onClick={() => handleSoftDelete(document.id)}
                          type="button"
                          variant="secondary"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          className="min-h-7 px-2 py-0.5 text-[11px]"
                          onClick={() => handleRestore(document.id)}
                          type="button"
                          variant="secondary"
                        >
                          <RotateCcw size={12} />
                          Restore
                        </Button>
                        <Button
                          className="min-h-7 px-2 py-0.5 text-[11px] text-rose-600"
                          onClick={() => handleHardDelete(document.id)}
                          type="button"
                          variant="secondary"
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!filteredDocuments.length ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              {isLoading ? 'Loading documents...' : t('history_no_data')}
            </div>
          ) : null}
        </div>

        <div
          className={`${
            displayLayout === 'table'
              ? 'block'
              : displayLayout === 'cards'
              ? 'hidden'
              : 'hidden lg:block'
          } overflow-x-auto`}
        >
          <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20 bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-3 py-3 font-bold">SL</th>
                <th className="border-b border-slate-200 px-3 py-3 font-bold">Date</th>
                <th className="border-b border-slate-200 px-3 py-3 font-bold">Type</th>
                <th className="border-b border-slate-200 px-3 py-3 font-bold">Document No</th>
                <th className="border-b border-slate-200 px-3 py-3 font-bold">Client</th>
                <th className="border-b border-slate-200 px-3 py-3 font-bold">Phone</th>
                <th className="border-b border-slate-200 px-3 py-3 text-right font-bold">Amount</th>
                <th className="border-b border-slate-200 px-3 py-3 text-right font-bold">Paid</th>
                <th className="border-b border-slate-200 px-3 py-3 text-right font-bold">Due</th>
                <th className="border-b border-slate-200 px-3 py-3 font-bold">Source</th>
                <th className="border-b border-slate-200 px-3 py-3 font-bold">Created By</th>
                <th className="sticky right-0 border-b border-slate-200 bg-slate-100 px-3 py-3 text-right font-bold shadow-[-4px_0_6px_rgba(0,0,0,0.04)] z-30">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredDocuments.map((document, index) => (
                <tr className="align-middle hover:bg-brand-50/40 transition" key={document.id || document.number}>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">{index + 1}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">
                    {document.displayDate || document.date || '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${getDocumentTypeBadge(document.type)}`}>
                      {document.type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-bold text-slate-800">
                    {document.number}
                  </td>
                  <td className="px-3 py-3 max-w-[220px]">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-950 max-w-full truncate shadow-2xs">
                        <User size={12} className="text-brand-600 shrink-0" aria-hidden="true" />
                        <span className="truncate">{renderHighlightedText(document.clientName || 'Unnamed Client', search)}</span>
                      </span>
                      {document.address ? (
                        <p className="truncate text-[11px] text-slate-500 mt-1 pl-0.5">{document.address}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">
                    {document.phone ? (
                      <a className="hover:text-brand-700 font-medium" href={`tel:${document.phone}`}>
                        {document.phone}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold text-slate-950">
                    {formatCurrency(getDocumentAmount(document))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold text-emerald-700">
                    {formatCurrency(getPaidAmount(document))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold text-rose-600">
                    {formatCurrency(getDueAmount(document))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${getDocumentSourceClass(document)}`}>
                      {getDocumentSourceLabel(document)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">
                    <p className="truncate max-w-[120px]">{document.creatorName || 'System'}</p>
                    <p className="text-[10px] text-slate-400">{formatAuditDate(document.updatedAt)}</p>
                  </td>
                  <td className="sticky right-0 whitespace-nowrap bg-white px-3 py-3 shadow-[-4px_0_6px_rgba(0,0,0,0.04)] z-10">
                    <div className="flex justify-end gap-1.5">
                      {viewMode === 'active' ? (
                        <>
                          <Button className="min-h-7 px-2 py-1 text-xs" onClick={() => openDocument(document)} type="button" variant="secondary">
                            {t('open')}
                          </Button>
                          <Button className="min-h-7 px-2 py-1 text-xs" onClick={() => openDocument(document, true)} type="button" variant="secondary">
                            {t('duplicate')}
                          </Button>
                          <Button className="min-h-7 px-2 py-1 text-xs text-rose-600" onClick={() => handleSoftDelete(document.id)} type="button" variant="secondary">
                            Delete
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button className="min-h-7 px-2 py-1 text-xs" onClick={() => handleRestore(document.id)} type="button" variant="secondary">
                            Restore
                          </Button>
                          <Button className="min-h-7 px-2 py-1 text-xs text-rose-600" onClick={() => handleHardDelete(document.id)} type="button" variant="secondary">
                            Delete Permanently
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan="12">
                    {isLoading ? 'Loading documents...' : t('history_no_data')}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {undoInfo ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-800">
            <Trash2 size={16} className="text-brand-700" />
            <span>
              Moved <strong className="text-brand-900">{undoInfo.number}</strong> to Trash.
            </span>
          </div>
          <Button className="min-h-8 px-3 py-1 text-xs" onClick={undoSoftDelete} type="button" variant="primary">
            <Undo size={14} />
            Undo Delete
          </Button>
        </div>
      ) : null}
    </div>
  )
}
