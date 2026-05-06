import { useMemo } from 'react'
import Card from '../components/Card.jsx'
import { sampleDocuments } from '../data/sampleDocuments.js'
import { loadDocuments } from '../utils/documents.js'
import { formatCurrency } from '../utils/formatCurrency.js'

export default function History() {
  const savedDocuments = useMemo(() => loadDocuments(), [])
  const documents = savedDocuments.length > 0 ? savedDocuments : sampleDocuments
  const isShowingSamples = savedDocuments.length === 0

  return (
    <Card>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">History</h2>
          <p className="text-sm text-slate-500">
            {isShowingSamples ? 'Sample documents are shown until you save your first quotation.' : 'Saved documents on this device.'}
          </p>
        </div>
        <p className="text-sm font-semibold text-brand-700">{documents.length} document{documents.length === 1 ? '' : 's'}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="hidden grid-cols-[1fr_1.2fr_1.2fr_1fr_1fr] bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600 md:grid">
          <span>Document Type</span>
          <span>Document Number</span>
          <span>Client Name</span>
          <span>Date</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="divide-y divide-slate-200">
          {documents.map((document) => (
            <div
              className="grid gap-2 px-4 py-4 text-sm md:grid-cols-[1fr_1.2fr_1.2fr_1fr_1fr] md:items-center"
              key={document.id || document.number}
            >
              <p className="font-semibold text-slate-950">{document.type}</p>
              <p className="text-slate-600">{document.number}</p>
              <p className="text-slate-600">{document.clientName}</p>
              <p className="text-slate-600">{document.displayDate || document.date}</p>
              <p className="font-bold text-brand-700 md:text-right">{formatCurrency(document.totalAmount || document.amount)}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
