import { useMemo, useState } from 'react'
import { Plus, Printer, Trash2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import TextArea from '../components/TextArea.jsx'
import { defaultSettings } from '../data/defaultSettings.js'
import { loadCalculatorDraft, normalizeThicknessText } from '../utils/calculatorDraft.js'
import { createDocumentNumber, formatDocumentDate, getTodayInputDate } from '../utils/documentNumber.js'
import { saveDocument } from '../utils/documents.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { formatDecimal } from '../utils/formatNumber.js'
import { loadValue } from '../utils/storage.js'

function createItem(draft) {
  return {
    id: crypto.randomUUID(),
    description: normalizeThicknessText(draft?.description || ''),
    quantity: '2000',
    rate: draft?.rate ? formatDecimal(draft.rate) : ''
  }
}

function itemAmount(item) {
  const amount = Number(item.quantity || 0) * Number(item.rate || 0)
  return Number.isFinite(amount) ? amount : 0
}

export default function Quotation() {
  const location = useLocation()
  const draft = location.state?.calculatorDraft || loadCalculatorDraft()
  const [documentDate, setDocumentDate] = useState(getTodayInputDate())
  const [clientName, setClientName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [items, setItems] = useState(() => [createItem(draft)])
  const [discount, setDiscount] = useState('0.00')
  const [advancePercent, setAdvancePercent] = useState('40')
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState(defaultSettings.terms)
  const [saveStatus, setSaveStatus] = useState('')

  const documentNumber = useMemo(() => createDocumentNumber('PP-Q', documentDate), [documentDate])
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + itemAmount(item), 0), [items])
  const totalAmount = useMemo(() => {
    const nextTotal = subtotal - Number(discount || 0)
    return Number.isFinite(nextTotal) ? Math.max(nextTotal, 0) : 0
  }, [discount, subtotal])
  const advanceAmount = useMemo(() => {
    const nextAmount = totalAmount * (Number(advancePercent || 0) / 100)
    return Number.isFinite(nextAmount) ? nextAmount : 0
  }, [advancePercent, totalAmount])
  const readableDate = useMemo(() => formatDocumentDate(documentDate), [documentDate])
  const signatureImage = useMemo(() => loadValue('signaturePngDataUrl', ''), [])

  const updateItem = (id, field, value) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const formatItemRate = (id) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, rate: formatDecimal(item.rate) } : item))
    )
  }

  const addItem = () => {
    setItems((current) => [...current, createItem()])
  }

  const removeItem = (id) => {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : current))
  }

  const printQuotation = () => {
    window.print()
  }

  const saveQuotation = () => {
    saveDocument({
      type: 'Quotation',
      number: documentNumber,
      date: documentDate,
      displayDate: readableDate,
      clientName: clientName || 'Client Name',
      phone,
      address,
      items: items.map((item, index) => ({
        ...item,
        no: index + 1,
        amount: itemAmount(item)
      })),
      subtotal,
      discount: Number(discount || 0),
      totalAmount,
      advancePercent: Number(advancePercent || 0),
      advanceAmount,
      notes,
      terms
    })
    setSaveStatus(`${documentNumber} saved to History.`)
  }

  return (
    <div className="grid gap-5">
      {draft ? (
        <Card className="no-print border-brand-100 bg-brand-50">
          <p className="text-sm font-semibold text-brand-700">Auto-filled from Calculator</p>
          <p className="mt-1 text-sm text-slate-700">
            {draft.description} | Rate {formatCurrency(draft.rate)}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="no-print">
          <div className="mb-5 flex items-center gap-3">
            <img
              alt="Poly Pure"
              className="h-12 w-12 rounded-full border border-brand-100 bg-white object-contain"
              src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
            />
            <div>
              <p className="text-sm font-semibold text-brand-700">Phase 4</p>
              <h2 className="text-lg font-bold text-slate-950">Quotation Form</h2>
            </div>
          </div>

          <div className="grid gap-5">
            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">Document Details</h3>
              <div className="grid gap-3">
                <Input id="quotation-number" label="Quotation Number" readOnly value={documentNumber} />
                <Input
                  id="quotation-date"
                  label="Date"
                  onChange={(event) => setDocumentDate(event.target.value)}
                  type="date"
                  value={documentDate}
                />
              </div>
            </section>

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">Client Details</h3>
              <Input
                id="quotation-client"
                label="Client Name"
                onChange={(event) => setClientName(event.target.value)}
                value={clientName}
              />
              <Input
                id="quotation-phone"
                label="Phone Number"
                onChange={(event) => setPhone(event.target.value)}
                value={phone}
              />
              <TextArea
                id="quotation-address"
                label="Address"
                onChange={(event) => setAddress(event.target.value)}
                value={address}
              />
            </section>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-950">Quotation Items</h3>
              <Button className="min-h-10 px-3 py-2" onClick={addItem} type="button" variant="secondary">
                <Plus size={16} aria-hidden="true" />
                Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={item.id}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-700">Item {index + 1}</p>
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={items.length === 1}
                    onClick={() => removeItem(item.id)}
                    title="Remove item"
                    type="button"
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
                <div className="grid gap-3">
                  <Input
                    id={`quotation-item-${item.id}`}
                    label="Type / Size Description"
                    onChange={(event) => updateItem(item.id, 'description', event.target.value)}
                    value={item.description}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      id={`quotation-quantity-${item.id}`}
                      label="Quantity"
                      min="0"
                      onChange={(event) => updateItem(item.id, 'quantity', event.target.value)}
                      type="number"
                      value={item.quantity}
                    />
                    <Input
                      id={`quotation-rate-${item.id}`}
                      label="Rate"
                      min="0"
                      onBlur={() => formatItemRate(item.id)}
                      onChange={(event) => updateItem(item.id, 'rate', event.target.value)}
                      step="0.01"
                      type="number"
                      value={item.rate}
                    />
                    <Input
                      className="sm:col-span-2"
                      id={`quotation-amount-${item.id}`}
                      label="Amount"
                      readOnly
                      type="number"
                      value={formatDecimal(itemAmount(item))}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5">
            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">Totals</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input id="quotation-subtotal" label="Subtotal" readOnly type="number" value={formatDecimal(subtotal)} />
                <Input
                  id="quotation-discount"
                  label="Discount"
                  min="0"
                  onBlur={() => setDiscount(formatDecimal(discount))}
                  onChange={(event) => setDiscount(event.target.value)}
                  step="0.01"
                  type="number"
                  value={discount}
                />
                <Input id="quotation-total" label="Total Amount" readOnly type="number" value={formatDecimal(totalAmount)} />
                <Input
                  id="quotation-advance-percent"
                  label="Advance Payment (%)"
                  min="0"
                  onBlur={() => setAdvancePercent(formatDecimal(advancePercent, 0))}
                  onChange={(event) => setAdvancePercent(event.target.value)}
                  step="1"
                  type="number"
                  value={advancePercent}
                />
                <Input
                  className="sm:col-span-2"
                  id="quotation-advance-amount"
                  label="Advance Amount"
                  readOnly
                  type="number"
                  value={formatDecimal(advanceAmount)}
                />
              </div>
            </section>

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">Notes and Terms</h3>
              <TextArea
                id="quotation-notes"
                label="Notes"
                onChange={(event) => setNotes(event.target.value)}
                value={notes}
              />
              <TextArea
                id="quotation-terms"
                label="Terms and Conditions"
                onChange={(event) => setTerms(event.target.value)}
                value={terms}
              />
            </section>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button onClick={printQuotation} type="button">
              <Printer size={18} aria-hidden="true" />
              Print Quotation
            </Button>
            <Button onClick={saveQuotation} type="button" variant="secondary">
              Save Quotation
            </Button>
            <Button disabled variant="secondary">
              PDF Later
            </Button>
          </div>
          {saveStatus ? (
            <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{saveStatus}</p>
          ) : null}
        </Card>

        <Card className="print-area bg-white p-0">
          <div className="quotation-sheet overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="h-2 bg-brand-600" />
            <div className="px-5 pb-5 pt-4">
              <div className="flex flex-col gap-3 border-b border-brand-100 pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <img
                    alt="Poly Pure"
                    className="h-14 w-14 rounded-full border border-brand-100 bg-white object-contain shadow-sm"
                    src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
                  />
                  <div>
                    <p className="text-xl font-bold text-slate-950">{defaultSettings.companyName}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                      Printing and Packaging
                    </p>
                    <div className="mt-1 grid gap-0.5 text-[10px] leading-4 text-slate-500">
                      <span>Phone: {defaultSettings.phone}</span>
                      <span>Email: {defaultSettings.email} | Website: {defaultSettings.website}</span>
                      <span>{defaultSettings.address}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-left sm:text-right">
                  <p className="text-2xl font-bold uppercase text-brand-700">Quotation</p>
                  <p className="mt-1 text-xs font-bold text-slate-900">{documentNumber}</p>
                  <p className="text-xs text-slate-600">{readableDate}</p>
                </div>
              </div>

              <div className="grid gap-3 py-3">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">Quotation For</p>
                  <p className="mt-1.5 text-base font-bold text-slate-950">{clientName || 'Client Name'}</p>
                  <p className="text-xs text-slate-600">{phone || 'Phone Number'}</p>
                  <p className="whitespace-pre-line text-xs leading-4 text-slate-600">{address || 'Client Address'}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[30px_minmax(0,1fr)_65px_90px_105px] bg-brand-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white">
                  <span>No</span>
                  <span>Description</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Rate</span>
                  <span className="text-right">Amount</span>
                </div>
                {items.map((item, index) => (
                  <div
                    className="grid min-h-12 grid-cols-[30px_minmax(0,1fr)_65px_90px_105px] items-start border-t border-slate-100 px-3 py-2 text-xs text-slate-800"
                    key={item.id}
                  >
                    <span>{index + 1}</span>
                    <span className="pr-3 font-semibold leading-5">
                      {normalizeThicknessText(item.description) || 'Item description'}
                    </span>
                    <span className="text-right font-semibold">{item.quantity || '0'}</span>
                    <span className="text-right">{formatCurrency(item.rate)}</span>
                    <span className="text-right font-bold">{formatCurrency(itemAmount(item))}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-3">
                {notes ? (
                  <div className="rounded-lg bg-slate-50 p-3 text-xs">
                    <p className="font-bold text-slate-950">Notes</p>
                    <p className="mt-1 whitespace-pre-line text-slate-600">{notes}</p>
                  </div>
                ) : null}

                <div className="quotation-payment-total-grid grid gap-3">
                  <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-xs">
                    <p className="font-bold text-slate-950">Payment Method</p>
                    <p className="mt-1 whitespace-pre-line text-[10px] leading-4 text-slate-700">
                      {defaultSettings.paymentMethod}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="grid gap-2 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-semibold text-slate-950">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Discount</span>
                        <span className="font-semibold text-slate-950">{formatCurrency(discount)}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 text-sm">
                        <span className="font-bold text-slate-950">Grand Total</span>
                        <span className="font-bold text-brand-700">{formatCurrency(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between gap-4 rounded-md border border-brand-100 bg-brand-50 px-2 py-1">
                        <span className="font-semibold text-brand-700">
                          Advance ({Number(advancePercent || 0).toFixed(0)}%)
                        </span>
                        <span className="font-bold text-brand-700">{formatCurrency(advanceAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-xs">
                  <p className="font-bold text-slate-950">Terms and Conditions</p>
                  <p className="quotation-terms mt-1 whitespace-pre-line text-[9px] leading-[1.45] text-slate-600">
                    {terms}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div className="text-[10px] text-slate-500">
                  <p className="font-semibold text-slate-700">Thank you for your business.</p>
                  <p className="mt-1">This quotation is prepared for review and confirmation.</p>
                </div>
                <div className="flex justify-end">
                  {signatureImage ? (
                    <div className="w-44 text-center">
                      <div className="flex h-16 items-end justify-center border-b-2 border-slate-400 pb-1">
                        <img alt="Authorized signature" className="max-h-14 w-auto object-contain" src={signatureImage} />
                      </div>
                      <div className="pt-2 text-xs font-semibold text-slate-700">Authorized Signature</div>
                    </div>
                  ) : (
                    <div className="w-44 border-t-2 border-slate-400 pt-2 text-center text-xs font-semibold text-slate-700">
                      Authorized Signature
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
