import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  CreditCard,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  History,
  MapPin,
  Phone,
  Receipt,
  Search,
  SquarePen,
  TrendingUp,
  UserCheck,
  Users,
  Wallet
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import { loadDocuments } from '../utils/documents.js'
import { buildClientProfiles, filterClientProfiles, getDocumentAmount, getDueAmount, getPaidAmount } from '../utils/clientProfiles.js'
import { formatCurrency } from '../utils/formatCurrency.js'

function formatDetailDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getDocumentDate(document) {
  return document.displayDate || document.date || formatDetailDate(document.createdAt || document.savedAt || document.updatedAt)
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

export default function Clients() {
  const navigate = useNavigate()
  const [savedDocuments, setSavedDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState('')

  useEffect(() => {
    let isMounted = true

    loadDocuments()
      .then((documents) => {
        if (!isMounted) return
        setSavedDocuments(documents)
        setIsLoading(false)
      })
      .catch((error) => {
        console.error('Unable to load clients.', error)
        if (!isMounted) return
        setSavedDocuments([])
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const profiles = useMemo(() => buildClientProfiles(savedDocuments), [savedDocuments])
  const filteredProfiles = useMemo(() => filterClientProfiles(profiles, search), [profiles, search])

  useEffect(() => {
    if (!filteredProfiles.length) {
      setSelectedKey('')
      return
    }

    setSelectedKey((current) => (filteredProfiles.some((profile) => profile.key === current) ? current : filteredProfiles[0].key))
  }, [filteredProfiles])

  const selectedProfile = filteredProfiles.find((profile) => profile.key === selectedKey) || filteredProfiles[0] || null

  const openDocument = (document, duplicate = false) => {
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

  const dueInvoices = selectedProfile?.invoices.filter((invoice) => getDueAmount(invoice) > 0) || []

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      {/* Mobile & Tablet Client Search and Dropdown Selector (Visible on screens < xl) */}
      <div className="block xl:hidden">
        <Card className="border-brand-200 bg-gradient-to-br from-brand-50/70 via-white to-slate-50 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-soft">
                  <Users size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-950">Clients Directory</h2>
                  <p className="text-xs text-slate-500">{filteredProfiles.length} clients available</p>
                </div>
              </div>
              {selectedProfile ? (
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-800">
                  {selectedProfile.documentCount} docs
                </span>
              ) : null}
            </div>

            {/* Mobile Search Input */}
            <div className="relative">
              <Input
                id="client-search-mobile"
                label=""
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone, invoice #..."
                value={search}
              />
            </div>

            {/* Mobile / Tablet Client Selector Dropdown */}
            <label className="grid gap-1 text-xs font-bold text-slate-700" htmlFor="client-select-dropdown">
              Select Client Account
              <div className="relative">
                <select
                  className="w-full min-h-11 appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm font-semibold text-slate-900 shadow-sm transition focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  id="client-select-dropdown"
                  onChange={(e) => setSelectedKey(e.target.value)}
                  value={selectedKey}
                >
                  {filteredProfiles.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.clientName} {p.phone ? `(${p.phone})` : ''} • {p.documentCount} docs
                    </option>
                  ))}
                  {!filteredProfiles.length ? (
                    <option disabled value="">No clients found</option>
                  ) : null}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                  aria-hidden="true"
                />
              </div>
            </label>
          </div>
        </Card>
      </div>

      {/* Desktop Sidebar (Visible only on xl screens) */}
      <Card className="hidden xl:block xl:sticky xl:top-24 xl:self-start">
        <div className="mb-4">
          
          <h2 className="text-2xl font-bold text-slate-950">Clients</h2>
          
        </div>

        <Input
          id="client-search"
          label="Search client"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, phone, address, or document #"
          value={search}
        />

        <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-sm font-semibold text-slate-600">Clients found</span>
          <span className="text-lg font-bold text-brand-700">{filteredProfiles.length}</span>
        </div>

        <div className="mt-4 max-h-[62vh] space-y-2 overflow-auto pr-1">
          {filteredProfiles.map((profile) => {
            const isSelected = selectedProfile?.key === profile.key
            return (
              <button
                className={`w-full rounded-lg border p-3 text-left transition ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/80 text-brand-900 shadow-sm ring-1 ring-brand-400'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/40'
                }`}
                key={profile.key}
                onClick={() => setSelectedKey(profile.key)}
                type="button"
              >
                <span className="block text-base font-bold text-slate-950 truncate">{profile.clientName}</span>
                <span className="mt-1 block text-sm text-slate-500 truncate">{profile.phone || 'No phone saved'}</span>
                <span className="mt-2 flex items-center justify-between text-xs font-semibold">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{profile.documentCount} docs</span>
                  <span className="text-brand-700 font-bold">{formatCurrency(profile.lifetimeReceived)}</span>
                </span>
              </button>
            )
          })}

          {!filteredProfiles.length ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
              {isLoading ? 'Loading clients...' : 'No client found.'}
            </div>
          ) : null}
        </div>
      </Card>

      {/* Main Details Area */}
      <div className="min-w-0">
        {selectedProfile ? (
          <div className="grid gap-4 sm:gap-5">
            {/* 1. Client Profile Header Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-700">
                      Client Profile
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-950 mt-1.5 break-words">
                    {selectedProfile.clientName}
                  </h2>
                  <div className="mt-3 grid gap-2 text-xs sm:text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <Phone size={15} className="text-brand-600 shrink-0" />
                      <span className="font-semibold text-slate-900">Phone:</span>
                      {selectedProfile.phone ? (
                        <a
                          className="font-semibold text-brand-700 hover:underline"
                          href={`tel:${selectedProfile.phone}`}
                        >
                          {selectedProfile.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">No phone saved</span>
                      )}
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                      <span className="font-semibold text-slate-900">Address:</span>{' '}
                      <span className="text-slate-700">{selectedProfile.address || 'No address saved'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <FileText size={15} className="text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-900">Last Document:</span>{' '}
                      <span className="text-slate-700 font-mono">
                        {selectedProfile.lastDocument?.type || '-'} {selectedProfile.lastDocument?.number || ''}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Lifetime Received Box */}
                <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50/80 via-white to-brand-50/40 p-4 text-sm lg:min-w-[240px] shadow-sm">
                  <span className="font-bold text-brand-700 text-xs uppercase tracking-wider block">
                    Lifetime Received
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-brand-700 block mt-1">
                    {formatCurrency(selectedProfile.lifetimeReceived)}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-1 leading-tight">
                    Invoices paid + Money receipts
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Key Metrics (KPIs) - Responsive 2-col on Mobile/Tablet, 4-col on Large Desktop */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-soft min-w-0 overflow-hidden">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
                  Total Documents
                </p>
                <p className="mt-1 text-base sm:text-lg lg:text-2xl font-bold text-slate-950 truncate">
                  {selectedProfile.documentCount}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-soft min-w-0 overflow-hidden">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
                  Invoice Orders
                </p>
                <p className="mt-1 text-base sm:text-lg lg:text-2xl font-bold text-slate-950 truncate">
                  {selectedProfile.invoiceCount}
                </p>
              </div>

              <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-3 sm:p-4 shadow-soft min-w-0 overflow-hidden">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-700 truncate">
                  Due Amount
                </p>
                <p className="mt-1 text-base sm:text-lg lg:text-2xl font-bold text-rose-600 truncate">
                  {formatCurrency(selectedProfile.dueAmount)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-soft min-w-0 overflow-hidden">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
                  Quoted Amount
                </p>
                <p className="mt-1 text-base sm:text-lg lg:text-2xl font-bold text-slate-950 truncate">
                  {formatCurrency(selectedProfile.quotedAmount)}
                </p>
              </div>
            </div>

            {/* 3. Business Financial & Volume Summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 mb-3.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                  <TrendingUp size={16} />
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-950">Business Summary</h3>
              </div>

              {/* Financial Metrics */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 min-w-0 overflow-hidden">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                    Invoice Total
                  </p>
                  <p className="mt-1 text-sm sm:text-base lg:text-lg font-bold text-slate-950 truncate">
                    {formatCurrency(selectedProfile.invoiceAmount)}
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 min-w-0 overflow-hidden">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 truncate">
                    Paid From Invoices
                  </p>
                  <p className="mt-1 text-sm sm:text-base lg:text-lg font-bold text-emerald-700 truncate">
                    {formatCurrency(selectedProfile.invoicePaidAmount)}
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 min-w-0 overflow-hidden sm:col-span-2 lg:col-span-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 truncate">
                    Money Receipts
                  </p>
                  <p className="mt-1 text-sm sm:text-base lg:text-lg font-bold text-emerald-700 truncate">
                    {formatCurrency(selectedProfile.receiptAmount)}
                  </p>
                </div>
              </div>

              {/* Document Counts */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3">
                <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3 text-center sm:text-left min-w-0 overflow-hidden">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase text-slate-500 truncate">
                    Quotations
                  </p>
                  <p className="mt-0.5 text-base sm:text-lg font-bold text-slate-950 truncate">
                    {selectedProfile.quotationCount}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3 text-center sm:text-left min-w-0 overflow-hidden">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase text-slate-500 truncate">
                    Receipts
                  </p>
                  <p className="mt-0.5 text-base sm:text-lg font-bold text-slate-950 truncate">
                    {selectedProfile.receiptCount}
                  </p>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 sm:p-3 text-center sm:text-left min-w-0 overflow-hidden">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase text-amber-800 truncate">
                    Skipped Dups
                  </p>
                  <p className="mt-0.5 text-base sm:text-lg font-bold text-amber-700 truncate">
                    {selectedProfile.duplicateReceiptCount}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Saved Client Records (Names, Phones, Creators, Addresses) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft min-w-0 overflow-hidden">
              <h3 className="text-base sm:text-lg font-bold text-slate-950 mb-3">Saved Client Records</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Names</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selectedProfile.names.map((value) => (
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800" key={value}>
                        {value}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Phone Numbers</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selectedProfile.phones.length ? selectedProfile.phones.map((value) => (
                      <a
                        className="rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 hover:bg-brand-100 transition"
                        href={`tel:${value}`}
                        key={value}
                      >
                        {value}
                      </a>
                    )) : <span className="text-xs text-slate-400">No phone saved</span>}
                  </div>
                </div>

                <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Created By</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selectedProfile.creatorNames.length ? selectedProfile.creatorNames.map((value) => (
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700" key={value}>
                        {value}
                      </span>
                    )) : <span className="text-xs text-slate-400">Unknown user</span>}
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Addresses</p>
                <div className="grid gap-1.5">
                  {selectedProfile.addresses.length ? selectedProfile.addresses.map((value) => (
                    <p className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs sm:text-sm text-slate-700 break-words" key={value}>
                      {value}
                    </p>
                  )) : <p className="text-xs text-slate-400 italic">No address saved</p>}
                </div>
              </div>
            </div>

            {/* 5. Due Invoices Section */}
            {dueInvoices.length ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50/20 p-4 sm:p-5 shadow-soft min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-100 text-rose-700">
                    <AlertCircle size={16} />
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-rose-950">
                    Due Invoices ({dueInvoices.length})
                  </h3>
                </div>
                <div className="grid gap-2">
                  {dueInvoices.map((invoice) => (
                    <button
                      className="flex flex-col gap-1.5 rounded-lg border border-rose-200 bg-white p-3 text-left transition hover:border-rose-300 hover:bg-rose-50/40 sm:flex-row sm:items-center sm:justify-between shadow-xs"
                      key={invoice.id || invoice.number}
                      onClick={() => openDocument(invoice)}
                      type="button"
                    >
                      <div className="min-w-0">
                        <span className="block font-bold text-slate-950 text-sm truncate">{invoice.number}</span>
                        <span className="text-xs text-slate-500">{getDocumentDate(invoice)}</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="text-xs font-semibold text-slate-500">Unpaid Due:</span>
                        <span className="font-bold text-rose-700 text-sm">{formatCurrency(getDueAmount(invoice))}</span>
                        <ChevronRight size={16} className="text-slate-400 hidden sm:block" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* 6. All Documents Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft min-w-0 overflow-hidden">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-950">
                    All Documents ({selectedProfile.documents.length})
                  </h3>
                  <p className="text-xs text-slate-500">Every saved quotation, invoice, and money receipt.</p>
                </div>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 self-start sm:self-auto">
                  {selectedProfile.documents.length} records
                </span>
              </div>

              {/* Mobile & Tablet Document Cards View (< lg) */}
              <div className="grid gap-2.5 lg:hidden">
                {selectedProfile.documents.map((document) => (
                  <div
                    className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 transition hover:bg-slate-50"
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
                      <span className="text-[11px] text-slate-500 shrink-0">
                        {getDocumentDate(document)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-md border border-slate-200 bg-white p-2 text-center text-xs">
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase text-slate-400 font-semibold truncate">Total</span>
                        <span className="font-bold text-slate-900 truncate block">
                          {formatCurrency(getDocumentAmount(document))}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase text-slate-400 font-semibold truncate">Paid</span>
                        <span className="font-bold text-emerald-700 truncate block">
                          {formatCurrency(getPaidAmount(document))}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase text-slate-400 font-semibold truncate">Due</span>
                        <span className="font-bold text-rose-600 truncate block">
                          {formatCurrency(getDueAmount(document))}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <Button
                        className="min-h-8 flex-1 justify-center py-1 text-xs"
                        onClick={() => openDocument(document)}
                        type="button"
                        variant="secondary"
                      >
                        <FileText size={13} aria-hidden="true" />
                        Open
                      </Button>
                      <Button
                        className="min-h-8 flex-1 justify-center py-1 text-xs"
                        onClick={() => openDocument(document, true)}
                        type="button"
                        variant="secondary"
                      >
                        <Copy size={13} aria-hidden="true" />
                        Copy
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Large Desktop Table View (>= lg) */}
              <div className="hidden lg:block overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Number</th>
                      <th className="px-3 py-3 text-right">Amount</th>
                      <th className="px-3 py-3 text-right">Paid</th>
                      <th className="px-3 py-3 text-right">Due</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedProfile.documents.map((document) => (
                      <tr className="align-top hover:bg-brand-50/40 transition" key={document.id || document.number}>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">{getDocumentDate(document)}</td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${getDocumentTypeBadge(document.type)}`}>
                            {document.type}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs font-mono font-bold text-slate-800">{document.number || '-'}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold text-slate-950">{formatCurrency(getDocumentAmount(document))}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold text-emerald-700">{formatCurrency(getPaidAmount(document))}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right text-xs font-bold text-rose-600">{formatCurrency(getDueAmount(document))}</td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Button className="min-h-8 px-2.5 py-1 text-xs" onClick={() => openDocument(document)} type="button" variant="secondary">
                              <FileText size={13} aria-hidden="true" />
                              Open
                            </Button>
                            <Button className="min-h-8 px-2.5 py-1 text-xs" onClick={() => openDocument(document, true)} type="button" variant="secondary">
                              <Copy size={13} aria-hidden="true" />
                              Copy
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid min-h-[380px] place-items-center text-center rounded-xl border border-slate-200 bg-white p-8 shadow-soft">
            <div>
              <SquarePen className="mx-auto text-brand-700" size={36} aria-hidden="true" />
              <h2 className="mt-3 text-lg sm:text-xl font-bold text-slate-950">No client data yet</h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                Save a quotation, invoice, or money receipt to build and view client profiles.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
