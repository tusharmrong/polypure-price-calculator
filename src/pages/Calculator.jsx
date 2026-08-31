import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Calculator as CalculatorIcon,
  Check,
  Copy,
  Eye,
  Layers,
  MessageSquare,
  Package,
  RotateCcw,
  Scale,
  Share2,
  Sparkles,
  SquarePen,
  TrendingUp
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import { createDocumentDraft, saveCalculatorDraft } from '../utils/calculatorDraft.js'
import { loadValue, saveValue } from '../utils/storage.js'
import { loadCompanySettings } from '../utils/companySettings.js'
import { useToast } from '../utils/toast.jsx'
import { useUiLanguage } from '../utils/uiLanguage.js'

const bagModes = {
  shopping: {
    title: 'Shopping Bag',
    sectionTitle: 'Shopping Bag Details',
    extraLabel: 'Folding',
    thickness: 17,
    showAdhesive: false,
    showHandle: true
  },
  courier: {
    title: 'Courier Bag',
    sectionTitle: 'Courier Bag Details',
    extraLabel: 'Flap',
    thickness: 13,
    showAdhesive: true,
    showHandle: false
  }
}

const standardSizes = {
  shopping: [
    { label: '8" × 10" + 3"', width: '8', height: '10', extraMeasure: '3' },
    { label: '10" × 12" + 3"', width: '10', height: '12', extraMeasure: '3' },
    { label: '12" × 14" + 3"', width: '12', height: '14', extraMeasure: '3' },
    { label: '14" × 16" + 3"', width: '14', height: '16', extraMeasure: '3' },
    { label: '16" × 18" + 3"', width: '16', height: '18', extraMeasure: '3' },
    { label: '18" × 20" + 3"', width: '18', height: '20', extraMeasure: '3' }
  ],
  courier: [
    { label: '9" × 12" + 2"', width: '9', height: '12', extraMeasure: '2' },
    { label: '10" × 14" + 2"', width: '10', height: '14', extraMeasure: '2' },
    { label: '12" × 16" + 2"', width: '12', height: '16', extraMeasure: '2' },
    { label: '14" × 18" + 2.5"', width: '14', height: '18', extraMeasure: '2.5' },
    { label: '16" × 20" + 2.5"', width: '16', height: '20', extraMeasure: '2.5' }
  ]
}

const presetQuantities = ['2000', '3000', '5000', '10000', '20000']

const initialValues = {
  width: '',
  height: '',
  extraMeasure: '',
  thickness: '17',
  quantity: '140',
  blockCharge: '',
  printingCharge: '',
  adhesiveCost: '',
  handleCost: '2',
  profit: '',
  discount: ''
}

const calculatorMemoryKey = 'calculatorMemory'

function getDefaultPrintingCharge(mode, printColorMode, customRates = {}) {
  const shoppingBase = Number(customRates.shoppingPrintRate || 0.4)
  const courierBase = Number(customRates.courierPrintRate || 0.3)
  const baseCharge = mode === 'shopping' ? shoppingBase : courierBase
  return (printColorMode === '2' ? baseCharge * 2 : baseCharge).toFixed(2)
}

function loadCalculatorMemory() {
  const saved = loadValue(calculatorMemoryKey, null)
  const safeMode = saved?.mode && bagModes[saved.mode] ? saved.mode : 'shopping'
  const safePrintColorMode = saved?.printColorMode === '2' ? '2' : '1'

  return {
    mode: safeMode,
    values: {
      ...initialValues,
      ...(saved?.values || {}),
      thickness: String(saved?.values?.thickness || bagModes[safeMode].thickness),
      printingCharge: String(saved?.values?.printingCharge || getDefaultPrintingCharge(safeMode, safePrintColorMode))
    },
    orderQuantity: String(saved?.orderQuantity || '2000'),
    printColorMode: safePrintColorMode,
    handleEnabled: Boolean(saved?.handleEnabled),
    adhesiveCostTouched: Boolean(saved?.adhesiveCostTouched),
    submitted: saved?.submitted ?? true
  }
}

function numberValue(value) {
  if (value === '') return 0
  return Number(value)
}

function money(value) {
  return `৳${Number(value || 0).toFixed(2)}`
}

function thicknessAsSheetText(value) {
  const numericValue = Number(value || 0)
  return `0.${String(Math.round(numericValue)).padStart(2, '0')}mm`
}

function calculateAdhesiveCost(width, ratePerInch = 0.05) {
  const numericWidth = Number(width || 0)
  const numericRate = Number(ratePerInch || 0.05)
  if (!Number.isFinite(numericWidth) || numericWidth <= 0) return ''
  return (numericWidth * numericRate).toFixed(2)
}

function ResultLine({ label, value, strong = false, subtitle = '' }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2.5 border border-slate-100">
      <div>
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
      </div>
      <span className={`text-right text-xs ${strong ? 'font-bold text-brand-700' : 'font-semibold text-slate-900'}`}>
        {value}
      </span>
    </div>
  )
}

export default function Calculator() {
  const companySettings = useMemo(() => loadCompanySettings(), [])
  const adhesiveRate = Number(companySettings.adhesiveRatePerInch || 0.05)
  const [showFloatingStrip, setShowFloatingStrip] = useState(true)
  const resultsCardRef = useRef(null)

  useEffect(() => {
    const el = resultsCardRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the full results & document buttons are visible, hide floating strip!
        setShowFloatingStrip(!entry.isIntersecting)
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const { language } = useUiLanguage()
  const isBn = language === 'bn'
  const { showToast } = useToast()
  const navigate = useNavigate()
  const savedMemory = useMemo(() => loadCalculatorMemory(), [])
  const [mode, setMode] = useState(savedMemory.mode)
  const [values, setValues] = useState(savedMemory.values)
  const [orderQuantity, setOrderQuantity] = useState(savedMemory.orderQuantity)
  const [printColorMode, setPrintColorMode] = useState(savedMemory.printColorMode)
  const [handleEnabled, setHandleEnabled] = useState(savedMemory.handleEnabled)
  const [adhesiveCostTouched, setAdhesiveCostTouched] = useState(savedMemory.adhesiveCostTouched)
  const [submitted, setSubmitted] = useState(savedMemory.submitted)

  const activeMode = bagModes[mode]
  const currentPresets = standardSizes[mode] || []

  const ui = {
    calculator: isBn ? 'ক্যালকুলেটর' : 'Calculator',
    width: isBn ? 'প্রস্থ (Width in)' : 'Width (in)',
    height: isBn ? 'উচ্চতা / লেন্থ (Height in)' : 'Height / Length (in)',
    thickness: isBn ? 'থিকনেস / মাইক্রন' : 'Thickness / Micron',
    poundRate: isBn ? 'পাউন্ড রেট (Tk/lb)' : 'Pound Rate (Tk/lb)',
    blockCharge: isBn ? 'ব্লক চার্জ (Block)' : 'Block Charge',
    printingCharge: isBn ? 'প্রিন্টিং চার্জ (Print/pc)' : 'Printing Charge',
    adhesiveCost: isBn ? 'গাম চার্জ (Gum/pc)' : 'Adhesive Cost',
    profit: isBn ? 'প্রফিট (Profit/pc)' : 'Profit (Tk/pc)',
    discount: isBn ? 'ডিসকাউন্ট (Discount/pc)' : 'Discount (Tk/pc)',
    addHandle: isBn ? 'হ্যান্ডেল চার্জ যোগ করুন (+Handle)' : 'Add Handle Cost',
    handleCost: isBn ? 'হ্যান্ডেল চার্জ (Tk/pc)' : 'Handle Cost (Tk/pc)',
    calculate: isBn ? 'হিসাব সম্পন্ন' : 'Calculate',
    reset: isBn ? 'রিসেট' : 'Reset',
    result: isBn ? 'দাম ও খরচের হিসাব' : 'Costing & Price Result',
    resultHint: isBn ? 'ব্যাগের সাইজ ও তথ্য দিলে স্বয়ংক্রিয়ভাবে দাম হিসাব হবে।' : 'Enter dimensions to see price & material calculations.',
    createQuotation: isBn ? 'কোটেশন তৈরি করুন' : 'Create Quotation',
    createInvoice: isBn ? 'ইনভয়েস তৈরি করুন' : 'Create Invoice',
    createReceipt: isBn ? 'মানি রিসিপ্ট তৈরি করুন' : 'Create Money Receipt',
    calcFirst: isBn ? 'ডকুমেন্ট তৈরি করতে সঠিক মাপ দিন।' : 'Enter valid dimensions to generate document.'
  }

  // Core Calculations
  const result = useMemo(() => {
    const width = numberValue(values.width)
    const height = numberValue(values.height)
    const extraMeasure = numberValue(values.extraMeasure)
    const thickness = numberValue(values.thickness)
    const poundRate = numberValue(values.quantity)
    const blockCharge = numberValue(values.blockCharge)
    const printingCharge = numberValue(values.printingCharge)
    const adhesiveCost = mode === 'courier' ? numberValue(values.adhesiveCost) : 0
    const handleCost = mode === 'shopping' && handleEnabled ? numberValue(values.handleCost) : 0
    const profit = numberValue(values.profit)
    const discount = numberValue(values.discount)
    const qty = numberValue(orderQuantity) || 2000

    if (!submitted) return { status: 'idle' }

    if ([width, height, thickness, poundRate].some((value) => Number.isNaN(value) || value <= 0)) {
      return {
        status: 'error',
        message: isBn
          ? 'অনুগ্রহ করে প্রস্থ, উচ্চতা, থিকনেস এবং পাউন্ড রেট সঠিকভাবে ইনপুট দিন।'
          : 'Width, height, thickness, and pound rate must be greater than 0.'
      }
    }

    if (Number.isNaN(extraMeasure) || extraMeasure < 0) {
      return {
        status: 'error',
        message: `${activeMode.extraLabel} cannot be negative.`
      }
    }

    // Pieces per Pound Formula
    const pieces =
      mode === 'shopping'
        ? 75000 / (width + extraMeasure) / height / thickness
        : 75000 / width / (height + extraMeasure) / thickness

    if (!Number.isFinite(pieces) || pieces <= 0) {
      return {
        status: 'error',
        message: 'The entered dimensions produced an invalid result. Please check the values.'
      }
    }

    // Unit Economics
    const basePrice = poundRate / pieces
    const finalPrice = basePrice + blockCharge + printingCharge + adhesiveCost + handleCost + profit - discount
    const sizeDescription = `${width}" × ${height}" + ${extraMeasure}" ${activeMode.extraLabel}`

    // Batch Order Volume Economics
    const totalRawMaterialLbs = qty / pieces
    const totalRawMaterialCost = totalRawMaterialLbs * poundRate
    const totalPrintCost = qty * printingCharge
    const totalHandleCost = qty * handleCost
    const totalAdhesiveCost = qty * adhesiveCost
    const totalOrderCost = totalRawMaterialCost + totalPrintCost + totalHandleCost + totalAdhesiveCost + blockCharge
    const totalOrderSale = qty * finalPrice
    const estimatedOrderProfit = totalOrderSale - totalOrderCost
    const marginPercent = totalOrderSale > 0 ? (estimatedOrderProfit / totalOrderSale) * 100 : 0

    return {
      status: 'ready',
      pieces,
      basePrice,
      blockCharge,
      printingCharge,
      adhesiveCost,
      handleCost,
      profit,
      discount,
      finalPrice,
      sizeDescription,
      // Batch metrics
      orderQuantity: qty,
      totalRawMaterialLbs,
      totalRawMaterialCost,
      totalPrintCost,
      totalHandleCost,
      totalAdhesiveCost,
      totalOrderCost,
      totalOrderSale,
      estimatedOrderProfit,
      marginPercent
    }
  }, [activeMode.extraLabel, handleEnabled, isBn, mode, orderQuantity, submitted, values])

  // Save to Local Memory
  useEffect(() => {
    saveValue(calculatorMemoryKey, {
      mode,
      values,
      orderQuantity,
      printColorMode,
      handleEnabled,
      adhesiveCostTouched,
      submitted
    })
  }, [adhesiveCostTouched, handleEnabled, mode, orderQuantity, printColorMode, submitted, values])

  // Auto-calculate adhesive cost for courier bags
  useEffect(() => {
    if (mode !== 'courier') return
    if (adhesiveCostTouched) return

    const nextAdhesiveCost = calculateAdhesiveCost(values.width, adhesiveRate)
    if (values.adhesiveCost === nextAdhesiveCost) return

    setValues((current) => ({
      ...current,
      adhesiveCost: nextAdhesiveCost
    }))
  }, [adhesiveCostTouched, mode, values.width, values.adhesiveCost])

  const updatePrintColorMode = (nextMode) => {
    const safeNextMode = nextMode === '2' ? '2' : '1'
    setPrintColorMode(safeNextMode)
    setValues((current) => ({
      ...current,
      printingCharge: getDefaultPrintingCharge(mode, safeNextMode, companySettings)
    }))
  }

  const updateValue = (field, value) => {
    if (field === 'adhesiveCost') {
      setAdhesiveCostTouched(true)
    }
    setSubmitted(true)
    setValues((current) => ({ ...current, [field]: value }))
  }

  // Apply Standard Size Preset
  const applySizePreset = (preset) => {
    setValues((current) => ({
      ...current,
      width: preset.width,
      height: preset.height,
      extraMeasure: preset.extraMeasure
    }))
    setSubmitted(true)
    showToast(`Applied standard size: ${preset.label}`, 'success')
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setHandleEnabled(false)
    setAdhesiveCostTouched(false)
    setValues((current) => ({
      ...current,
      thickness: String(bagModes[nextMode].thickness),
      printingCharge: getDefaultPrintingCharge(nextMode, printColorMode, companySettings),
      adhesiveCost: '',
      handleCost: '2'
    }))
    setSubmitted(true)
  }

  const reset = () => {
    setHandleEnabled(false)
    setAdhesiveCostTouched(false)
    setPrintColorMode('1')
    setValues({
      ...initialValues,
      thickness: String(activeMode.thickness),
      printingCharge: getDefaultPrintingCharge(mode, '1', companySettings)
    })
    setOrderQuantity('2000')
    setSubmitted(true)
  }

  // Copy Result Text
  const copyResult = async () => {
    if (result.status !== 'ready') return

    const bagTitle =
      mode === 'shopping'
        ? handleEnabled
          ? 'Handled Shopping Bag'
          : 'D-cut Shopping Bag'
        : 'Courier Bag'
    const minimumOrderQuantity = printColorMode === '2' ? 3000 : 2000
    const qty = numberValue(orderQuantity) || minimumOrderQuantity

    const summary = [
      `🛍️ Poly Pure - ${bagTitle}`,
      `📏 Size: ${result.sizeDescription}`,
      `🏷️ Thickness: ${thicknessAsSheetText(values.thickness)}`,
      `🎨 Print: ${printColorMode} Color`,
      `💵 Price Per Piece: ৳${Number(result.finalPrice || 0).toFixed(2)}/-`,
      `📦 Total for ${qty.toLocaleString()} pcs: ৳${(qty * result.finalPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}/-`,
      `✅ Minimum Order Quantity: ${minimumOrderQuantity} pcs`
    ].join('\n')

    await navigator.clipboard?.writeText(summary)
    showToast('Quotation summary copied to clipboard!', 'success')
  }

  // Direct WhatsApp Share
  const shareWhatsApp = () => {
    if (result.status !== 'ready') return

    const bagTitle =
      mode === 'shopping'
        ? handleEnabled
          ? 'হ্যান্ডেল শপিং ব্যাগ (Handled Shopping Bag)'
          : 'ডি-কাট শপিং ব্যাগ (D-cut Shopping Bag)'
        : 'কুরিয়ার ব্যাগ (Courier Bag)'
    const minQty = printColorMode === '2' ? 3000 : 2000
    const qty = numberValue(orderQuantity) || minQty

    const message = `*পলিপিউর প্রিন্টিং অ্যান্ড প্যাকেজিং* 🛍️\n*Poly Pure - Price Quotation*\n--------------------------------\n📦 *পণ্যের ধরণ:* ${bagTitle}\n📏 *সাইজ:* ${result.sizeDescription}\n🏷️ *থিকনেস:* ${thicknessAsSheetText(values.thickness)}\n🎨 *প্রিন্ট:* ${printColorMode} Color Print\n\n💵 *পিস প্রতি মূল্য:* ৳${Number(result.finalPrice || 0).toFixed(2)}/-\n📊 *অর্ডার পরিমাণ:* ${qty.toLocaleString()} পিস\n💰 *মোট বিল:* ৳${(qty * result.finalPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/-\n\n✅ *ন্যূনতম অর্ডার:* ${minQty.toLocaleString()} পিস`

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const openDocument = (path) => {
    if (result.status !== 'ready') return

    const draft = createDocumentDraft({
      mode,
      activeMode,
      values,
      result,
      handleEnabled,
      orderQuantity: numberValue(orderQuantity) || 2000
    })

    saveCalculatorDraft(draft)
    navigate(path, { state: { calculatorDraft: draft } })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.85fr)]">
      {/* Left Form: Calculator Inputs */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <CalculatorIcon size={18} className="text-brand-600" />
              <h2 className="text-lg font-black text-slate-950">
                {isBn
                  ? mode === 'shopping'
                    ? 'শপিং ব্যাগ প্রাইস ক্যালকুলেটর'
                    : 'কুরিয়ার ব্যাগ প্রাইস ক্যালকুলেটর'
                  : activeMode.sectionTitle}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isBn ? 'স্বয়ংক্রিয় ফর্মুলায় সঠিক ব্যাগ মূল্য ও মেটেরিয়াল পাউন্ড হিসাব' : 'Automatic plastic extrusion costing & per-piece price calculation'}
            </p>
          </div>

          {/* Mode Switcher Pill */}
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 border border-slate-200">
            {Object.entries(bagModes).map(([key, item]) => (
              <button
                className={`min-h-9 rounded-lg px-3 text-xs font-bold transition ${
                  mode === key ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                key={key}
                onClick={() => changeMode(key)}
                type="button"
              >
                {isBn
                  ? key === 'shopping'
                    ? '🛍️ শপিং ব্যাগ'
                    : '📦 কুরিয়ার ব্যাগ'
                  : item.title}
              </button>
            ))}
          </div>
        </div>

        {/* 1-Click Standard Size Chips */}
        <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50/40 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={13} className="text-brand-600" />
            <span className="text-[11px] font-bold text-brand-900 uppercase tracking-wider">
              {isBn ? 'স্ট্যান্ডার্ড সাইজ প্রিসেট (১-ক্লিক)' : 'Standard Size Presets (1-Click)'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {currentPresets.map((preset) => {
              const isSelected =
                values.width === preset.width &&
                values.height === preset.height &&
                values.extraMeasure === preset.extraMeasure
              return (
                <button
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition border ${
                    isSelected
                      ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-brand-300 hover:bg-brand-50'
                  }`}
                  key={preset.label}
                  onClick={() => applySizePreset(preset)}
                  type="button"
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            setSubmitted(true)
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              id="width"
              label={ui.width}
              min="0"
              onChange={(event) => updateValue('width', event.target.value)}
              placeholder="e.g. 10"
              step="0.01"
              type="number"
              value={values.width}
            />
            <Input
              id="height"
              label={ui.height}
              min="0"
              onChange={(event) => updateValue('height', event.target.value)}
              placeholder="e.g. 14"
              step="0.01"
              type="number"
              value={values.height}
            />
            <Input
              id="extra-measure"
              label={isBn ? (mode === 'shopping' ? 'ফোল্ডিং (Folding in)' : 'ফ্ল্যাপ (Flap in)') : `${activeMode.extraLabel} (in)`}
              min="0"
              onChange={(event) => updateValue('extraMeasure', event.target.value)}
              placeholder={isBn ? (mode === 'shopping' ? 'e.g. 3' : 'e.g. 2') : (mode === 'shopping' ? 'e.g. 3' : 'e.g. 2')}
              step="0.01"
              type="number"
              value={values.extraMeasure}
            />
            <Input
              id="thickness"
              label={ui.thickness}
              min="0"
              onChange={(event) => updateValue('thickness', event.target.value)}
              placeholder="e.g. 17"
              step="0.01"
              type="number"
              value={values.thickness}
            />
            <Input
              id="quantity"
              label={ui.poundRate}
              min="0"
              onChange={(event) => updateValue('quantity', event.target.value)}
              placeholder="e.g. 140"
              step="0.01"
              type="number"
              value={values.quantity}
            />
            <Input
              id="block-charge"
              label={ui.blockCharge}
              min="0"
              onChange={(event) => updateValue('blockCharge', event.target.value)}
              placeholder="0"
              step="0.01"
              type="number"
              value={values.blockCharge}
            />

            {/* Print Color Mode */}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700" htmlFor="printing-charge">
                  {ui.printingCharge}
                </label>
                <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                  <button
                    className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold transition ${
                      printColorMode === '1' ? 'bg-white text-brand-700 shadow-2xs' : 'text-slate-600'
                    }`}
                    onClick={() => updatePrintColorMode('1')}
                    type="button"
                  >
                    1 Color
                  </button>
                  <button
                    className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold transition ${
                      printColorMode === '2' ? 'bg-white text-brand-700 shadow-2xs' : 'text-slate-600'
                    }`}
                    onClick={() => updatePrintColorMode('2')}
                    type="button"
                  >
                    2 Color
                  </button>
                </div>
              </div>
              <input
                className="w-full min-w-0 min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                id="printing-charge"
                min="0"
                onChange={(event) => updateValue('printingCharge', event.target.value)}
                placeholder="0.40"
                step="0.01"
                type="number"
                value={values.printingCharge}
              />
            </div>

            {mode === 'courier' && (
              <Input
                id="adhesive-cost"
                label={ui.adhesiveCost}
                min="0"
                onChange={(event) => updateValue('adhesiveCost', event.target.value)}
                placeholder="0.50"
                step="0.01"
                type="number"
                value={values.adhesiveCost}
              />
            )}

            <Input
              id="profit"
              label={ui.profit}
              min="0"
              onChange={(event) => updateValue('profit', event.target.value)}
              placeholder="0.50"
              step="0.01"
              type="number"
              value={values.profit}
            />

            <Input
              id="discount"
              label={ui.discount}
              min="0"
              onChange={(event) => updateValue('discount', event.target.value)}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={values.discount}
            />
          </div>

          {/* Handle Option for Shopping Bags */}
          {activeMode.showHandle && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer">
                <input
                  checked={handleEnabled}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                  onChange={(event) => setHandleEnabled(event.target.checked)}
                  type="checkbox"
                />
                <span>{ui.addHandle}</span>
              </label>
              {handleEnabled && (
                <div className="mt-2.5 max-w-xs">
                  <Input
                    id="handle-cost"
                    label={ui.handleCost}
                    min="0"
                    onChange={(event) => updateValue('handleCost', event.target.value)}
                    step="0.01"
                    type="number"
                    value={values.handleCost}
                  />
                </div>
              )}
            </div>
          )}

          {/* Order Quantity Tier Selector */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800" htmlFor="order-quantity">
                {isBn ? 'অর্ডার কোয়ান্টিটি (Order Quantity pcs)' : 'Order Quantity (pcs)'}
              </label>
              <span className="text-[11px] text-slate-500 font-medium">For Batch & Lbs calculation</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                className="w-full min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                id="order-quantity"
                min="100"
                onChange={(e) => setOrderQuantity(e.target.value)}
                placeholder="2000"
                step="100"
                type="number"
                value={orderQuantity}
              />
            </div>

            {/* Quick Quantity Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {presetQuantities.map((q) => (
                <button
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition border ${
                    orderQuantity === q
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  key={q}
                  onClick={() => setOrderQuantity(q)}
                  type="button"
                >
                  {Number(q).toLocaleString()} pcs
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <Button className="flex-1 text-xs" type="submit">
              <CalculatorIcon size={16} />
              <span>{ui.calculate}</span>
            </Button>
            <Button onClick={reset} type="button" variant="secondary">
              <RotateCcw size={15} />
              <span>{ui.reset}</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Right Column: Live Results & Quick Action Hub */}
      <div ref={resultsCardRef} className="grid content-start gap-5" id="calc-results-card">
        <Card>
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-black text-slate-950">{ui.result}</h3>
            {result.status === 'ready' && (
              <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 border border-brand-200">
                Live Calculated
              </span>
            )}
          </div>

          {result.status === 'idle' ? (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500">
              {ui.resultHint}
            </div>
          ) : null}

          {result.status === 'error' ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
              {result.message}
            </div>
          ) : null}

          {result.status === 'ready' ? (
            <div className="space-y-3">
              {/* Unit Economics Box */}
              <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/70 via-white to-brand-50/40 p-4 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                  {isBn ? 'পিস প্রতি চূড়ান্ত বিক্রয় মূল্য' : 'Final Price Per Piece'}
                </p>
                <p className="mt-1 text-3xl font-black text-brand-900 font-mono">
                  {money(result.finalPrice)}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  {result.sizeDescription} • {thicknessAsSheetText(values.thickness)}
                </p>
              </div>

              {/* Batch Order Financials Ribbon */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-200/80 pb-1.5">
                  <span>Batch: {Number(result.orderQuantity).toLocaleString()} pcs</span>
                  <span className="text-brand-700 text-sm font-black">{money(result.totalOrderSale)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white p-2 border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Raw Material</span>
                    <span className="font-bold text-slate-900 block mt-0.5">
                      {result.totalRawMaterialLbs.toFixed(1)} lbs
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      @ ৳{values.quantity}/lb = {money(result.totalRawMaterialCost)}
                    </span>
                  </div>

                  <div className="rounded-lg bg-white p-2 border border-slate-200/80">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase block">Est. Net Profit</span>
                    <span className="font-bold text-emerald-700 block mt-0.5">
                      {money(result.estimatedOrderProfit)}
                    </span>
                    <span className="text-[10px] text-emerald-600 block font-semibold">
                      {result.marginPercent.toFixed(1)}% margin
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Lines */}
              <div className="space-y-1.5 text-xs">
                <ResultLine label="Pieces Per Pound (lbs)" value={`${result.pieces.toFixed(2)} pcs/lb`} />
                <ResultLine label={`Base Plastic Cost (${values.quantity} Tk/lb)`} value={money(result.basePrice)} />
                {Number(result.blockCharge) > 0 && <ResultLine label="Block Charge" value={money(result.blockCharge)} />}
                <ResultLine label="Printing Charge" value={money(result.printingCharge)} subtitle={`${printColorMode} Color`} />
                {mode === 'courier' && <ResultLine label="Adhesive / Gumming" value={money(result.adhesiveCost)} />}
                {mode === 'shopping' && handleEnabled && <ResultLine label="Handle Cost" value={money(result.handleCost)} />}
                {Number(result.profit) > 0 && <ResultLine label="Unit Profit Margin" value={money(result.profit)} />}
                {Number(result.discount) > 0 && <ResultLine label="Discount" value={`-${money(result.discount)}`} />}
              </div>

              {/* Quick Share Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <Button className="text-xs justify-center" onClick={copyResult} type="button" variant="secondary">
                  <Copy size={14} />
                  <span>Copy Text</span>
                </Button>

                <Button
                  className="text-xs justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  onClick={shareWhatsApp}
                  type="button"
                  variant="primary"
                >
                  <MessageSquare size={14} />
                  <span>WhatsApp</span>
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        {/* 1-Click Document Generation */}
        <Card className="grid gap-2.5">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            {isBn ? 'ডকুমেন্ট তৈরি করুন' : 'Generate Document'}
          </span>
          <Button
            className="text-xs justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold"
            disabled={result.status !== 'ready'}
            onClick={() => openDocument('/quotation')}
            type="button"
            variant="primary"
          >
            {ui.createQuotation}
          </Button>
          <Button
            className="text-xs justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            disabled={result.status !== 'ready'}
            onClick={() => openDocument('/invoice')}
            type="button"
            variant="primary"
          >
            {ui.createInvoice}
          </Button>
          <Button
            className="text-xs justify-center"
            disabled={result.status !== 'ready'}
            onClick={() => openDocument('/money-receipt')}
            type="button"
            variant="secondary"
          >
            {ui.createReceipt}
          </Button>
          {result.status !== 'ready' ? (
            <p className="text-center text-[11px] font-medium text-slate-400">{ui.calcFirst}</p>
          ) : null}
        </Card>
      </div>

      {/* Smart Auto-Hiding Floating Sticky Result Strip */}
      {result.status === 'ready' && (
        <div
          className={`fixed inset-x-3 bottom-[68px] sm:bottom-4 z-30 flex items-center justify-between gap-2.5 rounded-2xl border border-brand-200 bg-slate-950/95 px-3.5 py-2.5 text-white shadow-2xl backdrop-blur-md transition-all duration-300 ease-in-out ${
            showFloatingStrip
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-8 pointer-events-none'
          }`}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
              {isBn ? 'পিস প্রতি রেট' : 'Rate / Piece'}
            </p>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-lg font-black text-white">{money(result.finalPrice)}</span>
              <span className="text-[10px] text-slate-400">({money(result.totalOrderSale)})</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition"
              onClick={() => openDocument('/quotation')}
              type="button"
            >
              <SquarePen size={14} />
              <span>{isBn ? 'কোটেশন' : 'Quote'}</span>
            </button>

            <button
              className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 active:scale-95 transition"
              onClick={() => {
                resultsCardRef.current?.scrollIntoView({ behavior: 'smooth' })
              }}
              title="View Breakdown"
              type="button"
            >
              <Layers size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

