import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import Card from '../components/Card.jsx'
import { sampleDocuments } from '../data/sampleDocuments.js'
import { loadDocuments } from '../utils/documents.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function History() {
  const { t } = useUiLanguage()
  const navigate = useNavigate()
  const savedDocuments = useMemo(() => loadDocuments(), [])
  const [typeFilter, setTypeFilter] = useState('All')
  const [search, setSearch] = useState('')
  const documents = savedDocuments.length > 0 ? savedDocuments : sampleDocuments
  const isShowingSamples = savedDocuments.length === 0
  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      const typeMatch = typeFilter === 'All' || document.type === typeFilter
      const searchText = `${document.number} ${document.clientName}`.toLowerCase()
      const searchMatch = search.trim() === '' || searchText.includes(search.trim().toLowerCase())
      return typeMatch && searchMatch
    })
  }, [documents, search, typeFilter])

  const openDocument = (document, duplicate = false) => {
    if (isShowingSamples) {
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

  return (
    <Card>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">{t('history_title')}</h2>
          <p className="text-sm text-slate-500">
            {isShowingSamples ? t('history_sample_note') : t('history_saved_note')}
          </p>
        </div>
        <p className="text-sm font-semibold text-brand-700">{documents.length} document{documents.length === 1 ? '' : 's'}</p>
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

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="hidden grid-cols-[1fr_1.2fr_1.2fr_1fr_1fr_170px] bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 md:grid">
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
              className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1fr_1.2fr_1.2fr_1fr_1fr_170px] md:items-center"
              key={document.id || document.number}
            >
              <p className="font-semibold text-slate-950">{document.type}</p>
              <p className="text-slate-600">{document.number}</p>
              <p className="text-slate-600">{document.clientName}</p>
              <p className="text-slate-600">{document.displayDate || document.date}</p>
              <p className="font-bold text-brand-700 md:text-right">{formatCurrency(document.totalAmount || document.amount)}</p>
              <div className="flex gap-2 md:justify-end">
                <Button className="min-h-9 px-3 py-2 text-xs" disabled={isShowingSamples} onClick={() => openDocument(document)} type="button" variant="secondary">
                  {t('open')}
                </Button>
                <Button className="min-h-9 px-3 py-2 text-xs" disabled={isShowingSamples} onClick={() => openDocument(document, true)} type="button" variant="secondary">
                  {t('duplicate')}
                </Button>
              </div>
            </div>
          ))}
          {filteredDocuments.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">{t('history_no_data')}</div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
