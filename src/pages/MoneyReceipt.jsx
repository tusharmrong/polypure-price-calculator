import {
  Copy,
  Eye,
  FileDown,
  FileEdit,
  RotateCcw,
  Save
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import ClientSuggestions from '../components/ClientSuggestions.jsx'
import DocumentPreviewModal from '../components/DocumentPreviewModal.jsx'
import Input from '../components/Input.jsx'
import Select from '../components/Select.jsx'
import TextArea from '../components/TextArea.jsx'
import { loadCalculatorDraft, normalizeThicknessText } from '../utils/calculatorDraft.js'
import { loadCompanySettings } from '../utils/companySettings.js'
import { createDocumentNumber, formatDocumentDate, getTodayInputDate } from '../utils/documentNumber.js'
import { saveDocument } from '../utils/documents.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { formatDecimal } from '../utils/formatNumber.js'
import { numberToWords } from '../utils/numberToWords.js'
import { loadSignatureImage } from '../utils/signature.js'
import { useUiLanguage } from '../utils/uiLanguage.js'
import { clearFormDraft, loadFormDraft, saveFormDraft } from '../utils/formDrafts.js'
import { printWithFileName } from '../utils/pdf.js'
import { useToast } from '../utils/toast.jsx'
import { useUnsavedChangesGuard } from '../utils/useUnsavedChangesGuard.js'
import { useAuth } from '../utils/authContext.jsx'
import { matchClientSuggestion, useClientSuggestions } from '../utils/clientSuggestions.js'

export default function MoneyReceipt() {
  const { language } = useUiLanguage()
  const isBn = language === 'bn'
  const { showToast } = useToast()
  const { currentUser } = useAuth()
  const location = useLocation()
  const draft = location.state?.calculatorDraft || loadCalculatorDraft()
  const companySettings = useMemo(() => loadCompanySettings(), [])
  const prefill = location.state?.prefillDocument
  const savedDraft = useMemo(() => (prefill ? null : loadFormDraft('moneyReceipt', null)), [prefill])
  const initialDate = prefill?.date || savedDraft?.documentDate || getTodayInputDate()
  const [documentDate, setDocumentDate] = useState(initialDate)
  const [receivedDate, setReceivedDate] = useState(prefill?.receivedDate || savedDraft?.receivedDate || initialDate)
  const [documentNumber, setDocumentNumber] = useState(
    prefill?.number || savedDraft?.documentNumber || createDocumentNumber('PP-R', initialDate)
  )
  const [editingDocumentId, setEditingDocumentId] = useState(prefill?.id || savedDraft?.editingDocumentId || '')
  const [clientName, setClientName] = useState(prefill?.clientName || savedDraft?.clientName || '')
  const [phone, setPhone] = useState(prefill?.phone || savedDraft?.phone || '')
  const [address, setAddress] = useState(prefill?.address || savedDraft?.address || '')
  const [receivedAmount, setReceivedAmount] = useState(
    prefill?.receivedAmount || (draft?.totalAmount ? formatDecimal(draft.totalAmount) : '') || savedDraft?.receivedAmount || ''
  )
  const [paymentMethod, setPaymentMethod] = useState(prefill?.paymentMethod || savedDraft?.paymentMethod || 'Cash')
  const [workDetails, setWorkDetails] = useState(
    prefill?.workDetails || (draft?.description ? normalizeThicknessText(draft.description) : '') || savedDraft?.workDetails || ''
  )
  const [notes, setNotes] = useState(prefill?.notes || savedDraft?.notes || '')
  const [saveStatus, setSaveStatus] = useState('')
  const [formError, setFormError] = useState('')
  const [baselineFingerprint, setBaselineFingerprint] = useState('')
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const clientSuggestions = useClientSuggestions()

  const readableDate = useMemo(() => formatDocumentDate(documentDate), [documentDate])
  const readableReceivedDate = useMemo(() => formatDocumentDate(receivedDate), [receivedDate])
  const signatureImage = useMemo(() => loadSignatureImage(), [])
  const formFingerprint = useMemo(
    () =>
      JSON.stringify({
        documentDate,
        receivedDate,
        documentNumber,
        editingDocumentId,
        clientName,
        phone,
        address,
        receivedAmount,
        paymentMethod,
        workDetails,
        notes
      }),
    [address, clientName, documentDate, documentNumber, editingDocumentId, notes, paymentMethod, phone, receivedAmount, receivedDate, workDetails]
  )
  const isDirty = baselineFingerprint !== '' && baselineFingerprint !== formFingerprint

  useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    saveFormDraft('moneyReceipt', {
      documentDate,
      receivedDate,
      documentNumber,
      editingDocumentId,
      clientName,
      phone,
      address,
      receivedAmount,
      paymentMethod,
      workDetails,
      notes
    })
  }, [address, clientName, documentDate, documentNumber, editingDocumentId, notes, paymentMethod, phone, receivedAmount, receivedDate, workDetails])

  useEffect(() => {
    if (!editingDocumentId) {
      setDocumentNumber(createDocumentNumber('PP-R', documentDate))
    }
  }, [documentDate, editingDocumentId])

  useEffect(() => {
    if (!baselineFingerprint) {
      setBaselineFingerprint(formFingerprint)
    }
  }, [baselineFingerprint, formFingerprint])

  const applyClientSuggestion = (client) => {
    setClientName(client.clientName || '')
    setPhone(client.phone || '')
    setAddress(client.address || '')
    showToast('Client details filled from previous document.', 'success')
  }

  const handleClientNameChange = (event) => {
    const value = event.target.value
    setClientName(value)
    const matchedClient = matchClientSuggestion(clientSuggestions, value)
    if (matchedClient) applyClientSuggestion(matchedClient)
  }

  const handlePhoneChange = (event) => {
    const value = event.target.value
    setPhone(value)
    const matchedClient = matchClientSuggestion(clientSuggestions, value)
    if (matchedClient) applyClientSuggestion(matchedClient)
  }

  const saveReceipt = async () => {
    const error = validateReceipt()
    if (error) {
      setFormError(error)
      showToast(error, 'error')
      return
    }
    setFormError('')
    const savedDocument = await saveDocument({
      id: editingDocumentId || undefined,
      type: 'Money Receipt',
      number: documentNumber,
      date: documentDate,
      displayDate: readableDate,
      receivedDate,
      displayReceivedDate: readableReceivedDate,
      clientName: clientName || 'Client Name',
      phone,
      address,
      receivedAmount: Number(receivedAmount || 0),
      totalAmount: Number(receivedAmount || 0),
      paymentMethod,
      workDetails,
      notes
    }, currentUser)
    setEditingDocumentId(savedDocument.id)
    setSaveStatus(`${documentNumber} saved to History.`)
    setBaselineFingerprint('')
    showToast('Money receipt saved successfully.', 'success')
  }

  const saveReceiptAsCopy = async () => {
    const error = validateReceipt()
    if (error) {
      setFormError(error)
      showToast(error, 'error')
      return
    }
    setFormError('')
    const copyNumber = createDocumentNumber('PP-R', documentDate)
    const savedDocument = await saveDocument({
      type: 'Money Receipt',
      number: copyNumber,
      date: documentDate,
      displayDate: readableDate,
      receivedDate,
      displayReceivedDate: readableReceivedDate,
      clientName: clientName || 'Client Name',
      phone,
      address,
      receivedAmount: Number(receivedAmount || 0),
      totalAmount: Number(receivedAmount || 0),
      paymentMethod,
      workDetails,
      notes
    }, currentUser)
    setDocumentNumber(copyNumber)
    setEditingDocumentId(savedDocument.id)
    setSaveStatus(`${copyNumber} saved as a new copy.`)
    setBaselineFingerprint('')
    showToast('Money receipt copy saved.', 'success')
  }

  const validateReceipt = () => {
    if (!clientName.trim()) return 'Please enter client name.'
    if (Number(receivedAmount || 0) <= 0) return 'Received amount must be greater than zero.'
    if (!workDetails.trim()) return 'Please enter invoice or work details.'
    return ''
  }

  const savePdfReceipt = async () => {
    const error = validateReceipt()
    if (error) {
      setFormError(error)
      showToast(error, 'error')
      return
    }
    setFormError('')
    await saveReceipt()
    printWithFileName({
      clientName: clientName || 'Client',
      documentNumber,
      type: 'Money-Receipt'
    })
    showToast('PDF save window opened.', 'success')
  }

  const resetReceiptForm = () => {
    const today = getTodayInputDate()
    setDocumentDate(today)
    setReceivedDate(today)
    setDocumentNumber(createDocumentNumber('PP-R', today))
    setEditingDocumentId('')
    setClientName('')
    setPhone('')
    setAddress('')
    setReceivedAmount('')
    setPaymentMethod('Cash')
    setWorkDetails('')
    setNotes('')
    setSaveStatus('')
    setFormError('')
    setBaselineFingerprint('')
    clearFormDraft('moneyReceipt')
    showToast('Money receipt form reset.', 'success')
  }

  const renderMoneyReceiptSheetContent = () => (
    <div className="quotation-sheet overflow-hidden rounded-lg border border-slate-200 bg-white lg:w-full lg:max-w-none">
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
              <p className="text-xl font-bold text-slate-950">{companySettings.companyName}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Printing and Packaging</p>
              <div className="mt-1 grid gap-0.5 text-[10px] leading-4 text-slate-500">
                <span>Phone: {companySettings.phone}</span>
                <span>Email: {companySettings.email} | Website: {companySettings.website}</span>
                <span>{companySettings.address}</span>
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

          <div className="grid gap-3">
            <div className="rounded-lg border border-slate-200 p-3 lg:ml-auto lg:w-[260px]">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Receipt Number</span>
                  <span className="font-semibold text-slate-950">{documentNumber}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Money Receipt Date</span>
                  <span className="font-semibold text-slate-950">{formatDocumentDate(receivedDate)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 text-sm font-bold">
                  <span className="text-slate-950">Total Received</span>
                  <span className="text-brand-700">{formatCurrency(receivedAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Amount in Words (কথায়) */}
          {Number(receivedAmount || 0) > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-3.5 py-2 text-xs text-slate-800">
              <span className="font-bold text-slate-900">{isBn ? 'কথায়: ' : 'In Words: '}</span>
              <span className="italic font-semibold text-brand-900">{numberToWords(receivedAmount, isBn ? 'bn' : 'en')}</span>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="text-[10px] text-slate-500">
            <p className="font-semibold text-slate-700">Thank you for your payment.</p>
            <p className="mt-1">This receipt confirms that payment was received for the stated details.</p>
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
  )

  return (
    <div className="grid gap-5 lg:h-[calc(100vh-6rem)] lg:min-h-0 lg:overflow-hidden">
      <div className="grid gap-5 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.98fr)] xl:grid-cols-[minmax(0,1.24fr)_minmax(0,0.96fr)]">
        <Card className="no-print relative z-10 lg:h-full lg:min-h-0 lg:overflow-y-auto">
          <div className="mb-5 flex items-center gap-3">
            <img
              alt="Poly Pure"
              className="h-12 w-12 rounded-full border border-brand-100 bg-white object-contain"
              src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
            />
            <div>
              <h2 className="text-lg font-bold text-slate-950">{isBn ? 'মানি রিসিপ্ট ফর্ম' : 'Money Receipt Form'}</h2>
            </div>
          </div>

          <div className="grid gap-5">
            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">{isBn ? 'রিসিপ্ট বিস্তারিত' : 'Receipt Details'}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <Input id="receipt-number" label={isBn ? '????????????????????? ???????????????' : 'Receipt Number'} readOnly value={documentNumber} />
                <Input
                  id="receipt-document-date"
                  label={isBn ? '??????????????? ??????????????? ?????????' : 'Money Receipt Date'}
                  onChange={(event) => setDocumentDate(event.target.value)}
                  type="date"
                  value={documentDate}
                />
                <Input
                  className="md:col-span-2"
                  id="receipt-received-date"
                  label={isBn ? '??????????????? ?????????' : 'Received Date'}
                  onChange={(event) => setReceivedDate(event.target.value)}
                  type="date"
                  value={receivedDate}
                />
              </div>
            </section>

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">{isBn ? 'ক্লায়েন্ট বিস্তারিত' : 'Client Details'}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  id="receipt-client"
                  label={isBn ? 'ক্লায়েন্টের নাম' : 'Client Name'}
                  list="receipt-client-suggestions"
                  onChange={handleClientNameChange}
                  value={clientName}
                />
                <datalist id="receipt-client-suggestions">
                  {clientSuggestions.map((client) => (
                    <option key={client.id} value={client.clientName}>
                      {client.phone || client.address || client.lastDocumentNumber}
                    </option>
                  ))}
                </datalist>
                <Input
                  id="receipt-phone"
                  label={isBn ? 'ফোন নম্বর' : 'Phone Number'}
                  list="receipt-phone-suggestions"
                  onChange={handlePhoneChange}
                  value={phone}
                />
                <datalist id="receipt-phone-suggestions">
                  {clientSuggestions
                    .filter((client) => client.phone)
                    .map((client) => (
                      <option key={client.id} value={client.phone}>
                        {client.clientName}
                      </option>
                    ))}
                </datalist>
                <TextArea className="md:col-span-2" id="receipt-address" label={isBn ? 'ঠিকানা' : 'Address'} onChange={(event) => setAddress(event.target.value)} value={address} />
                <ClientSuggestions
                  onSelect={applyClientSuggestion}
                  query={`${clientName} ${phone}`}
                  suggestions={clientSuggestions}
                />
              </div>
            </section>

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">{isBn ? 'পেমেন্ট বিস্তারিত' : 'Payment Details'}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  id="receipt-amount"
                  label={isBn ? 'প্রাপ্ত টাকার পরিমাণ' : 'Received Amount'}
                  min="0"
                  onBlur={() => setReceivedAmount(formatDecimal(receivedAmount))}
                  onChange={(event) => setReceivedAmount(event.target.value)}
                  step="0.01"
                  type="number"
                  value={receivedAmount}
                />
                <Select
                  id="receipt-payment-method"
                  label={isBn ? 'পেমেন্ট মেথড' : 'Payment Method'}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  value={paymentMethod}
                >
                  <option>{isBn ? 'নগদ (Cash)' : 'Cash'}</option>
                  <option>{isBn ? 'ব্যাংক ট্রান্সফার' : 'Bank Transfer'}</option>
                  <option>{isBn ? 'মোবাইল ব্যাংকিং (বিকাশ/নগদ)' : 'Mobile Banking'}</option>
                  <option>{isBn ? 'চেক (Cheque)' : 'Cheque'}</option>
                </Select>
                <Input
                  className="md:col-span-2"
                  id="receipt-work"
                  label={isBn ? 'ইনভয়েস বা কাজের বিবরণ' : 'For Invoice / Work Details'}
                  onChange={(event) => setWorkDetails(event.target.value)}
                  value={workDetails}
                />
                <TextArea className="md:col-span-2" id="receipt-notes" label={isBn ? 'নোট / মন্তব্য' : 'Notes'} onChange={(event) => setNotes(event.target.value)} value={notes} />
              </div>
            </section>
          </div>

          <div className="document-action-grid form-action-sticky mt-5">
            <Button onClick={saveReceipt} type="button" variant="secondary">
              {isBn ? 'রিসিপ্ট সেভ' : 'Save Receipt'}
            </Button>
            <Button className="lg:hidden" onClick={() => setMobilePreviewOpen(true)} type="button" variant="secondary">
              <Eye size={16} />
              <span>{isBn ? 'প্রিভিউ দেখুন' : 'View Sheet'}</span>
            </Button>
            <Button onClick={savePdfReceipt} type="button" variant="secondary">
              {isBn ? 'PDF সেভ' : 'Save PDF'}
            </Button>
            <Button onClick={saveReceiptAsCopy} type="button" variant="secondary">
              {isBn ? 'নতুন কপি সেভ' : 'Save as Copy'}
            </Button>
            <Button onClick={resetReceiptForm} type="button" variant="secondary">
              {isBn ? 'নতুন রিসিপ্ট' : 'New Receipt'}
            </Button>
          </div>
          {saveStatus ? (
            <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{saveStatus}</p>
          ) : null}
          {formError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{formError}</p> : null}
        </Card>

        <Card className="print-area relative z-0 hidden bg-white p-0 lg:block lg:h-full lg:min-h-0 lg:overflow-y-auto">
          {renderMoneyReceiptSheetContent()}
        </Card>
      </div>

      {/* Mobile Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={mobilePreviewOpen}
        onClose={() => setMobilePreviewOpen(false)}
        onPrintPdf={savePdfReceipt}
        title={isBn ? `মানি রিসিপ্ট #${documentNumber}` : `Money Receipt #${documentNumber}`}
      >
        {renderMoneyReceiptSheetContent()}
      </DocumentPreviewModal>
    </div>
  )
}

