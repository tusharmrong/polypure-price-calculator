import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  Factory,
  FileDown,
  FileEdit,
  Percent,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Truck
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import ClientSuggestions from '../components/ClientSuggestions.jsx'
import DeliveryChallanModal from '../components/DeliveryChallanModal.jsx'
import DocumentPreviewModal from '../components/DocumentPreviewModal.jsx'
import Input from '../components/Input.jsx'
import TextArea from '../components/TextArea.jsx'
import { defaultSettings } from '../data/defaultSettings.js'
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

function createItem(draft) {
  return {
    id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    description: normalizeThicknessText(draft?.description || ''),
    quantity: String(draft?.quantity ?? '2000'),
    rate: draft?.rate ? formatDecimal(draft.rate) : ''
  }
}

function itemAmount(item) {
  const amount = Number(item.quantity || 0) * Number(item.rate || 0)
  return Number.isFinite(amount) ? amount : 0
}

export default function Invoice() {
  const { language } = useUiLanguage()
  const isBn = language === 'bn'
  const { showToast } = useToast()
  const { currentUser } = useAuth()
  const location = useLocation()
  const draft = location.state?.calculatorDraft || loadCalculatorDraft()
  const companySettings = useMemo(() => loadCompanySettings(), [])
  const prefill = location.state?.prefillDocument
  const savedDraft = useMemo(() => (prefill ? null : loadFormDraft('invoice', null)), [prefill])
  const initialDate = prefill?.date || savedDraft?.documentDate || getTodayInputDate()
  const [documentDate, setDocumentDate] = useState(initialDate)
  const [documentNumber, setDocumentNumber] = useState(
    prefill?.number || savedDraft?.documentNumber || createDocumentNumber('PP-I', initialDate)
  )
  const [editingDocumentId, setEditingDocumentId] = useState(prefill?.id || savedDraft?.editingDocumentId || '')
  const [clientName, setClientName] = useState(prefill?.clientName || savedDraft?.clientName || '')
  const [phone, setPhone] = useState(prefill?.phone || savedDraft?.phone || '')
  const [address, setAddress] = useState(prefill?.address || savedDraft?.address || '')
  const [items, setItems] = useState(() => {
    if (prefill?.items?.length) {
      return prefill.items.map((item) => ({
        id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        description: normalizeThicknessText(item.description || ''),
        quantity: String(item.quantity ?? '2000'),
        rate: formatDecimal(item.rate || 0)
      }))
    }
    if (draft?.description || draft?.rate) {
      return [createItem(draft)]
    }
    if (savedDraft?.items?.length) {
      return savedDraft.items.map((item) => ({
        id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        description: normalizeThicknessText(item.description || ''),
        quantity: String(item.quantity ?? '2000'),
        rate: formatDecimal(item.rate || 0)
      }))
    }
    return [createItem(draft)]
  })
  const [discount, setDiscount] = useState(formatDecimal(prefill?.discount ?? savedDraft?.discount ?? 0))
  const [vatPercent, setVatPercent] = useState(formatDecimal(prefill?.vatPercent ?? savedDraft?.vatPercent ?? 0))
  const [otherChargeName, setOtherChargeName] = useState(
    prefill?.otherChargeName || savedDraft?.otherChargeName || 'Other Charge'
  )
  const [otherChargeAmount, setOtherChargeAmount] = useState(
    formatDecimal(prefill?.otherChargeAmount ?? savedDraft?.otherChargeAmount ?? 0)
  )
  const [deliveryCharge, setDeliveryCharge] = useState(
    formatDecimal(prefill?.deliveryCharge ?? savedDraft?.deliveryCharge ?? 0)
  )
  const [paidAmount, setPaidAmount] = useState(formatDecimal(prefill?.paidAmount ?? savedDraft?.paidAmount ?? 0))
  const [notes, setNotes] = useState(prefill?.notes || savedDraft?.notes || '')
  const [terms, setTerms] = useState(prefill?.terms || savedDraft?.terms || companySettings.terms || defaultSettings.terms)
  const [saveStatus, setSaveStatus] = useState('')
  const [formError, setFormError] = useState('')
  const [baselineFingerprint, setBaselineFingerprint] = useState('')
  const [challanModalOpen, setChallanModalOpen] = useState(false)
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const clientSuggestions = useClientSuggestions()

  // Factory Cost Breakdown State
  const [factoryCostOpen, setFactoryCostOpen] = useState(true)
  const [factoryCost, setFactoryCost] = useState(() => {
    const defaultCost = {
      rawMaterialPounds: draft?.factoryCost?.rawMaterialPounds ? String(draft.factoryCost.rawMaterialPounds) : '',
      poundRate: draft?.factoryCost?.poundRate ? String(draft.factoryCost.poundRate) : (draft?.poundRate ? String(draft.poundRate) : '140'),
      printCostPerUnit: draft?.factoryCost?.printCostPerUnit ? String(draft.factoryCost.printCostPerUnit) : (draft?.charges?.printingCharge ? String(draft.charges.printingCharge) : '0.40'),
      hasHandle: draft?.factoryCost?.hasHandle ?? (draft?.charges?.handleCost > 0),
      handleCostPerUnit: draft?.factoryCost?.handleCostPerUnit ? String(draft.factoryCost.handleCostPerUnit) : '2.00',
      hasAdhesive: draft?.factoryCost?.hasAdhesive ?? (draft?.charges?.adhesiveCost > 0),
      adhesiveCostPerUnit: draft?.factoryCost?.adhesiveCostPerUnit ? String(draft.factoryCost.adhesiveCostPerUnit) : '0.50',
      blockCharge: draft?.factoryCost?.blockCharge ? String(draft.factoryCost.blockCharge) : (draft?.charges?.blockCharge ? String(draft.charges.blockCharge) : ''),
      extraFinishingCost: draft?.factoryCost?.extraFinishingCost ? String(draft.factoryCost.extraFinishingCost) : '',
      wastagePercent: draft?.factoryCost?.wastagePercent ? String(draft.factoryCost.wastagePercent) : '3'
    }

    if (prefill?.factoryCost) {
      return {
        ...defaultCost,
        ...prefill.factoryCost,
        rawMaterialPounds: String(prefill.factoryCost.rawMaterialPounds || ''),
        poundRate: String(prefill.factoryCost.poundRate || '140'),
        printCostPerUnit: String(prefill.factoryCost.printCostPerUnit || '0.40'),
        handleCostPerUnit: String(prefill.factoryCost.handleCostPerUnit || '2.00'),
        adhesiveCostPerUnit: String(prefill.factoryCost.adhesiveCostPerUnit || '0.50'),
        blockCharge: String(prefill.factoryCost.blockCharge || ''),
        extraFinishingCost: String(prefill.factoryCost.extraFinishingCost || ''),
        wastagePercent: String(prefill.factoryCost.wastagePercent || '3')
      }
    }
    if (savedDraft?.factoryCost) {
      return {
        ...defaultCost,
        ...savedDraft.factoryCost
      }
    }
    return defaultCost
  })

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + itemAmount(item), 0), [items])
  const totalAmount = useMemo(() => {
    const nextTotal = subtotal - Number(discount || 0)
    return Number.isFinite(nextTotal) ? Math.max(nextTotal, 0) : 0
  }, [discount, subtotal])
  const vatAmount = useMemo(() => {
    const nextVat = (totalAmount * Number(vatPercent || 0)) / 100
    return Number.isFinite(nextVat) ? Math.max(nextVat, 0) : 0
  }, [totalAmount, vatPercent])
  const grandTotal = useMemo(
    () => totalAmount + vatAmount + Number(otherChargeAmount || 0) + Number(deliveryCharge || 0),
    [deliveryCharge, otherChargeAmount, totalAmount, vatAmount]
  )
  const dueAmount = useMemo(() => {
    const nextDue = grandTotal - Number(paidAmount || 0)
    return Number.isFinite(nextDue) ? Math.max(nextDue, 0) : 0
  }, [grandTotal, paidAmount])

  // Real-Time Payment Status Badge
  const paymentStatus = useMemo(() => {
    if (grandTotal <= 0) {
      return {
        label: isBn ? 'ড্রাফট' : 'DRAFT',
        color: 'bg-slate-100 text-slate-700 border-slate-200',
        badgeClass: 'bg-slate-500 text-white',
        statusType: 'DRAFT',
        Icon: Clock
      }
    }
    if (dueAmount <= 0) {
      return {
        label: isBn ? 'সম্পূর্ণ পরিশোধিত (PAID)' : 'PAID IN FULL',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        badgeClass: 'bg-emerald-600 text-white',
        statusType: 'PAID',
        Icon: CheckCircle2
      }
    }
    if (Number(paidAmount || 0) > 0) {
      return {
        label: isBn ? `আংশিক বকেয়া (${formatCurrency(dueAmount)})` : `PARTIAL DUE (${formatCurrency(dueAmount)})`,
        color: 'bg-amber-50 text-amber-700 border-amber-300',
        badgeClass: 'bg-amber-500 text-white',
        statusType: 'PARTIAL',
        Icon: Clock
      }
    }
    return {
      label: isBn ? `বকেয়া (${formatCurrency(dueAmount)})` : `UNPAID DUE (${formatCurrency(dueAmount)})`,
      color: 'bg-rose-50 text-rose-700 border-rose-300',
      badgeClass: 'bg-rose-600 text-white',
      statusType: 'DUE',
      Icon: AlertCircle
    }
  }, [dueAmount, grandTotal, isBn, paidAmount])

  // Total order bag quantity across all line items
  const totalOrderQuantity = useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.quantity || 0), 0)
  }, [items])

  // Factory Production Cost Calculations
  const factoryCostCalculation = useMemo(() => {
    const pounds = Number(factoryCost.rawMaterialPounds || 0)
    const poundRate = Number(factoryCost.poundRate || 0)
    const rawMaterialTotal = pounds * poundRate

    const printUnit = Number(factoryCost.printCostPerUnit || 0)
    const printTotal = printUnit * totalOrderQuantity

    const handleUnit = factoryCost.hasHandle ? Number(factoryCost.handleCostPerUnit || 0) : 0
    const handleTotal = handleUnit * totalOrderQuantity

    const adhesiveUnit = factoryCost.hasAdhesive ? Number(factoryCost.adhesiveCostPerUnit || 0) : 0
    const adhesiveTotal = adhesiveUnit * totalOrderQuantity

    const blockCharge = Number(factoryCost.blockCharge || 0)
    const extraFinishing = Number(factoryCost.extraFinishingCost || 0)

    const subCost = rawMaterialTotal + printTotal + handleTotal + adhesiveTotal + blockCharge + extraFinishing
    const wastage = (subCost * Number(factoryCost.wastagePercent || 0)) / 100
    const totalProductionCost = subCost + wastage

    const netOrderProfit = grandTotal - totalProductionCost
    const marginPercent = grandTotal > 0 ? (netOrderProfit / grandTotal) * 100 : 0

    return {
      rawMaterialTotal,
      printTotal,
      handleTotal,
      adhesiveTotal,
      blockCharge,
      extraFinishing,
      wastage,
      totalProductionCost,
      netOrderProfit,
      marginPercent
    }
  }, [factoryCost, totalOrderQuantity, grandTotal])

  const readableDate = useMemo(() => formatDocumentDate(documentDate), [documentDate])
  const signatureImage = useMemo(() => loadSignatureImage(), [])
  const formFingerprint = useMemo(
    () =>
      JSON.stringify({
        documentDate,
        documentNumber,
        editingDocumentId,
        clientName,
        phone,
        address,
        items: items.map((item) => ({ description: item.description, quantity: item.quantity, rate: item.rate })),
        discount,
        vatPercent,
        otherChargeName,
        otherChargeAmount,
        deliveryCharge,
        paidAmount,
        notes,
        terms,
        factoryCost
      }),
    [
      address,
      clientName,
      deliveryCharge,
      discount,
      documentDate,
      documentNumber,
      editingDocumentId,
      factoryCost,
      items,
      notes,
      otherChargeAmount,
      otherChargeName,
      paidAmount,
      phone,
      terms,
      vatPercent
    ]
  )
  const isDirty = baselineFingerprint !== '' && baselineFingerprint !== formFingerprint

  useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    saveFormDraft('invoice', {
      documentDate,
      documentNumber,
      editingDocumentId,
      clientName,
      phone,
      address,
      items,
      discount: Number(discount || 0),
      vatPercent: Number(vatPercent || 0),
      otherChargeName,
      otherChargeAmount: Number(otherChargeAmount || 0),
      deliveryCharge: Number(deliveryCharge || 0),
      paidAmount: Number(paidAmount || 0),
      notes,
      terms
    })
  }, [
    address,
    clientName,
    deliveryCharge,
    discount,
    documentDate,
    documentNumber,
    editingDocumentId,
    items,
    notes,
    otherChargeAmount,
    otherChargeName,
    paidAmount,
    phone,
    terms,
    vatPercent
  ])

  useEffect(() => {
    if (!editingDocumentId) {
      setDocumentNumber(createDocumentNumber('PP-I', documentDate))
    }
  }, [documentDate, editingDocumentId])

  useEffect(() => {
    if (!baselineFingerprint) {
      setBaselineFingerprint(formFingerprint)
    }
  }, [baselineFingerprint, formFingerprint])

  const updateItem = (id, field, value) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

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

  const saveInvoice = async () => {
    const error = validateInvoice()
    if (error) {
      setFormError(error)
      showToast(error, 'error')
      return
    }
    setFormError('')
    const savedDocument = await saveDocument({
      id: editingDocumentId || undefined,
      type: 'Invoice',
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
      vatPercent: Number(vatPercent || 0),
      vatAmount,
      otherChargeName,
      otherChargeAmount: Number(otherChargeAmount || 0),
      deliveryCharge: Number(deliveryCharge || 0),
      totalBeforeVat: totalAmount,
      totalAmount: grandTotal,
      paidAmount: Number(paidAmount || 0),
      dueAmount,
      factoryCost: {
        rawMaterialPounds: Number(factoryCost.rawMaterialPounds || 0),
        poundRate: Number(factoryCost.poundRate || 0),
        rawMaterialCost: factoryCostCalculation.rawMaterialTotal,
        printCostPerUnit: Number(factoryCost.printCostPerUnit || 0),
        totalPrintCost: factoryCostCalculation.printTotal,
        hasHandle: Boolean(factoryCost.hasHandle),
        handleCostPerUnit: Number(factoryCost.handleCostPerUnit || 0),
        totalHandleCost: factoryCostCalculation.handleTotal,
        hasAdhesive: Boolean(factoryCost.hasAdhesive),
        adhesiveCostPerUnit: Number(factoryCost.adhesiveCostPerUnit || 0),
        totalAdhesiveCost: factoryCostCalculation.adhesiveTotal,
        blockCharge: Number(factoryCost.blockCharge || 0),
        extraFinishingCost: Number(factoryCost.extraFinishingCost || 0),
        wastagePercent: Number(factoryCost.wastagePercent || 0),
        totalFactoryCost: factoryCostCalculation.totalProductionCost,
        netOrderProfit: factoryCostCalculation.netOrderProfit,
        marginPercent: factoryCostCalculation.marginPercent
      },
      notes,
      terms
    }, currentUser)
    setEditingDocumentId(savedDocument.id)
    setSaveStatus(`${documentNumber} saved to History.`)
    setBaselineFingerprint('')
    showToast('Invoice saved successfully.', 'success')
  }

  const saveInvoiceAsCopy = async () => {
    const error = validateInvoice()
    if (error) {
      setFormError(error)
      showToast(error, 'error')
      return
    }
    setFormError('')
    const copyNumber = createDocumentNumber('PP-I', documentDate)
    const savedDocument = await saveDocument({
      type: 'Invoice',
      number: copyNumber,
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
      vatPercent: Number(vatPercent || 0),
      vatAmount,
      otherChargeName,
      otherChargeAmount: Number(otherChargeAmount || 0),
      deliveryCharge: Number(deliveryCharge || 0),
      totalBeforeVat: totalAmount,
      totalAmount: grandTotal,
      paidAmount: Number(paidAmount || 0),
      dueAmount,
      factoryCost: {
        rawMaterialPounds: Number(factoryCost.rawMaterialPounds || 0),
        poundRate: Number(factoryCost.poundRate || 0),
        rawMaterialCost: factoryCostCalculation.rawMaterialTotal,
        printCostPerUnit: Number(factoryCost.printCostPerUnit || 0),
        totalPrintCost: factoryCostCalculation.printTotal,
        hasHandle: Boolean(factoryCost.hasHandle),
        handleCostPerUnit: Number(factoryCost.handleCostPerUnit || 0),
        totalHandleCost: factoryCostCalculation.handleTotal,
        hasAdhesive: Boolean(factoryCost.hasAdhesive),
        adhesiveCostPerUnit: Number(factoryCost.adhesiveCostPerUnit || 0),
        totalAdhesiveCost: factoryCostCalculation.adhesiveTotal,
        blockCharge: Number(factoryCost.blockCharge || 0),
        extraFinishingCost: Number(factoryCost.extraFinishingCost || 0),
        wastagePercent: Number(factoryCost.wastagePercent || 0),
        totalFactoryCost: factoryCostCalculation.totalProductionCost,
        netOrderProfit: factoryCostCalculation.netOrderProfit,
        marginPercent: factoryCostCalculation.marginPercent
      },
      notes,
      terms
    }, currentUser)
    setDocumentNumber(copyNumber)
    setEditingDocumentId(savedDocument.id)
    setSaveStatus(`${copyNumber} saved as a new copy.`)
    setBaselineFingerprint('')
    showToast('Invoice copy saved.', 'success')
  }

  const savePdfInvoice = async () => {
    const error = validateInvoice()
    if (error) {
      setFormError(error)
      showToast(error, 'error')
      return
    }
    setFormError('')
    await saveInvoice()
    printWithFileName({
      clientName: clientName || 'Client',
      documentNumber,
      type: 'Invoice'
    })
    showToast('PDF save window opened.', 'success')
  }

  const resetInvoiceForm = () => {
    const today = getTodayInputDate()
    setDocumentDate(today)
    setDocumentNumber(createDocumentNumber('PP-I', today))
    setEditingDocumentId('')
    setClientName('')
    setPhone('')
    setAddress('')
    setItems([createItem()])
    setDiscount(formatDecimal(0))
    setVatPercent(formatDecimal(0))
    setOtherChargeName('Other Charge')
    setOtherChargeAmount(formatDecimal(0))
    setDeliveryCharge(formatDecimal(0))
    setPaidAmount(formatDecimal(0))
    setNotes('')
    setTerms(companySettings.terms || defaultSettings.terms)
    setSaveStatus('')
    setNotes('')
    setTerms(companySettings.terms || defaultSettings.terms)
    setSaveStatus('')
    setFormError('')
    setBaselineFingerprint('')
    clearFormDraft('invoice')
    showToast('Invoice form reset.', 'success')
  }

  const validateInvoice = () => {
    if (!clientName.trim()) return 'Please enter client name.'
    if (!items.length) return 'Please add at least one item.'
    for (const item of items) {
      if (!item.description?.trim()) return 'Please enter item description.'
      if (Number(item.quantity || 0) <= 0) return 'Item quantity must be greater than zero.'
      if (Number(item.rate || 0) <= 0) return 'Item rate must be greater than zero.'
    }
    if (grandTotal <= 0) return 'Total amount must be greater than zero.'
    if (Number(paidAmount || 0) < 0) return 'Paid amount cannot be negative.'
    return ''
  }

  const renderInvoiceSheetContent = () => (
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
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <p className="text-2xl font-bold uppercase text-brand-700">Invoice</p>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${paymentStatus.badgeClass}`}>
                {paymentStatus.statusType}
              </span>
            </div>
            <p className="mt-1 text-xs font-bold text-slate-900">{documentNumber}</p>
            <p className="text-xs text-slate-600">{readableDate}</p>
          </div>
        </div>

        <div className="grid gap-3 py-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">Bill To</p>
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
                {companySettings.paymentMethod}
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
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">VAT ({formatDecimal(vatPercent)}%)</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">{otherChargeName?.trim() || 'Other Charge'}</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(otherChargeAmount)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Delivery Charge</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(deliveryCharge)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 text-sm">
                  <span className="font-bold text-slate-950">Grand Total</span>
                  <span className="font-bold text-brand-700">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between gap-4 rounded-md border border-brand-100 bg-brand-50 px-2 py-1">
                  <span className="font-semibold text-brand-700">Paid Amount</span>
                  <span className="font-bold text-brand-700">{formatCurrency(paidAmount)}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="font-bold text-slate-950">Due Amount</span>
                  <span className="font-bold text-slate-950">{formatCurrency(dueAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Amount in Words (কথায়) */}
          {grandTotal > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-3.5 py-2 text-xs text-slate-800">
              <span className="font-bold text-slate-900">{isBn ? 'কথায়: ' : 'In Words: '}</span>
              <span className="italic font-semibold text-brand-900">{numberToWords(grandTotal, isBn ? 'bn' : 'en')}</span>
            </div>
          )}

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
            <p className="mt-1">This invoice records payment and due status for this order.</p>
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
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                alt="Poly Pure"
                className="h-12 w-12 rounded-full border border-brand-100 bg-white object-contain"
                src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
              />
              <div>
                <h2 className="text-lg font-bold text-slate-950">{isBn ? 'ইনভয়েস ফর্ম' : 'Invoice Form'}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${paymentStatus.color}`}
              >
                <paymentStatus.Icon size={14} />
                <span>{paymentStatus.label}</span>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                Total: {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          <div className="grid gap-5">
            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">{isBn ? 'ডকুমেন্ট বিস্তারিত' : 'Document Details'}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <Input id="invoice-number" label={isBn ? 'ইনভয়েস নম্বর' : 'Invoice Number'} readOnly value={documentNumber} />
                <Input
                  id="invoice-date"
                  label={isBn ? 'তারিখ' : 'Date'}
                  onChange={(event) => setDocumentDate(event.target.value)}
                  type="date"
                  value={documentDate}
                />
              </div>
            </section>

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">{isBn ? 'ক্লায়েন্ট বিস্তারিত' : 'Client Details'}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  id="invoice-client"
                  label={isBn ? 'ক্লায়েন্টের নাম' : 'Client Name'}
                  list="invoice-client-suggestions"
                  onChange={handleClientNameChange}
                  value={clientName}
                />
                <datalist id="invoice-client-suggestions">
                  {clientSuggestions.map((client) => (
                    <option key={client.id} value={client.clientName}>
                      {client.phone || client.address || client.lastDocumentNumber}
                    </option>
                  ))}
                </datalist>
                <Input
                  id="invoice-phone"
                  label={isBn ? 'ফোন নম্বর' : 'Phone Number'}
                  list="invoice-phone-suggestions"
                  onChange={handlePhoneChange}
                  value={phone}
                />
                <datalist id="invoice-phone-suggestions">
                  {clientSuggestions
                    .filter((client) => client.phone)
                    .map((client) => (
                      <option key={client.id} value={client.phone}>
                        {client.clientName}
                      </option>
                    ))}
                </datalist>
                <TextArea className="md:col-span-2" id="invoice-address" label={isBn ? 'ঠিকানা' : 'Address'} onChange={(event) => setAddress(event.target.value)} value={address} />
                <ClientSuggestions
                  onSelect={applyClientSuggestion}
                  query={`${clientName} ${phone}`}
                  suggestions={clientSuggestions}
                />
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <h3 className="text-sm font-bold text-slate-950">{isBn ? 'ইনভয়েস আইটেম' : 'Invoice Items'}</h3>
              <Button className="min-h-10 w-full shrink-0 px-3 py-2 sm:w-auto" onClick={addItem} type="button" variant="secondary">
                <Plus size={16} aria-hidden="true" />
                {isBn ? 'আইটেম যোগ করুন' : 'Add Item'}
              </Button>
            </div>

            {items.map((item, index) => (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" key={item.id}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-700">{isBn ? `আইটেম ${index + 1}` : `Item ${index + 1}`}</p>
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
                    id={`invoice-item-${item.id}`}
                    label={isBn ? 'টাইপ / সাইজ বিবরণ' : 'Type / Size Description'}
                    onChange={(event) => updateItem(item.id, 'description', event.target.value)}
                    value={item.description}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      id={`invoice-quantity-${item.id}`}
                      label={isBn ? 'পরিমাণ' : 'Quantity'}
                      min="0"
                      onChange={(event) => updateItem(item.id, 'quantity', event.target.value)}
                      type="number"
                      value={item.quantity}
                    />
                    <Input
                      id={`invoice-rate-${item.id}`}
                      label={isBn ? 'রেট' : 'Rate'}
                      min="0"
                      onBlur={() => formatItemRate(item.id)}
                      onChange={(event) => updateItem(item.id, 'rate', event.target.value)}
                      step="0.01"
                      type="number"
                      value={item.rate}
                    />
                    <Input
                      className="sm:col-span-2"
                      id={`invoice-amount-${item.id}`}
                      label={isBn ? 'পরিমাণ (টাকা)' : 'Amount'}
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
              <h3 className="text-sm font-bold text-slate-950">{isBn ? 'পেমেন্ট সারাংশ' : 'Payment Summary'}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input id="invoice-subtotal" label={isBn ? 'সাবটোটাল' : 'Subtotal'} readOnly type="number" value={formatDecimal(subtotal)} />
                <Input
                  id="invoice-discount"
                  label={isBn ? 'ডিসকাউন্ট' : 'Discount'}
                  min="0"
                  onBlur={() => setDiscount(formatDecimal(discount))}
                  onChange={(event) => setDiscount(event.target.value)}
                  step="0.01"
                  type="number"
                  value={discount}
                />
                <Input
                  id="invoice-vat-percent"
                  label={isBn ? 'ভ্যাট (%)' : 'VAT (%)'}
                  min="0"
                  onBlur={() => setVatPercent(formatDecimal(vatPercent))}
                  onChange={(event) => setVatPercent(event.target.value)}
                  step="0.01"
                  type="number"
                  value={vatPercent}
                />
                <Input
                  id="invoice-vat-amount"
                  label={isBn ? 'ভ্যাট পরিমাণ' : 'VAT Amount'}
                  readOnly
                  type="number"
                  value={formatDecimal(vatAmount)}
                />
                <Input
                  id="invoice-other-charge-name"
                  label={isBn ? 'অতিরিক্ত চার্জ নাম' : 'Other Charge Name'}
                  onChange={(event) => setOtherChargeName(event.target.value)}
                  value={otherChargeName}
                />
                <Input
                  id="invoice-other-charge-amount"
                  label={isBn ? 'অতিরিক্ত চার্জ পরিমাণ' : 'Other Charge Amount'}
                  min="0"
                  onBlur={() => setOtherChargeAmount(formatDecimal(otherChargeAmount))}
                  onChange={(event) => setOtherChargeAmount(event.target.value)}
                  step="0.01"
                  type="number"
                  value={otherChargeAmount}
                />
                <Input
                  id="invoice-delivery-charge"
                  label={isBn ? 'Delivery Charge' : 'Delivery Charge'}
                  min="0"
                  onBlur={() => setDeliveryCharge(formatDecimal(deliveryCharge))}
                  onChange={(event) => setDeliveryCharge(event.target.value)}
                  step="0.01"
                  type="number"
                  value={deliveryCharge}
                />
                <Input id="invoice-total" label={isBn ? 'মোট টাকা' : 'Grand Total'} readOnly type="number" value={formatDecimal(grandTotal)} />
                <Input
                  id="invoice-paid"
                  label={isBn ? 'পরিশোধিত টাকা' : 'Paid Amount'}
                  min="0"
                  onBlur={() => setPaidAmount(formatDecimal(paidAmount))}
                  onChange={(event) => setPaidAmount(event.target.value)}
                  step="0.01"
                  type="number"
                  value={paidAmount}
                />
                <Input className="sm:col-span-2" id="invoice-due" label={isBn ? 'বকেয়া টাকা' : 'Due Amount'} readOnly type="number" value={formatDecimal(dueAmount)} />
              </div>
            </section>

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">{isBn ? 'নোট ও শর্তাবলী' : 'Notes and Terms'}</h3>
              <TextArea id="invoice-notes" label={isBn ? 'নোট' : 'Notes'} onChange={(event) => setNotes(event.target.value)} value={notes} />
              <TextArea id="invoice-terms" label={isBn ? 'শর্তাবলী' : 'Terms and Conditions'} onChange={(event) => setTerms(event.target.value)} value={terms} />
            </section>
          </div>

          <div className="document-action-grid form-action-sticky mt-5">
            <Button onClick={saveInvoice} type="button" variant="secondary">
              {isBn ? 'ইনভয়েস সেভ' : 'Save Invoice'}
            </Button>
            <Button onClick={() => setChallanModalOpen(true)} type="button" variant="secondary">
              <Truck size={16} />
              <span>{isBn ? 'ডেলিভারি চালান' : 'Delivery Challan'}</span>
            </Button>
            <Button className="lg:hidden" onClick={() => setMobilePreviewOpen(true)} type="button" variant="secondary">
              <Eye size={16} />
              <span>{isBn ? 'প্রিভিউ দেখুন' : 'View Sheet'}</span>
            </Button>
            <Button onClick={savePdfInvoice} type="button" variant="secondary">
              {isBn ? 'PDF সেভ' : 'Save PDF'}
            </Button>
            <Button onClick={saveInvoiceAsCopy} type="button" variant="secondary">
              {isBn ? 'নতুন কপি সেভ' : 'Save as Copy'}
            </Button>
            <Button onClick={resetInvoiceForm} type="button" variant="secondary">
              {isBn ? 'নতুন ইনভয়েস' : 'New Invoice'}
            </Button>
          </div>
          {saveStatus ? (
            <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{saveStatus}</p>
          ) : null}
          {formError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{formError}</p> : null}
        </Card>

        <Card className="print-area relative z-0 hidden bg-white p-0 lg:block lg:h-full lg:min-h-0 lg:overflow-y-auto">
          {renderInvoiceSheetContent()}
        </Card>
      </div>

      {/* Mobile Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={mobilePreviewOpen}
        onClose={() => setMobilePreviewOpen(false)}
        onPrintPdf={savePdfInvoice}
        title={isBn ? `ইনভয়েস #${documentNumber}` : `Invoice #${documentNumber}`}
      >
        {renderInvoiceSheetContent()}
      </DocumentPreviewModal>

      {/* Delivery Challan Modal */}
      <DeliveryChallanModal
        address={address}
        clientName={clientName}
        documentDate={documentDate}
        invoiceNumber={documentNumber}
        isOpen={challanModalOpen}
        items={items}
        notes={notes}
        onClose={() => setChallanModalOpen(false)}
        phone={phone}
      />
    </div>
  )
}

