import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import Card from '../components/Card.jsx'
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
    if (document.importedFromLocal) return 'Imported from device'
    if (document.cloudBacked) return 'Cloud saved'
    return 'Local only'
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
    if (document.deletedAt) {
      return
    }
    const targetByType = {
      Quotation: '/quotation',
      Invoice: '/invoice',
      'Money Receipt': '/money-receipt'
    }
    const targetPath = targetByType[document.type]
    if (!targetPath) {
      return
    }
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
    <Card>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{t('history_title')}</h2>
          <p className="text-sm text-slate-500">{t('history_saved_note')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="min-h-9 px-3 py-2 text-xs"
            disabled={isSyncing}
            onClick={handleSyncNow}
            type="button"
            variant="primary"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          <Button
            className="min-h-9 px-3 py-2 text-xs"
            disabled={!savedDocuments.length}
            onClick={exportHistoryCsv}
            type="button"
            variant="secondary"
          >
            Export CSV
          </Button>
          <p className="text-sm font-semibold text-brand-700">{documents.length} document{documents.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      {syncMessage ? (
        <p className="mb-4 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
          {syncMessage}
        </p>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Rows Showing</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{sheetSummary.count}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Document Amount</p>
          <p className="mt-1 text-xl font-bold text-slate-950">{formatCurrency(sheetSummary.totalAmount)}</p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
          <p className="text-xs font-semibold uppercase text-emerald-700">Received / Paid</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">{formatCurrency(sheetSummary.paidAmount)}</p>
        </div>
        <div className="rounded-lg border border-brand-100 bg-brand-50 p-3">
          <p className="text-xs font-semibold uppercase text-brand-700">Due Amount</p>
          <p className="mt-1 text-xl font-bold text-brand-700">{formatCurrency(sheetSummary.dueAmount)}</p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Select id="history-type-filter" label={t('history_filter_type')} onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>
          <option>All</option>
          <option>Quotation</option>
          <option>Invoice</option>
          <option>Money Receipt</option>
        </Select>
        <Input
          id="history-search"
          label={t('history_search')}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="e.g. PP-Q or Client Name"
          value={search}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          className="min-h-10 px-3 py-2 text-xs"
          onClick={() => setViewMode('active')}
          type="button"
          variant={viewMode === 'active' ? 'primary' : 'secondary'}
        >
          Active ({activeCount})
        </Button>
        <Button
          className="min-h-10 px-3 py-2 text-xs"
          onClick={() => setViewMode('trash')}
          type="button"
          variant={viewMode === 'trash' ? 'primary' : 'secondary'}
        >
          Trash ({trashCount})
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <h3 className="font-bold text-slate-950">Previous Documents Sheet</h3>
          <p className="text-xs text-slate-500">All saved quotations, invoices, and money receipts in one sheet-style view.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
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
                <th className="border-b border-slate-200 px-3 py-3 text-right font-bold">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredDocuments.map((document, index) => (
                <tr className="align-top hover:bg-brand-50/40" key={document.id || document.number}>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{index + 1}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{document.displayDate || document.date || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-950">{document.type}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{document.number}</td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-800">{document.clientName || 'Client Name'}</p>
                    <p className="mt-0.5 max-w-56 truncate text-xs text-slate-500">{document.address || ''}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{document.phone || '-'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-slate-950">{formatCurrency(getDocumentAmount(document))}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-emerald-700">{formatCurrency(getPaidAmount(document))}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-brand-700">{formatCurrency(getDueAmount(document))}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${getDocumentSourceClass(document)}`}>
                      {getDocumentSourceLabel(document)}
                    </span>
                    {document.deletedAt ? (
                      <span className="ml-1 inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
                        Trash
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    <p>{document.creatorName || 'Unknown User'}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{formatAuditDate(document.updatedAt)}</p>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      {viewMode === 'active' ? (
                        <>
                          <Button className="min-h-8 px-2.5 py-1.5 text-xs" onClick={() => openDocument(document)} type="button" variant="secondary">
                            {t('open')}
                          </Button>
                          <Button className="min-h-8 px-2.5 py-1.5 text-xs" onClick={() => openDocument(document, true)} type="button" variant="secondary">
                            {t('duplicate')}
                          </Button>
                          <Button className="min-h-8 px-2.5 py-1.5 text-xs" onClick={() => handleSoftDelete(document.id)} type="button" variant="secondary">
                            Delete
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button className="min-h-8 px-2.5 py-1.5 text-xs" onClick={() => handleRestore(document.id)} type="button" variant="secondary">
                            Restore
                          </Button>
                          <Button className="min-h-8 px-2.5 py-1.5 text-xs" onClick={() => handleHardDelete(document.id)} type="button" variant="secondary">
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

      {undoInfo ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3">
          <p className="text-sm font-medium text-slate-700">
            Moved <span className="font-bold">{undoInfo.number}</span> to Trash.
          </p>
          <Button className="min-h-9 px-3 py-2 text-xs" onClick={undoSoftDelete} type="button" variant="secondary">
            Undo
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
