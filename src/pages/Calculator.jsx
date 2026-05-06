import { useMemo, useState } from 'react'
import { Calculator as CalculatorIcon, Copy, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import { createDocumentDraft, saveCalculatorDraft } from '../utils/calculatorDraft.js'

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

function numberValue(value) {
  if (value === '') return 0
  return Number(value)
}

function money(value) {
  return `Tk ${Number(value || 0).toFixed(2)}`
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
  const navigate = useNavigate()
  const [mode, setMode] = useState('shopping')
  const [values, setValues] = useState(initialValues)
  const [handleEnabled, setHandleEnabled] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const activeMode = bagModes[mode]

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

  const updateValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setSubmitted(false)
    setHandleEnabled(false)
    setValues((current) => ({
      ...current,
      thickness: String(bagModes[nextMode].thickness),
      adhesiveCost: '',
      handleCost: '2'
    }))
  }

  const reset = () => {
    setSubmitted(false)
    setHandleEnabled(false)
    setValues({ ...initialValues, thickness: String(activeMode.thickness) })
  }

  const copyResult = async () => {
    if (result.status !== 'ready') return

    const summary = [
      `${activeMode.title} Result`,
      `Size: ${result.sizeDescription}`,
      `Pieces Result: ${result.pieces.toFixed(2)}`,
      `Base Price (${values.quantity} pound rate): ${money(result.basePrice)}`,
      `Block Charge: ${money(result.blockCharge)}`,
      `Printing Charge: ${money(result.printingCharge)}`,
      mode === 'courier' ? `Adhesive Cost: ${money(result.adhesiveCost)}` : null,
      mode === 'shopping' && handleEnabled ? `Handle Cost: ${money(result.handleCost)}` : null,
      `Profit: ${money(result.profit)}`,
      `Discount: ${money(result.discount)}`,
      `Final Price: ${money(result.finalPrice)}`
    ]
      .filter(Boolean)
      .join('\n')

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
            <p className="text-sm font-semibold text-brand-700">Calculator</p>
            <h2 className="text-xl font-bold text-slate-950">{activeMode.sectionTitle}</h2>
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
                {item.title}
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
              label="Width"
              min="0"
              onChange={(event) => updateValue('width', event.target.value)}
              placeholder="Example: 10"
              step="0.01"
              type="number"
              value={values.width}
            />
            <Input
              id="height"
              label="Height / Length"
              min="0"
              onChange={(event) => updateValue('height', event.target.value)}
              placeholder="Example: 14"
              step="0.01"
              type="number"
              value={values.height}
            />
            <Input
              id="extra-measure"
              label={activeMode.extraLabel}
              min="0"
              onChange={(event) => updateValue('extraMeasure', event.target.value)}
              placeholder={mode === 'shopping' ? 'Folding size' : 'Flap size'}
              step="0.01"
              type="number"
              value={values.extraMeasure}
            />
            <Input
              id="thickness"
              label="Thickness / Micron"
              min="0"
              onChange={(event) => updateValue('thickness', event.target.value)}
              step="0.01"
              type="number"
              value={values.thickness}
            />
            <Input
              id="quantity"
              label="Pound Rate"
              min="0"
              onChange={(event) => updateValue('quantity', event.target.value)}
              step="0.01"
              type="number"
              value={values.quantity}
            />
            <Input
              id="block-charge"
              label="Block Charge"
              min="0"
              onChange={(event) => updateValue('blockCharge', event.target.value)}
              placeholder="0"
              step="0.01"
              type="number"
              value={values.blockCharge}
            />
            <Input
              id="printing-charge"
              label="Printing Charge"
              min="0"
              onChange={(event) => updateValue('printingCharge', event.target.value)}
              placeholder="0"
              step="0.01"
              type="number"
              value={values.printingCharge}
            />
            {mode === 'courier' ? (
              <Input
                id="adhesive-cost"
                label="Adhesive Cost"
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
              label="Profit"
              min="0"
              onChange={(event) => updateValue('profit', event.target.value)}
              placeholder="0"
              step="0.01"
              type="number"
              value={values.profit}
            />
            <Input
              id="discount"
              label="Discount"
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
                Add Handle Cost
              </label>
              {handleEnabled ? (
                <div className="mt-4 max-w-sm">
                  <Input
                    id="handle-cost"
                    label="Handle Cost"
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
              Calculate Price
            </Button>
            <Button onClick={reset} type="button" variant="secondary">
              <RotateCcw size={18} aria-hidden="true" />
              Reset
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid content-start gap-5">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-950">Result</h2>
          {result.status === 'idle' ? (
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              Enter the bag details and calculate the final price.
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
            Create Quotation
          </Button>
          <Button disabled={result.status !== 'ready'} onClick={() => openDocument('/invoice')} type="button">
            Create Invoice
          </Button>
          <Button disabled={result.status !== 'ready'} onClick={() => openDocument('/money-receipt')} type="button">
            Create Money Receipt
          </Button>
          {result.status !== 'ready' ? (
            <p className="text-center text-xs font-medium text-slate-500">Calculate first to create a document.</p>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
