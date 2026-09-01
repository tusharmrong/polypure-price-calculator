import {
  ArrowRight,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  DollarSign,
  Eye,
  Factory,
  FileCheck,
  FileDown,
  FileEdit,
  Percent,
  Plus,
  Receipt,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Trash2
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import ClientSuggestions from '../components/ClientSuggestions.jsx'
import DocumentPreviewModal from '../components/DocumentPreviewModal.jsx'
import Input from '../components/Input.jsx'
import Modal from '../components/Modal.jsx'
import Select from '../components/Select.jsx'
import TextArea from '../components/TextArea.jsx'
import { defaultSettings } from '../data/defaultSettings.js'
import { loadCalculatorDraft, normalizeThicknessText } from '../utils/calculatorDraft.js'
import { loadCompanySettings } from '../utils/companySettings.js'
import { createDocumentNumber, formatDocumentDate, getTodayInputDate } from '../utils/documentNumber.js'
import { loadDocuments, saveDocument } from '../utils/documents.js'
import { clearFormDraft, loadFormDraft, saveFormDraft } from '../utils/formDrafts.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { formatDecimal } from '../utils/formatNumber.js'
import { numberToWords } from '../utils/numberToWords.js'
import { loadSignatureImage } from '../utils/signature.js'
import { useUiLanguage } from '../utils/uiLanguage.js'
import { printWithFileName } from '../utils/pdf.js'
import { useToast } from '../utils/toast.jsx'
import { useUnsavedChangesGuard } from '../utils/useUnsavedChangesGuard.js'
import { useAuth } from '../utils/authContext.jsx'
import { matchClientSuggestion, useClientSuggestions } from '../utils/clientSuggestions.js'

function createItem(draft) {
  return {
    id: window.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: normalizeThicknessText(draft?.description || ''),
    quantity: String(draft?.quantity ?? '2000'),
    rate: draft?.rate ? formatDecimal(draft.rate) : ''
  }
}

function itemAmount(item) {
  const amount = Number(item.quantity || 0) * Number(item.rate || 0)
  return Number.isFinite(amount) ? amount : 0
}

export default function Quotation() {
  const { language } = useUiLanguage()
  const isBn = language === 'bn'
  const { showToast } = useToast()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const draft = location.state?.calculatorDraft || loadCalculatorDraft()
  const companySettings = useMemo(() => loadCompanySettings(), [])
  const prefill = location.state?.prefillDocument
  const savedDraft = useMemo(() => (prefill ? null : loadFormDraft('quotation', null)), [prefill])
  const initialDate = prefill?.date || savedDraft?.documentDate || getTodayInputDate()
  const [documentDate, setDocumentDate] = useState(initialDate)
  const [documentNumber, setDocumentNumber] = useState(
    prefill?.number || savedDraft?.documentNumber || createDocumentNumber('PP-Q', initialDate)
  )
  const [editingDocumentId, setEditingDocumentId] = useState(prefill?.id || savedDraft?.editingDocumentId || '')
  const [clientName, setClientName] = useState(prefill?.clientName || savedDraft?.clientName || '')
  const [phone, setPhone] = useState(prefill?.phone || savedDraft?.phone || '')
  const [address, setAddress] = useState(prefill?.address || savedDraft?.address || '')
  const [items, setItems] = useState(() => {
    if (prefill?.items?.length) {
      return prefill.items.map((item) => ({
        id: window.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
        id: window.crypto?.randomUUID?.() || `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
  const [advancePercent, setAdvancePercent] = useState(
    formatDecimal(prefill?.advancePercent ?? savedDraft?.advancePercent ?? 40, 0)
  )
  const [notes, setNotes] = useState(prefill?.notes || savedDraft?.notes || '')
  const [terms, setTerms] = useState(prefill?.terms || savedDraft?.terms || companySettings.terms || defaultSettings.terms)
  const [saveStatus, setSaveStatus] = useState('')
  const [formError, setFormError] = useState('')
  const [baselineFingerprint, setBaselineFingerprint] = useState('')
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const clientSuggestions = useClientSuggestions()

  // Quotation Conversion Lock State
  const [convertedInvoiceNumber, setConvertedInvoiceNumber] = useState(prefill?.convertedInvoiceNumber || '')
  const [convertedInvoiceId, setConvertedInvoiceId] = useState(prefill?.convertedInvoiceId || '')
  const [convertedAt, setConvertedAt] = useState(prefill?.convertedAt || '')
  const [alreadyConvertedModalOpen, setAlreadyConvertedModalOpen] = useState(false)

  // Convert Quotation to Invoice & Send to Production Modal
  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [convertForm, setConvertForm] = useState({
    advancePaid: '',
    paymentMethod: 'Cash',
    targetDeliveryDate: '',
    sendToProduction: true,
    notes: ''
  })
  const [converting, setConverting] = useState(false)

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
  const totalBeforeVat = useMemo(() => {
    const nextTotal = subtotal - Number(discount || 0)
    return Number.isFinite(nextTotal) ? Math.max(nextTotal, 0) : 0
  }, [discount, subtotal])
  const vatAmount = useMemo(() => {
    const nextVat = (totalBeforeVat * Number(vatPercent || 0)) / 100
    return Number.isFinite(nextVat) ? Math.max(nextVat, 0) : 0
  }, [totalBeforeVat, vatPercent])
  const totalAmount = useMemo(
    () => totalBeforeVat + vatAmount + Number(otherChargeAmount || 0),
    [otherChargeAmount, totalBeforeVat, vatAmount]
  )
  const advanceAmount = useMemo(() => {
    const nextAmount = totalAmount * (Number(advancePercent || 0) / 100)
    return Number.isFinite(nextAmount) ? nextAmount : 0
  }, [advancePercent, totalAmount])

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

    const netOrderProfit = totalAmount - totalProductionCost
    const marginPercent = totalAmount > 0 ? (netOrderProfit / totalAmount) * 100 : 0

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
  }, [factoryCost, totalOrderQuantity, totalAmount])

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
        advancePercent,
        notes,
        terms,
        factoryCost
      }),
    [
      address,
      advancePercent,
      clientName,
      discount,
      documentDate,
      documentNumber,
      editingDocumentId,
      items,
      notes,
      otherChargeAmount,
      otherChargeName,
      phone,
      terms,
      vatPercent
    ]
  )
  const isDirty = baselineFingerprint !== '' && baselineFingerprint !== formFingerprint

  useUnsavedChangesGuard(isDirty)

  useEffect(() => {
    saveFormDraft('quotation', {
      documentDate,
      documentNumber,
      editingDocumentId,
      clientName,
      phone,
      address,
      items,
      discount: Number(discount || 0),
      vatPercent: Number(vatPercent || 0),
      vatAmount,
      otherChargeName,
      otherChargeAmount: Number(otherChargeAmount || 0),
      totalBeforeVat,
      advancePercent: Number(advancePercent || 0),
      notes,
      terms
    })
  }, [
    address,
    advancePercent,
    clientName,
    discount,
    documentDate,
    documentNumber,
    editingDocumentId,
    items,
    notes,
    otherChargeAmount,
    otherChargeName,
    phone,
    terms,
    totalBeforeVat,
    vatAmount,
    vatPercent
  ])

  useEffect(() => {
    if (!editingDocumentId) {
      setDocumentNumber(createDocumentNumber('PP-Q', documentDate))
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

  const saveQuotation = async () => {
    const error = validateQuotation()
    if (error) {
      setFormError(error)
      showToast(error, 'error')
      return
    }
    setFormError('')
    const savedDocument = await saveDocument({
      id: editingDocumentId || undefined,
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
      vatPercent: Number(vatPercent || 0),
      vatAmount,
      otherChargeName,
      otherChargeAmount: Number(otherChargeAmount || 0),
      totalBeforeVat,
      totalAmount,
      advancePercent: Number(advancePercent || 0),
      advanceAmount,
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
    showToast('Quotation saved successfully.', 'success')
  }

  const saveQuotationAsCopy = async () => {
    const error = validateQuotation()
    if (error) {
      setFormError(error)
      showToast(error, 'error')
      return
    }
    setFormError('')
    const copyNumber = createDocumentNumber('PP-Q', documentDate)
    const savedDocument = await saveDocument({
      type: 'Quotation',
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
      totalBeforeVat,
      totalAmount,
      advancePercent: Number(advancePercent || 0),
      advanceAmount,
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
    showToast('Quotation copy saved.', 'success')
  }

  const savePdfQuotation = async () => {
    const error = validateQuotation()
    if (error) {
      setFormError(error)
      showToast(error, 'error')
      return
    }
    setFormError('')
    await saveQuotation()
    printWithFileName({
      clientName: clientName || 'Client',
      documentNumber,
      type: 'Quotation'
    })
    showToast('PDF save window opened.', 'success')
  }

  const resetQuotationForm = () => {
    const today = getTodayInputDate()
    setDocumentDate(today)
    setDocumentNumber(createDocumentNumber('PP-Q', today))
    setEditingDocumentId('')
    setClientName('')
    setPhone('')
    setAddress('')
    setItems([createItem()])
    setDiscount(formatDecimal(0))
    setVatPercent(formatDecimal(0))
    setOtherChargeName('Other Charge')
    setOtherChargeAmount(formatDecimal(0))
    setAdvancePercent(formatDecimal(40, 0))
    setNotes('')
    setTerms(companySettings.terms || defaultSettings.terms)
    setSaveStatus('')
    setFormError('')
    setBaselineFingerprint('')
    clearFormDraft('quotation')
    showToast('Quotation form reset.', 'success')
  }

  const validateQuotation = () => {
    if (!clientName.trim()) return 'Please enter client name.'
    if (!items.length) return 'Please add at least one item.'
    for (const item of items) {
      if (!item.description?.trim()) return 'Please enter item description.'
      if (Number(item.quantity || 0) <= 0) return 'Item quantity must be greater than zero.'
      if (Number(item.rate || 0) <= 0) return 'Item rate must be greater than zero.'
    }
    if (totalAmount <= 0) return 'Total amount must be greater than zero.'
    return ''
  }

  const openConvertModal = () => {
    const error = validateQuotation()
    if (error) {
      setFormError(error)
      showToast(error, 'error')
      return
    }
    setFormError('')

    if (convertedInvoiceNumber) {
      setAlreadyConvertedModalOpen(true)
      return
    }

    setConvertForm({
      advancePaid: advanceAmount > 0 ? String(advanceAmount) : '',
      paymentMethod: 'Cash',
      targetDeliveryDate: '',
      sendToProduction: true,
      notes: notes || ''
    })
    setConvertModalOpen(true)
  }

  const handleConfirmConvertToInvoice = async (e) => {
    if (e) e.preventDefault()
    setConverting(true)
    try {
      const today = getTodayInputDate()
      const newInvoiceNumber = createDocumentNumber('PP-I', today)
      const enteredAdvance = Number(convertForm.advancePaid || 0)
      const calculatedDue = Math.max(totalAmount - enteredAdvance, 0)

      const invoicePayload = {
        type: 'Invoice',
        number: newInvoiceNumber,
        quotationRef: documentNumber,
        date: today,
        displayDate: formatDocumentDate(today),
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
        totalBeforeVat,
        totalAmount,
        paidAmount: enteredAdvance,
        dueAmount: calculatedDue,
        paymentMethod: convertForm.paymentMethod,
        productionStatus: convertForm.sendToProduction ? 'confirmed' : 'pending',
        productionTargetDate: convertForm.targetDeliveryDate || '',
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
        notes: convertForm.notes || notes,
        terms
      }

      const savedInvoice = await saveDocument(invoicePayload, currentUser)

      // Lock this quotation by updating its conversion record
      const quotePayload = {
        id: editingDocumentId || undefined,
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
        vatPercent: Number(vatPercent || 0),
        vatAmount,
        otherChargeName,
        otherChargeAmount: Number(otherChargeAmount || 0),
        totalBeforeVat,
        totalAmount,
        advancePercent: Number(advancePercent || 0),
        advanceAmount,
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
        terms,
        status: 'converted',
        convertedInvoiceId: savedInvoice.id,
        convertedInvoiceNumber: newInvoiceNumber,
        convertedAt: new Date().toISOString()
      }

      const savedQuote = await saveDocument(quotePayload, currentUser)
      if (savedQuote?.id) {
        setEditingDocumentId(savedQuote.id)
      }
      setConvertedInvoiceNumber(newInvoiceNumber)
      setConvertedInvoiceId(savedInvoice.id)
      setConvertedAt(quotePayload.convertedAt)

      setConvertModalOpen(false)
      showToast(`Invoice ${newInvoiceNumber} generated & sent to Factory Production!`, 'success')
      navigate('/invoice', { state: { prefillDocument: savedInvoice } })
    } catch (err) {
      console.error('Failed to convert quotation to invoice:', err)
      showToast('Failed to create invoice.', 'error')
    } finally {
      setConverting(false)
    }
  }

  const renderQuotationSheetContent = () => (
    <div id="quotation-printable-sheet" className="quotation-sheet overflow-hidden rounded-lg border border-slate-200 bg-white lg:w-full lg:max-w-none">
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
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                Printing and Packaging
              </p>
              <div className="mt-1 grid gap-0.5 text-[10px] leading-4 text-slate-500">
                <span>Phone: {companySettings.phone}</span>
                <span>Email: {companySettings.email} | Website: {companySettings.website}</span>
                <span>{companySettings.address}</span>
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
                  <span className="text-slate-500">VAT ({Number(vatPercent || 0).toFixed(2)}%)</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">{otherChargeName?.trim() || 'Other Charge'}</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(otherChargeAmount)}</span>
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
                <div className="flex justify-between gap-4 text-sm">
                  <span className="font-bold text-slate-950">Balance Due</span>
                  <span className="font-bold text-slate-950">{formatCurrency(Math.max(totalAmount - advanceAmount, 0))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Amount in Words (কথায়) */}
          {totalAmount > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-3.5 py-2 text-xs text-slate-800">
              <span className="font-bold text-slate-900">{isBn ? 'কথায়: ' : 'In Words: '}</span>
              <span className="italic font-semibold text-brand-900">{numberToWords(totalAmount, isBn ? 'bn' : 'en')}</span>
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
  )

  return (
    <div className="grid gap-5 xl:h-[calc(100vh-6rem)] xl:min-h-0 xl:overflow-hidden">
      <div className="grid gap-5 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(0,1.24fr)_minmax(0,0.96fr)] 2xl:grid-cols-[minmax(0,1.28fr)_minmax(0,0.95fr)]">
        <Card className="no-print relative z-10 xl:h-full xl:min-h-0 xl:overflow-y-auto">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">{isBn ? 'কোটেশন ফর্ম' : 'Quotation Form'}</h2>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                Total: {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          <div className="grid gap-5">
            {convertedInvoiceNumber && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-950">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">
                      {isBn ? 'এই কোটেশনটি ইনভয়েসে রূপান্তরিত হয়েছে' : 'Converted to Invoice'}
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      Invoice #{convertedInvoiceNumber} {convertedAt ? `• ${formatDocumentDate(convertedAt)}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition"
                  onClick={() => {
                    loadDocuments().then((docs) => {
                      const inv = docs.find((d) => d.number === convertedInvoiceNumber || d.id === convertedInvoiceId)
                      if (inv) {
                        navigate('/invoice', { state: { prefillDocument: inv } })
                      } else {
                        navigate('/invoice')
                      }
                    })
                  }}
                  type="button"
                >
                  <FileText size={14} />
                  <span>{isBn ? 'ইনভয়েসটি খুলুন →' : 'Open Converted Invoice →'}</span>
                </button>
              </div>
            )}

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">{isBn ? 'ডকুমেন্ট বিস্তারিত' : 'Document Details'}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <Input id="quotation-number" label={isBn ? 'কোটেশন নম্বর' : 'Quotation Number'} readOnly value={documentNumber} />
                <Input
                  id="quotation-date"
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
                  id="quotation-client"
                  label={isBn ? 'ক্লায়েন্টের নাম' : 'Client Name'}
                  list="quotation-client-suggestions"
                  onChange={handleClientNameChange}
                  value={clientName}
                />
                <datalist id="quotation-client-suggestions">
                  {clientSuggestions.map((client) => (
                    <option key={client.id} value={client.clientName}>
                      {client.phone || client.address || client.lastDocumentNumber}
                    </option>
                  ))}
                </datalist>
                <Input
                  id="quotation-phone"
                  label={isBn ? 'ফোন নম্বর' : 'Phone Number'}
                  list="quotation-phone-suggestions"
                  onChange={handlePhoneChange}
                  value={phone}
                />
                <datalist id="quotation-phone-suggestions">
                  {clientSuggestions
                    .filter((client) => client.phone)
                    .map((client) => (
                      <option key={client.id} value={client.phone}>
                        {client.clientName}
                      </option>
                    ))}
                </datalist>
                <TextArea
                  className="md:col-span-2"
                  id="quotation-address"
                  label={isBn ? 'ঠিকানা' : 'Address'}
                  onChange={(event) => setAddress(event.target.value)}
                  value={address}
                />
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
              <h3 className="text-sm font-bold text-slate-950">{isBn ? 'কোটেশন আইটেম' : 'Quotation Items'}</h3>
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
                    id={`quotation-item-${item.id}`}
                    label={isBn ? 'টাইপ / সাইজ বিবরণ' : 'Type / Size Description'}
                    onChange={(event) => updateItem(item.id, 'description', event.target.value)}
                    value={item.description}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      id={`quotation-quantity-${item.id}`}
                      label={isBn ? 'পরিমাণ' : 'Quantity'}
                      min="0"
                      onChange={(event) => updateItem(item.id, 'quantity', event.target.value)}
                      type="number"
                      value={item.quantity}
                    />
                    <Input
                      id={`quotation-rate-${item.id}`}
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
                      id={`quotation-amount-${item.id}`}
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
              <h3 className="text-sm font-bold text-slate-950">{isBn ? 'মোট হিসাব' : 'Totals'}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input id="quotation-subtotal" label={isBn ? 'সাবটোটাল' : 'Subtotal'} readOnly type="number" value={formatDecimal(subtotal)} />
                <Input
                  id="quotation-discount"
                  label={isBn ? 'ডিসকাউন্ট' : 'Discount'}
                  min="0"
                  onBlur={() => setDiscount(formatDecimal(discount))}
                  onChange={(event) => setDiscount(event.target.value)}
                  step="0.01"
                  type="number"
                  value={discount}
                />
                <Input
                  id="quotation-vat-percent"
                  label={isBn ? 'ভ্যাট (%)' : 'VAT (%)'}
                  min="0"
                  onChange={(event) => setVatPercent(event.target.value)}
                  step="0.01"
                  type="number"
                  value={vatPercent}
                />
                <Input
                  id="quotation-vat-amount"
                  label={isBn ? 'ভ্যাটের পরিমাণ' : 'VAT Amount'}
                  readOnly
                  type="number"
                  value={formatDecimal(vatAmount)}
                />
                <Input
                  id="quotation-other-charge-name"
                  label={isBn ? 'অন্য চার্জের নাম' : 'Other Charge Name'}
                  onChange={(event) => setOtherChargeName(event.target.value)}
                  value={otherChargeName}
                />
                <Input
                  id="quotation-other-charge-amount"
                  label={isBn ? 'অন্য চার্জের পরিমাণ' : 'Other Charge Amount'}
                  min="0"
                  onBlur={() => setOtherChargeAmount(formatDecimal(otherChargeAmount))}
                  onChange={(event) => setOtherChargeAmount(event.target.value)}
                  step="0.01"
                  type="number"
                  value={otherChargeAmount}
                />
                <Input id="quotation-total" label={isBn ? 'গ্র্যান্ড টোটাল' : 'Grand Total'} readOnly type="number" value={formatDecimal(totalAmount)} />
                <Input
                  id="quotation-advance-percent"
                  label={isBn ? 'অ্যাডভান্স (%)' : 'Advance Payment (%)'}
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
                  label={isBn ? 'অ্যাডভান্স টাকা' : 'Advance Amount'}
                  readOnly
                  type="number"
                  value={formatDecimal(advanceAmount)}
                />
              </div>
            </section>

            <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h3 className="text-sm font-bold text-slate-950">{isBn ? 'নোট ও শর্তাবলী' : 'Notes and Terms'}</h3>
              <TextArea
                id="quotation-notes"
                label={isBn ? 'নোট' : 'Notes'}
                onChange={(event) => setNotes(event.target.value)}
                value={notes}
              />
              <TextArea
                id="quotation-terms"
                label={isBn ? 'শর্তাবলী' : 'Terms and Conditions'}
                onChange={(event) => setTerms(event.target.value)}
                value={terms}
              />
            </section>
          </div>

          <div className="document-action-grid form-action-sticky mt-5">
            <Button onClick={saveQuotation} type="button" variant="secondary">
              {isBn ? 'কোটেশন সেভ' : 'Save Quotation'}
            </Button>
            <Button className="xl:hidden" onClick={() => setMobilePreviewOpen(true)} type="button" variant="secondary">
              <Eye size={16} />
              <span>{isBn ? 'প্রিভিউ দেখুন' : 'View Sheet'}</span>
            </Button>
            <Button onClick={savePdfQuotation} type="button" variant="secondary">
              {isBn ? 'PDF সেভ' : 'Save PDF'}
            </Button>
            <Button onClick={saveQuotationAsCopy} type="button" variant="secondary">
              {isBn ? 'নতুন কপি সেভ' : 'Save as Copy'}
            </Button>
            <Button onClick={resetQuotationForm} type="button" variant="secondary">
              {isBn ? 'নতুন কোটেশন' : 'New Quotation'}
            </Button>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200">
            <Button
              className="w-full justify-center py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-soft"
              onClick={openConvertModal}
              type="button"
              variant="primary"
            >
              <FileCheck size={16} />
              <span>{isBn ? 'অর্ডার গ্রহণ ও ইনভয়েস তৈরি (Send to Factory)' : 'Convert to Invoice & Send to Production'}</span>
            </Button>
          </div>
          {saveStatus ? (
            <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">{saveStatus}</p>
          ) : null}
          {formError ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{formError}</p> : null}
        </Card>

        <Card className="print-area relative z-0 hidden bg-white p-0 xl:block xl:h-full xl:min-h-0 xl:overflow-y-auto">
          {renderQuotationSheetContent()}
        </Card>
      </div>

      {/* Mobile Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={mobilePreviewOpen}
        onClose={() => setMobilePreviewOpen(false)}
        onPrintPdf={savePdfQuotation}
        title={isBn ? `কোটেশন #${documentNumber}` : `Quotation #${documentNumber}`}
      >
        {renderQuotationSheetContent()}
      </DocumentPreviewModal>

      {/* Convert Quotation to Invoice & Confirm Production Modal */}
      <Modal
        isOpen={convertModalOpen}
        onClose={() => setConvertModalOpen(false)}
        title={isBn ? 'কোটেশন থেকে ইনভয়েস ও কারখানায় অর্ডার নিশ্চিতকরণ' : 'Convert Quotation to Invoice & Confirm Production'}
      >
        <form className="space-y-4 text-xs" onSubmit={handleConfirmConvertToInvoice}>
          {/* Order Snapshot Card */}
          <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span>Client: <strong className="text-brand-900">{clientName || 'Client Name'}</strong></span>
              <span>Quote Ref: <strong className="text-slate-900 font-mono">{documentNumber}</strong></span>
            </div>
            <div className="flex items-center justify-between border-t border-brand-200/80 pt-2 text-xs">
              <span>Total Order Value:</span>
              <span className="font-black text-sm text-slate-900">{formatCurrency(totalAmount)}</span>
            </div>
            {advanceAmount > 0 && (
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>Quotation Suggested Advance ({Number(advancePercent || 0).toFixed(0)}%):</span>
                <span className="font-semibold text-slate-800">{formatCurrency(advanceAmount)}</span>
              </div>
            )}
          </div>

          {/* Advance Payment Input (Asked first as requested by user) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                {isBn ? '১. অগ্রিম পেমেন্ট প্রাপ্তি' : '1. Actual Advance Payment Received'}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Enter actual received amount</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                id="convert-advance-amount"
                label={isBn ? 'গৃহীত অগ্রিম টাকা (BDT)' : 'Advance Received Now (BDT)'}
                min="0"
                onChange={(e) => setConvertForm({ ...convertForm, advancePaid: e.target.value })}
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={convertForm.advancePaid}
              />

              <Select
                id="convert-payment-method"
                label={isBn ? 'পেমেন্ট মেথড' : 'Payment Method'}
                onChange={(e) => setConvertForm({ ...convertForm, paymentMethod: e.target.value })}
                value={convertForm.paymentMethod}
              >
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Mobile Banking (bKash / Nagad)</option>
                <option>Cheque</option>
              </Select>
            </div>

            {/* Live Financial Calculation Pill */}
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-white p-2.5 text-center border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">Invoiced Total</span>
                <span className="font-bold text-slate-900 block mt-0.5">{formatCurrency(totalAmount)}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-600 font-bold block">Paid Advance</span>
                <span className="font-bold text-emerald-700 block mt-0.5">
                  {formatCurrency(Number(convertForm.advancePaid || 0))}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-rose-600 font-bold block">Remaining Due</span>
                <span className="font-bold text-rose-700 block mt-0.5">
                  {formatCurrency(Math.max(totalAmount - Number(convertForm.advancePaid || 0), 0))}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Factory Production Setup */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                {isBn ? '২. কারখানা প্রোডাকশন লাইন' : '2. Factory Production Line'}
              </span>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer rounded-lg bg-white p-2.5 border border-slate-200">
              <input
                checked={convertForm.sendToProduction}
                className="h-4 w-4 rounded text-brand-600 focus:ring-brand-500"
                onChange={(e) => setConvertForm({ ...convertForm, sendToProduction: e.target.checked })}
                type="checkbox"
              />
              <div>
                <span className="text-xs font-bold text-slate-900">
                  {isBn ? 'কারখানা প্রোডাকশনে যুক্ত করুন (Order Confirmed)' : 'Queue Order directly in Factory Production Pipeline'}
                </span>
                <p className="text-[11px] text-slate-500">
                  {isBn ? 'অর্ডারটি প্রোডাকশন বোর্ডে স্বয়ংক্রিয়ভাবে দেখা যাবে।' : 'Will be visible on the Production Board under Order Confirmed stage.'}
                </p>
              </div>
            </label>

            <Input
              id="convert-target-date"
              label={isBn ? 'সম্ভাব্য ডেলিভারির তারিখ (Optional)' : 'Target Delivery Date (Optional)'}
              onChange={(e) => setConvertForm({ ...convertForm, targetDeliveryDate: e.target.value })}
              type="date"
              value={convertForm.targetDeliveryDate}
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <Button onClick={() => setConvertModalOpen(false)} type="button" variant="secondary">
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              disabled={converting}
              type="submit"
              variant="primary"
            >
              <FileCheck size={14} />
              <span>{converting ? 'Creating Invoice...' : 'Generate Invoice & Queue Order'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
