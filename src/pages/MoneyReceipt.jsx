import { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import TextArea from '../components/TextArea.jsx'
import { defaultSettings } from '../data/defaultSettings.js'
import { loadCalculatorDraft, normalizeThicknessText } from '../utils/calculatorDraft.js'
import { createDocumentNumber, formatDocumentDate, getTodayInputDate } from '../utils/documentNumber.js'
import { saveDocument } from '../utils/documents.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { formatDecimal } from '../utils/formatNumber.js'

export default function MoneyReceipt() {
  const location = useLocation()
  const draft = location.state?.calculatorDraft || loadCalculatorDraft()
  const [documentDate, setDocumentDate] = useState(getTodayInputDate())
  const [clientName, setClientName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [receivedAmount, setReceivedAmount] = useState(draft?.totalAmount ? formatDecimal(draft.totalAmount) : '')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [workDetails, setWorkDetails] = useState(draft?.description ? normalizeThicknessText(draft.description) : '')
  const [notes, setNotes] = useState('')
  const [saveStatus, setSaveStatus] = useState('')

  const documentNumber = useMemo(() => createDocumentNumber('PP-R', documentDate), [documentDate])
  const readableDate = useMemo(() => formatDocumentDate(documentDate), [documentDate])

  const printReceipt = () => {
    window.print()
  }

  const saveReceipt = () => {
    saveDocument({
      type: 'Money Receipt',
      number: documentNumber,
      date: documentDate,
      displayDate: readableDate,
      clientName: clientName || 'Client Name',
      phone,
      address,
      receivedAmount: Number(receivedAmount || 0),
      totalAmount: Number(receivedAmount || 0),
      paymentMethod,
      workDetails,
      notes
    })
    setSaveStatus(`${documentNumber} saved to History.`)
  }

  return (
    <div className="grid gap-5">
      {draft ? (
        <Card className="no-print border-brand-100 bg-brand-50">
          <p className="text-sm font-semibold text-brand-700">Auto-filled from Calculator</p>
          <p className="mt-1 text-sm text-slate-700">
            {normalizeThicknessText(draft.description)} | Amount {formatCurrency(draft.totalAmount)}
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
              <p className="text-sm font-semibold text-brand-700">Phase 6</p>
              <h2 className="text-lg font-bold text-slate-950">Money Receipt Form</h2>
            </div>
          </div>

          <div className="grid gap-5">
            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">Receipt Details</h3>
              <Input id="receipt-number" label="Receipt Number" readOnly value={documentNumber} />
              <Input
                id="receipt-date"
                label="Date"
                onChange={(event) => setDocumentDate(event.target.value)}
                type="date"
                value={documentDate}
              />
            </section>

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">Client Details</h3>
              <Input
                id="receipt-client"
                label="Client Name"
                onChange={(event) => setClientName(event.target.value)}
                value={clientName}
              />
              <Input id="receipt-phone" label="Phone Number" onChange={(event) => setPhone(event.target.value)} value={phone} />
              <TextArea id="receipt-address" label="Address" onChange={(event) => setAddress(event.target.value)} value={address} />
            </section>

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">Payment Details</h3>
              <Input
                id="receipt-amount"
                label="Received Amount"
                min="0"
                onBlur={() => setReceivedAmount(formatDecimal(receivedAmount))}
                onChange={(event) => setReceivedAmount(event.target.value)}
                step="0.01"
                type="number"
                value={receivedAmount}
              />
              <Select
                id="receipt-payment-method"
                label="Payment Method"
                onChange={(event) => setPaymentMethod(event.target.value)}
                value={paymentMethod}
              >
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Mobile Banking</option>
                <option>Cheque</option>
              </Select>
              <Input
                id="receipt-work"
                label="For Invoice / Work Details"
                onChange={(event) => setWorkDetails(event.target.value)}
                value={workDetails}
              />
              <TextArea id="receipt-notes" label="Notes" onChange={(event) => setNotes(event.target.value)} value={notes} />
            </section>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button onClick={printReceipt} type="button">
              <Printer size={18} aria-hidden="true" />
              Print Receipt
            </Button>
            <Button onClick={saveReceipt} type="button" variant="secondary">
              Save Receipt
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Printing and Packaging</p>
                    <div className="mt-1 grid gap-0.5 text-[10px] leading-4 text-slate-500">
                      <span>Phone: {defaultSettings.phone}</span>
                      <span>Email: {defaultSettings.email} | Website: {defaultSettings.website}</span>
                      <span>{defaultSettings.address}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-left sm:text-right">
                  <p className="text-2xl font-bold uppercase text-brand-700">Money Receipt</p>
                  <p className="mt-1 text-xs font-bold text-slate-900">{documentNumber}</p>
                  <p className="text-xs text-slate-600">{readableDate}</p>
                </div>
              </div>

              <div className="grid gap-3 py-3 lg:grid-cols-[1fr_260px]">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">Received From</p>
                  <p className="mt-1.5 text-base font-bold text-slate-950">{clientName || 'Client Name'}</p>
                  <p className="text-xs text-slate-600">{phone || 'Phone Number'}</p>
                  <p className="whitespace-pre-line text-xs leading-4 text-slate-600">{address || 'Client Address'}</p>
                </div>
                <div className="rounded-lg bg-brand-600 p-3 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-85">Received Amount</p>
                  <p className="mt-1 text-2xl font-bold">{formatCurrency(receivedAmount)}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[1fr_160px] bg-brand-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white">
                  <span>For Invoice / Work Details</span>
                  <span className="text-right">Payment Method</span>
                </div>
                <div className="grid min-h-20 grid-cols-[1fr_160px] items-start px-3 py-3 text-xs text-slate-800">
                  <span className="pr-3 font-semibold leading-5">{workDetails || 'Work details'}</span>
                  <span className="text-right font-bold">{paymentMethod}</span>
                </div>
              </div>

              <div className="mt-3 grid gap-3">
                {notes ? (
                  <div className="rounded-lg bg-slate-50 p-3 text-xs">
                    <p className="font-bold text-slate-950">Notes</p>
                    <p className="mt-1 whitespace-pre-line text-slate-600">{notes}</p>
                  </div>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
                  <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-xs">
                    <p className="font-bold text-slate-950">Company Payment Details</p>
                    <p className="mt-1 whitespace-pre-line text-[10px] leading-4 text-slate-700">
                      {defaultSettings.paymentMethod}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="grid gap-2 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Receipt Number</span>
                        <span className="font-semibold text-slate-950">{documentNumber}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Date</span>
                        <span className="font-semibold text-slate-950">{readableDate}</span>
                      </div>
                      <div className="flex justify-between gap-4 rounded-md border border-brand-100 bg-brand-50 px-2 py-1">
                        <span className="font-semibold text-brand-700">Received</span>
                        <span className="font-bold text-brand-700">{formatCurrency(receivedAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3 text-xs">
                  <p className="font-bold text-slate-950">Acknowledgement</p>
                  <p className="mt-1 text-slate-600">
                    Received the above amount for the mentioned invoice or work details. This money receipt is valid
                    subject to payment confirmation.
                  </p>
                </div>
              </div>

              <div className="mt-10 grid gap-6 sm:grid-cols-2">
                <div className="text-[10px] text-slate-500">
                  <p className="font-semibold text-slate-700">Thank you for your payment.</p>
                  <p className="mt-1">Please keep this receipt for your records.</p>
                </div>
                <div className="flex justify-end">
                  <div className="w-44 border-t-2 border-slate-400 pt-2 text-center text-xs font-semibold text-slate-700">
                    Authorized Signature
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
