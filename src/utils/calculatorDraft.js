const draftKey = 'polypure:calculator-document-draft'

export function formatThickness(value) {
  return `Thickness: ${value || 0}mm`
}

export function normalizeThicknessText(text = '') {
  return String(text).replace(/(\d+(?:\.\d+)?)\s*micron/gi, 'Thickness: $1mm')
}

export function saveCalculatorDraft(draft) {
  window.localStorage.setItem(draftKey, JSON.stringify({
    ...draft,
    description: normalizeThicknessText(draft.description),
    thickness: normalizeThicknessText(draft.thickness)
  }))
}

export function loadCalculatorDraft() {
  try {
    const draft = window.localStorage.getItem(draftKey)
    const parsedDraft = draft ? JSON.parse(draft) : null
    return parsedDraft
      ? {
          ...parsedDraft,
          description: normalizeThicknessText(parsedDraft.description),
          thickness: normalizeThicknessText(parsedDraft.thickness)
        }
      : null
  } catch {
    return null
  }
}

export function createDocumentDraft({ mode, activeMode, values, result, handleEnabled }) {
  const documentQuantity = 2000
  const rate = Number(Number(result.finalPrice || 0).toFixed(2))
  const totalAmount = Number((rate * documentQuantity).toFixed(2))
  const thickness = formatThickness(values.thickness)
  const bagType = mode === 'shopping' ? 'Poly Shopping Bag' : 'Courier Bag'
  const description = `${bagType}, Size ${result.sizeDescription}, ${thickness}`

  return {
    bagType,
    documentSource: activeMode.title,
    size: result.sizeDescription,
    thickness,
    poundRate: Number(values.quantity || 0),
    quantity: documentQuantity,
    rate,
    perPiecePrice: rate,
    totalAmount,
    description,
    charges: {
      blockCharge: Number(result.blockCharge || 0),
      printingCharge: Number(result.printingCharge || 0),
      adhesiveCost: Number(result.adhesiveCost || 0),
      handleCost: handleEnabled ? Number(result.handleCost || 0) : 0,
      profit: Number(result.profit || 0),
      discount: Number(result.discount || 0)
    },
    createdAt: new Date().toISOString()
  }
}
