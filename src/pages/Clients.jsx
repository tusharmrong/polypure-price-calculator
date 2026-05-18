import { Copy, FileText, Search, SquarePen } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
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
    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card className="xl:sticky xl:top-24 xl:self-start">
        <div className="mb-4">
          <p className="text-sm font-semibold text-brand-700">Client Records</p>
          <h2 className="text-2xl font-bold text-slate-950">Clients</h2>
          <p className="mt-1 text-sm text-slate-500">Built from saved quotations, invoices, and money receipts.</p>
        </div>

        <Input
          id="client-search"
          label="Search client"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, phone, address, or document number"
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
                    ? 'border-brand-200 bg-brand-50 text-brand-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-100 hover:bg-brand-50/50'
                }`}
                key={profile.key}
                onClick={() => setSelectedKey(profile.key)}
                type="button"
              >
                <span className="block text-base font-bold text-slate-950">{profile.clientName}</span>
                <span className="mt-1 block text-sm text-slate-500">{profile.phone || 'No phone saved'}</span>
                <span className="mt-2 flex items-center justify-between text-xs font-semibold">
                  <span>{profile.documentCount} docs</span>
                  <span>{formatCurrency(profile.lifetimeReceived)} received</span>
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

      <div className="min-w-0">
        {selectedProfile ? (
          <div className="grid gap-5">
            <Card>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-brand-700">Client Profile</p>
                  <h2 className="text-2xl font-bold text-slate-950">{selectedProfile.clientName}</h2>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600">
                    <p><span className="font-semibold text-slate-900">Phone:</span> {selectedProfile.phone || '-'}</p>
                    <p><span className="font-semibold text-slate-900">Address:</span> {selectedProfile.address || '-'}</p>
                    <p><span className="font-semibold text-slate-900">Last document:</span> {selectedProfile.lastDocument?.type || '-'} {selectedProfile.lastDocument?.number || ''}</p>
                  </div>
                </div>
                <div className="grid gap-2 rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm">
                  <span className="font-semibold text-brand-700">Lifetime Received</span>
                  <span className="text-2xl font-bold text-brand-700">{formatCurrency(selectedProfile.lifetimeReceived)}</span>
                  <span className="text-xs text-slate-500">Invoice paid amount + non-duplicate money receipts</span>
                </div>
              </div>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Total Documents</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{selectedProfile.documentCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Invoice Orders</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{selectedProfile.invoiceCount}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Due Amount</p>
                <p className="mt-1 text-2xl font-bold text-brand-700">{formatCurrency(selectedProfile.dueAmount)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Quoted Amount</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">{formatCurrency(selectedProfile.quotedAmount)}</p>
              </Card>
            </div>

            <Card>
              <h3 className="text-lg font-bold text-slate-950">Business Summary</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Invoice Total</p>
                  <p className="mt-1 text-xl font-bold text-slate-950">{formatCurrency(selectedProfile.invoiceAmount)}</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold uppercase text-emerald-700">Paid From Invoices</p>
                  <p className="mt-1 text-xl font-bold text-emerald-700">{formatCurrency(selectedProfile.invoicePaidAmount)}</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold uppercase text-emerald-700">Money Receipts</p>
                  <p className="mt-1 text-xl font-bold text-emerald-700">{formatCurrency(selectedProfile.receiptAmount)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Quotations</p>
                  <p className="mt-1 text-xl font-bold text-slate-950">{selectedProfile.quotationCount}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Receipts</p>
                  <p className="mt-1 text-xl font-bold text-slate-950">{selectedProfile.receiptCount}</p>
                </div>
                <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase text-amber-700">Duplicate Receipts Skipped</p>
                  <p className="mt-1 text-xl font-bold text-amber-700">{selectedProfile.duplicateReceiptCount}</p>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-bold text-slate-950">Saved Client Details</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Names</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedProfile.names.map((value) => (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700" key={value}>{value}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Phone Numbers</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedProfile.phones.length ? selectedProfile.phones.map((value) => (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700" key={value}>{value}</span>
                    )) : <span className="text-sm text-slate-500">No phone saved</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Created By</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedProfile.creatorNames.length ? selectedProfile.creatorNames.map((value) => (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700" key={value}>{value}</span>
                    )) : <span className="text-sm text-slate-500">Unknown user</span>}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-bold uppercase text-slate-500">Addresses</p>
                <div className="mt-2 grid gap-2">
                  {selectedProfile.addresses.length ? selectedProfile.addresses.map((value) => (
                    <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" key={value}>{value}</p>
                  )) : <p className="text-sm text-slate-500">No address saved</p>}
                </div>
              </div>
            </Card>

            {dueInvoices.length ? (
              <Card>
                <h3 className="text-lg font-bold text-slate-950">Due Invoices</h3>
                <div className="mt-3 grid gap-2">
                  {dueInvoices.map((invoice) => (
                    <button
                      className="flex flex-col gap-1 rounded-lg border border-brand-100 bg-brand-50 px-3 py-3 text-left hover:border-brand-200 sm:flex-row sm:items-center sm:justify-between"
                      key={invoice.id || invoice.number}
                      onClick={() => openDocument(invoice)}
                      type="button"
                    >
                      <span>
                        <span className="block font-bold text-slate-950">{invoice.number}</span>
                        <span className="text-sm text-slate-500">{getDocumentDate(invoice)}</span>
                      </span>
                      <span className="font-bold text-brand-700">{formatCurrency(getDueAmount(invoice))}</span>
                    </button>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">All Documents</h3>
                  <p className="text-sm text-slate-500">Every saved document connected to this client.</p>
                </div>
                <Search className="hidden text-brand-700 sm:block" size={22} aria-hidden="true" />
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-[860px] w-full text-left text-sm">
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
                      <tr className="align-top hover:bg-brand-50/40" key={document.id || document.number}>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">{getDocumentDate(document)}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-950">{document.type}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-700">{document.number || '-'}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-slate-950">{formatCurrency(getDocumentAmount(document))}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-emerald-700">{formatCurrency(getPaidAmount(document))}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-brand-700">{formatCurrency(getDueAmount(document))}</td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-2">
                            <Button className="min-h-8 px-2.5 py-1.5 text-xs" onClick={() => openDocument(document)} type="button" variant="secondary">
                              <FileText size={14} aria-hidden="true" />
                              Open
                            </Button>
                            <Button className="min-h-8 px-2.5 py-1.5 text-xs" onClick={() => openDocument(document, true)} type="button" variant="secondary">
                              <Copy size={14} aria-hidden="true" />
                              Copy
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="grid min-h-[420px] place-items-center text-center">
            <div>
              <SquarePen className="mx-auto text-brand-700" size={34} aria-hidden="true" />
              <h2 className="mt-3 text-xl font-bold text-slate-950">No client data yet</h2>
              <p className="mt-1 text-sm text-slate-500">Save a quotation, invoice, or money receipt to build client profiles.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
