import { useEffect, useMemo, useState } from 'react'
import { Calculator as CalculatorIcon, Copy, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import { createDocumentDraft, saveCalculatorDraft } from '../utils/calculatorDraft.js'
import { loadValue, saveValue } from '../utils/storage.js'
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

const initialValues = {
  width: '',
  height: '',
  extraMeasure: '',
  thickness: '17',
  quantity: '100',
  blockCharge: '',
  printingCharge: '',
  adhesiveCost: '',
  handleCost: '2',
  profit: '',
  discount: ''
}

const calculatorMemoryKey = 'calculatorMemory'

function getDefaultPrintingCharge(mode, printColorMode) {
  const baseCharge = mode === 'shopping' ? 0.4 : 0.3
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
    printColorMode: safePrintColorMode,
    handleEnabled: Boolean(saved?.handleEnabled),
    adhesiveCostTouched: Boolean(saved?.adhesiveCostTouched),
    submitted: Boolean(saved?.submitted)
  }
}

function numberValue(value) {
  if (value === '') return 0
  return Number(value)
}

function money(value) {
  return `Tk ${Number(value || 0).toFixed(2)}`
}

function thicknessAsSheetText(value) {
  const numericValue = Number(value || 0)
  return `0.${String(Math.round(numericValue)).padStart(2, '0')}mm`
}

function calculateAdhesiveCost(width) {
  const numericWidth = Number(width || 0)
  if (!Number.isFinite(numericWidth) || numericWidth <= 0) return ''
  return (numericWidth * 0.06).toFixed(2)
}

function ResultLine({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-right text-sm ${strong ? 'font-bold text-brand-700' : 'font-semibold text-slate-950'}`}>
        {value}
      </span>
    </div>
  )
}

export default function Calculator() {
  const { language } = useUiLanguage()
  const isBn = language === 'bn'
  const navigate = useNavigate()
  const savedMemory = useMemo(() => loadCalculatorMemory(), [])
  const [mode, setMode] = useState(savedMemory.mode)
  const [values, setValues] = useState(savedMemory.values)
  const [printColorMode, setPrintColorMode] = useState(savedMemory.printColorMode)
  const [handleEnabled, setHandleEnabled] = useState(savedMemory.handleEnabled)
  const [adhesiveCostTouched, setAdhesiveCostTouched] = useState(savedMemory.adhesiveCostTouched)
  const [submitted, setSubmitted] = useState(savedMemory.submitted)

  const activeMode = bagModes[mode]
  const ui = {
    calculator: isBn ? 'ক্যালকুলেটর' : 'Calculator',
    width: isBn ? 'প্রস্থ' : 'Width',
    height: isBn ? 'উচ্চতা / লেন্থ' : 'Height / Length',
    thickness: isBn ? 'থিকনেস / মাইক্রন' : 'Thickness / Micron',
    poundRate: isBn ? 'পাউন্ড রেট' : 'Pound Rate',
    blockCharge: isBn ? 'ব্লক চার্জ' : 'Block Charge',
    printingCharge: isBn ? 'প্রিন্টিং চার্জ' : 'Printing Charge',
    adhesiveCost: isBn ? 'গাম চার্জ' : 'Adhesive Cost',
    profit: isBn ? 'প্রফিট' : 'Profit',
    discount: isBn ? 'ডিসকাউন্ট' : 'Discount',
    addHandle: isBn ? 'হ্যান্ডেল চার্জ যোগ করুন' : 'Add Handle Cost',
    handleCost: isBn ? 'হ্যান্ডেল চার্জ' : 'Handle Cost',
    calculate: isBn ? 'দাম হিসাব করুন' : 'Calculate Price',
    reset: isBn ? 'রিসেট' : 'Reset',
    result: isBn ? 'ফলাফল' : 'Result',
    resultHint: isBn ? 'ব্যাগের তথ্য দিয়ে দাম হিসাব করুন।' : 'Enter the bag details and calculate the final price.',
    createQuotation: isBn ? 'কোটেশন তৈরি করুন' : 'Create Quotation',
    createInvoice: isBn ? 'ইনভয়েস তৈরি করুন' : 'Create Invoice',
    createReceipt: isBn ? 'মানি রিসিপ্ট তৈরি করুন' : 'Create Money Receipt',
    calcFirst: isBn ? 'ডকুমেন্ট তৈরি করতে আগে হিসাব করুন।' : 'Calculate first to create a document.'
  }

  const result = useMemo(() => {
    const width = numberValue(values.width)
    const height = numberValue(values.height)
    const extraMeasure = numberValue(values.extraMeasure)
    const thickness = numberValue(values.thickness)
    const quantity = numberValue(values.quantity)
    const blockCharge = numberValue(values.blockCharge)
    const printingCharge = numberValue(values.printingCharge)
    const adhesiveCost = mode === 'courier' ? numberValue(values.adhesiveCost) : 0
    const handleCost = mode === 'shopping' && handleEnabled ? numberValue(values.handleCost) : 0
    const profit = numberValue(values.profit)
    const discount = numberValue(values.discount)

    if (!submitted) return { status: 'idle' }

    if ([width, height, thickness, quantity].some((value) => Number.isNaN(value) || value <= 0)) {
      return {
        status: 'error',
        message: 'Width, height, thickness, and pound rate must be more than 0.'
      }
    }

    if (Number.isNaN(extraMeasure) || extraMeasure < 0) {
      return {
        status: 'error',
        message: `${activeMode.extraLabel} cannot be negative.`
      }
    }

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

    const basePrice = quantity / pieces
    const finalPrice = basePrice + blockCharge + printingCharge + adhesiveCost + handleCost + profit - discount
    const sizeDescription =
      mode === 'shopping'
        ? `${width} x ${height} + ${extraMeasure} ${activeMode.extraLabel}`
        : `${width} x ${height} + ${extraMeasure} ${activeMode.extraLabel}`

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
      sizeDescription
    }
  }, [activeMode.extraLabel, handleEnabled, mode, submitted, values])

  useEffect(() => {
    saveValue(calculatorMemoryKey, {
      mode,
      values,
      printColorMode,
      handleEnabled,
      adhesiveCostTouched,
      submitted
    })
  }, [adhesiveCostTouched, handleEnabled, mode, printColorMode, submitted, values])

  useEffect(() => {
    if (mode !== 'courier') return
    if (adhesiveCostTouched) return

    const nextAdhesiveCost = calculateAdhesiveCost(values.width)
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
      printingCharge: getDefaultPrintingCharge(mode, safeNextMode)
    }))
  }
  const updateValue = (field, value) => {
    if (field === 'adhesiveCost') {
      setAdhesiveCostTouched(true)
    }
    setValues((current) => ({ ...current, [field]: value }))
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setSubmitted(false)
    setHandleEnabled(false)
    setAdhesiveCostTouched(false)
    setValues((current) => ({
      ...current,
      thickness: String(bagModes[nextMode].thickness),
      printingCharge: getDefaultPrintingCharge(nextMode, printColorMode),
      adhesiveCost: '',
      handleCost: '2'
    }))
  }

  const reset = () => {
    setSubmitted(false)
    setHandleEnabled(false)
    setAdhesiveCostTouched(false)
    setPrintColorMode('1')
    setValues({
      ...initialValues,
      thickness: String(activeMode.thickness),
      printingCharge: getDefaultPrintingCharge(mode, '1')
    })
    saveValue(calculatorMemoryKey, {
      mode,
      values: {
        ...initialValues,
        thickness: String(activeMode.thickness),
        printingCharge: getDefaultPrintingCharge(mode, '1')
      },
      printColorMode: '1',
      handleEnabled: false,
      adhesiveCostTouched: false,
      submitted: false
    })
  }

  const copyResult = async () => {
    if (result.status !== 'ready') return

    const bagTitle =
      mode === 'shopping'
        ? handleEnabled
          ? 'Handled Shopping Bag'
          : 'D-cut Shopping Bag'
        : 'Courier Bag'
    const minimumOrderQuantity = printColorMode === '2' ? 3000 : 2000
    const sizeLine =
      mode === 'shopping'
        ? `Width-${values.width || 0}, Length-${values.height || 0}, Folding-${values.extraMeasure || 0}`
        : `Width-${values.width || 0}, Length-${values.height || 0}, Flap-${values.extraMeasure || 0}`

    const summary = [
      bagTitle,
      sizeLine,
      `Thickness: ${thicknessAsSheetText(values.thickness)}`,
      `${printColorMode} Color print`,
      `Price Per Piece: ${Number(result.finalPrice || 0).toFixed(2)}/-`,
      `Minimum Order Quantity ${minimumOrderQuantity} pieces`
    ].join('\n')

    await navigator.clipboard?.writeText(summary)
  }

  const openDocument = (path) => {
    if (result.status !== 'ready') return

    const draft = createDocumentDraft({
      mode,
      activeMode,
      values,
      result,
      handleEnabled
    })

    saveCalculatorDraft(draft)
    navigate(path, { state: { calculatorDraft: draft } })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <Card>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-700">{ui.calculator}</p>
            <h2 className="text-xl font-bold text-slate-950">
              {isBn
                ? mode === 'shopping'
                  ? 'শপিং ব্যাগ বিস্তারিত'
                  : 'কুরিয়ার ব্যাগ বিস্তারিত'
                : activeMode.sectionTitle}
            </h2>
          </div>
          <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            {Object.entries(bagModes).map(([key, item]) => (
              <button
                className={`min-h-11 rounded-md px-3 text-sm font-bold transition ${
                  mode === key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'
                }`}
                key={key}
                onClick={() => changeMode(key)}
                type="button"
              >
                {isBn
                  ? key === 'shopping'
                    ? 'শপিং ব্যাগ'
                    : 'কুরিয়ার ব্যাগ'
                  : item.title}
              </button>
            ))}
          </div>
        </div>

        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            setSubmitted(true)
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="width"
              label={ui.width}
              min="0"
              onChange={(event) => updateValue('width', event.target.value)}
              placeholder="Example: 10"
              step="0.01"
              type="number"
              value={values.width}
            />
            <Input
              id="height"
              label={ui.height}
              min="0"
              onChange={(event) => updateValue('height', event.target.value)}
              placeholder="Example: 14"
              step="0.01"
              type="number"
              value={values.height}
            />
            <Input
              id="extra-measure"
              label={isBn ? (mode === 'shopping' ? 'ফোল্ডিং' : 'ফ্ল্যাপ') : activeMode.extraLabel}
              min="0"
              onChange={(event) => updateValue('extraMeasure', event.target.value)}
              placeholder={isBn ? (mode === 'shopping' ? 'ফোল্ডিং সাইজ' : 'ফ্ল্যাপ সাইজ') : mode === 'shopping' ? 'Folding size' : 'Flap size'}
              step="0.01"
              type="number"
              value={values.extraMeasure}
            />
            <Input
              id="thickness"
              label={ui.thickness}
              min="0"
              onChange={(event) => updateValue('thickness', event.target.value)}
              step="0.01"
              type="number"
              value={values.thickness}
            />
            <Input
              id="quantity"
              label={ui.poundRate}
              min="0"
              onChange={(event) => updateValue('quantity', event.target.value)}
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
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-slate-700" htmlFor="printing-charge">
                  {ui.printingCharge}
                </label>
                <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
                  <button
                    className={`min-h-9 rounded-md px-3 text-xs font-bold transition ${
                      printColorMode === '1' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'
                    }`}
                    onClick={() => updatePrintColorMode('1')}
                    type="button"
                  >
                    {isBn ? '১ কালার' : '1 Color'}
                  </button>
                  <button
                    className={`min-h-9 rounded-md px-3 text-xs font-bold transition ${
                      printColorMode === '2' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600'
                    }`}
                    onClick={() => updatePrintColorMode('2')}
                    type="button"
                  >
                    {isBn ? '২ কালার' : '2 Color'}
                  </button>
                </div>
              </div>
              <input
                id="printing-charge"
                className="w-full min-w-0 min-h-12 rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                min="0"
                onChange={(event) => updateValue('printingCharge', event.target.value)}
                placeholder="0"
                step="0.01"
                type="number"
                value={values.printingCharge}
              />
            </div>
            {mode === 'courier' ? (
              <Input
                id="adhesive-cost"
                label={ui.adhesiveCost}
                min="0"
                onChange={(event) => updateValue('adhesiveCost', event.target.value)}
                placeholder="0"
                step="0.01"
                type="number"
                value={values.adhesiveCost}
              />
            ) : null}
            <Input
              id="profit"
              label={ui.profit}
              min="0"
              onChange={(event) => updateValue('profit', event.target.value)}
              placeholder="0"
              step="0.01"
              type="number"
              value={values.profit}
            />
            <Input
              id="discount"
              label={ui.discount}
              min="0"
              onChange={(event) => updateValue('discount', event.target.value)}
              placeholder="0"
              step="0.01"
              type="number"
              value={values.discount}
            />
          </div>

          {activeMode.showHandle ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-center gap-3 text-sm font-bold text-slate-800">
                <input
                  checked={handleEnabled}
                  className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                  onChange={(event) => setHandleEnabled(event.target.checked)}
                  type="checkbox"
                />
                {ui.addHandle}
              </label>
              {handleEnabled ? (
                <div className="mt-4 max-w-sm">
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
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="sm:flex-1" type="submit">
              <CalculatorIcon size={18} aria-hidden="true" />
              {ui.calculate}
            </Button>
            <Button onClick={reset} type="button" variant="secondary">
              <RotateCcw size={18} aria-hidden="true" />
              {ui.reset}
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid content-start gap-5">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-950">{ui.result}</h2>
          {result.status === 'idle' ? (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              {ui.resultHint}
            </div>
          ) : null}
          {result.status === 'error' ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {result.message}
            </div>
          ) : null}
          {result.status === 'ready' ? (
            <div className="grid gap-3">
              <ResultLine label="Size Description" value={result.sizeDescription} />
              <ResultLine label="Pieces Result" value={result.pieces.toFixed(2)} />
              <ResultLine label={`Base Price (${values.quantity} pound rate)`} value={money(result.basePrice)} />
              <ResultLine label="Block Charge" value={money(result.blockCharge)} />
              <ResultLine label="Printing Charge" value={money(result.printingCharge)} />
              {mode === 'courier' ? <ResultLine label="Adhesive Cost" value={money(result.adhesiveCost)} /> : null}
              {mode === 'shopping' && handleEnabled ? (
                <ResultLine label="Handle Cost" value={money(result.handleCost)} />
              ) : null}
              <ResultLine label="Profit" value={money(result.profit)} />
              <ResultLine label="Discount" value={`-${money(result.discount)}`} />
              <div className="rounded-lg bg-brand-50 p-4">
                <p className="text-sm font-semibold text-brand-700">Final Price</p>
                <p className="mt-1 text-3xl font-bold text-brand-700">{money(result.finalPrice)}</p>
              </div>
              <Button onClick={copyResult} type="button" variant="secondary">
                <Copy size={18} aria-hidden="true" />
                Copy Result
              </Button>
            </div>
          ) : null}
        </Card>

        <Card className="grid gap-3">
          <Button disabled={result.status !== 'ready'} onClick={() => openDocument('/quotation')} type="button">
            {ui.createQuotation}
          </Button>
          <Button disabled={result.status !== 'ready'} onClick={() => openDocument('/invoice')} type="button">
            {ui.createInvoice}
          </Button>
          <Button disabled={result.status !== 'ready'} onClick={() => openDocument('/money-receipt')} type="button">
            {ui.createReceipt}
          </Button>
          {result.status !== 'ready' ? (
            <p className="text-center text-xs font-medium text-slate-500">{ui.calcFirst}</p>
          ) : null}
        </Card>
      </div>
    </div>
  )
}

