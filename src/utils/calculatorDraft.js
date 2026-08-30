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

export function createDocumentDraft({ mode, activeMode, values, result, handleEnabled, orderQuantity = 2000 }) {
  const documentQuantity = Number(orderQuantity > 0 ? orderQuantity : 2000)
  const rate = Number(Number(result.finalPrice || 0).toFixed(2))
  const totalAmount = Number((rate * documentQuantity).toFixed(2))
  const thickness = formatThickness(values.thickness)
  const bagType = mode === 'shopping' ? 'Poly Shopping Bag' : 'Courier Bag'
  const description = `${bagType}, Size ${result.sizeDescription}, ${thickness}`

  const piecesPerPound = Number(result.pieces || 1)
  const rawMaterialPounds = piecesPerPound > 0 ? Number((documentQuantity / piecesPerPound).toFixed(2)) : 0
  const poundRate = Number(values.quantity || 0)
  const rawMaterialCost = Number((rawMaterialPounds * poundRate).toFixed(2))
  const printCost = Number((Number(result.printingCharge || 0) * documentQuantity).toFixed(2))
  const handleCost = handleEnabled ? Number((Number(result.handleCost || 0) * documentQuantity).toFixed(2)) : 0
  const adhesiveCost = mode === 'courier' ? Number((Number(result.adhesiveCost || 0) * documentQuantity).toFixed(2)) : 0
  const blockCharge = Number(result.blockCharge || 0)
  const totalFactoryCost = Number((rawMaterialCost + printCost + handleCost + adhesiveCost + blockCharge).toFixed(2))

  return {
    bagType,
    documentSource: activeMode.title,
    size: result.sizeDescription,
    thickness,
    poundRate,
    quantity: documentQuantity,
    rate,
    perPiecePrice: rate,
    totalAmount,
    description,
    factoryCost: {
      rawMaterialPounds,
      poundRate,
      rawMaterialCost,
      printCostPerUnit: Number(result.printingCharge || 0),
      totalPrintCost: printCost,
      hasHandle: Boolean(handleEnabled),
      handleCostPerUnit: handleEnabled ? Number(result.handleCost || 0) : 0,
      totalHandleCost: handleCost,
      hasAdhesive: mode === 'courier',
      adhesiveCostPerUnit: mode === 'courier' ? Number(result.adhesiveCost || 0) : 0,
      totalAdhesiveCost: adhesiveCost,
      blockCharge,
      extraFinishingCost: 0,
      wastagePercent: 0,
      totalFactoryCost
    },
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
