import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import Card from '../components/Card.jsx'
import { sampleDocuments } from '../data/sampleDocuments.js'
import { hardDeleteDocument, loadDocuments, restoreDocument, softDeleteDocument } from '../utils/documents.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { useToast } from '../utils/toast.jsx'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function History() {
  const { t } = useUiLanguage()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [savedDocuments, setSavedDocuments] = useState(() => loadDocuments())
  const [typeFilter, setTypeFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('active')
  const [undoInfo, setUndoInfo] = useState(null)
  const documents = savedDocuments.length > 0 ? savedDocuments : sampleDocuments
  const isShowingSamples = savedDocuments.length === 0
  const activeCount = useMemo(() => savedDocuments.filter((doc) => !doc.deletedAt).length, [savedDocuments])
  const trashCount = useMemo(() => savedDocuments.filter((doc) => doc.deletedAt).length, [savedDocuments])
  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      if (viewMode === 'active' && document.deletedAt) return false
      if (viewMode === 'trash' && !document.deletedAt) return false
      const typeMatch = typeFilter === 'All' || document.type === typeFilter
      const searchText = `${document.number} ${document.clientName}`.toLowerCase()
      const searchMatch = search.trim() === '' || searchText.includes(search.trim().toLowerCase())
      return typeMatch && searchMatch
    })
  }, [documents, search, typeFilter, viewMode])

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
      amount: doc.totalAmount ?? doc.amount ?? 0,
      status: doc.deletedAt ? 'Trash' : 'Active'
    }))

    const header = ['Date', 'Document Type', 'Document Number', 'Client Name', 'Amount', 'Status']
    const escapeValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
    const lines = [
      header.join(','),
      ...rows.map((row) =>
        [
          escapeValue(row.date),
          escapeValue(row.type),
          escapeValue(row.number),
          escapeValue(row.client),
          escapeValue(Number(row.amount).toFixed(2)),
          escapeValue(row.status)
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

  const openDocument = (document, duplicate = false) => {
    if (isShowingSamples || document.deletedAt) {
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
    if (isShowingSamples) return
    const target = savedDocuments.find((doc) => doc.id === documentId)
    if (!target) return
    const ok = window.confirm(`Move "${target.number}" to Trash?`)
    if (!ok) return
    softDeleteDocument(documentId)
    setSavedDocuments(loadDocuments())
    setUndoInfo(target)
    showToast('Moved to trash.', 'success')
    window.setTimeout(() => {
      setUndoInfo((current) => (current?.id === target.id ? null : current))
    }, 8000)
  }

  const handleRestore = (documentId) => {
    restoreDocument(documentId)
    setSavedDocuments(loadDocuments())
    showToast('Document restored.', 'success')
  }

  const handleHardDelete = (documentId) => {
    const target = savedDocuments.find((doc) => doc.id === documentId)
    if (!target) return
    const ok = window.confirm(`Permanently delete "${target.number}"? This cannot be undone.`)
    if (!ok) return
    hardDeleteDocument(documentId)
    setSavedDocuments(loadDocuments())
    showToast('Document permanently deleted.', 'success')
  }

  const undoSoftDelete = () => {
    if (!undoInfo?.id) return
    restoreDocument(undoInfo.id)
    setSavedDocuments(loadDocuments())
    setUndoInfo(null)
    showToast('Delete undone.', 'success')
  }

  return (
    <Card>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{t('history_title')}</h2>
          <p className="text-sm text-slate-500">
            {isShowingSamples ? t('history_sample_note') : t('history_saved_note')}
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {!isShowingSamples ? (
        <div className="mb-4 flex gap-2">
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
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="hidden grid-cols-[1fr_1.2fr_1.2fr_1fr_1fr_230px] bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 md:grid">
          <span>Document Type</span>
          <span>Document Number</span>
          <span>Client Name</span>
          <span>Date</span>
          <span className="text-right">Amount</span>
          <span className="text-right">{t('actions')}</span>
        </div>
        <div className="divide-y divide-slate-200">
          {filteredDocuments.map((document) => (
            <div
              className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1fr_1.2fr_1.2fr_1fr_1fr_230px] md:items-center"
              key={document.id || document.number}
            >
              <p className="font-semibold text-slate-950">{document.type}</p>
              <p className="text-slate-600">{document.number}</p>
              <p className="text-slate-600">{document.clientName}</p>
              <p className="text-slate-600">{document.displayDate || document.date}</p>
              <p className="font-bold text-brand-700 md:text-right">{formatCurrency(document.totalAmount || document.amount)}</p>
              <div className="flex gap-2 md:justify-end">
                {viewMode === 'active' ? (
                  <>
                    <Button className="min-h-9 px-3 py-2 text-xs" disabled={isShowingSamples} onClick={() => openDocument(document)} type="button" variant="secondary">
                      {t('open')}
                    </Button>
                    <Button className="min-h-9 px-3 py-2 text-xs" disabled={isShowingSamples} onClick={() => openDocument(document, true)} type="button" variant="secondary">
                      {t('duplicate')}
                    </Button>
                    <Button className="min-h-9 px-3 py-2 text-xs" disabled={isShowingSamples} onClick={() => handleSoftDelete(document.id)} type="button" variant="secondary">
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button className="min-h-9 px-3 py-2 text-xs" onClick={() => handleRestore(document.id)} type="button" variant="secondary">
                      Restore
                    </Button>
                    <Button className="min-h-9 px-3 py-2 text-xs" onClick={() => handleHardDelete(document.id)} type="button" variant="secondary">
                      Delete Permanently
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {filteredDocuments.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">{t('history_no_data')}</div>
          ) : null}
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
