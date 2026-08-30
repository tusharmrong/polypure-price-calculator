export const PRODUCTION_STAGES = [
  {
    id: 'confirmed',
    step: 1,
    label: 'Order Confirmed',
    labelBn: 'অর্ডার গ্রহণ',
    shortLabel: 'Confirmed',
    color: 'bg-slate-100 text-slate-800 border-slate-300',
    headerBg: 'bg-slate-100 border-slate-200 text-slate-800',
    dotColor: 'bg-slate-500',
    description: 'Order confirmed and scheduled for factory line'
  },
  {
    id: 'film_blowing',
    step: 2,
    label: 'Film Extrusion / Blowing',
    labelBn: 'ফিল্ম তৈরি (Extrusion)',
    shortLabel: 'Extrusion',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    headerBg: 'bg-blue-50 border-blue-200 text-blue-800',
    dotColor: 'bg-blue-500',
    description: 'Raw material melted and plastic film tube blown to size'
  },
  {
    id: 'printing',
    step: 3,
    label: 'Printing & Cylinder',
    labelBn: 'প্রিন্টিং চলছে',
    shortLabel: 'Printing',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    headerBg: 'bg-purple-50 border-purple-200 text-purple-800',
    dotColor: 'bg-purple-500',
    description: 'Cylinders mounted and ink printing running on machine'
  },
  {
    id: 'cutting_packing',
    step: 4,
    label: 'Cutting, Handle & Packing',
    labelBn: 'কাটিং ও প্যাকিং',
    shortLabel: 'Cutting & Packing',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    headerBg: 'bg-amber-50 border-amber-200 text-amber-800',
    dotColor: 'bg-amber-500',
    description: 'Bag shaping, handle punch / adhesive tape & pack'
  },
  {
    id: 'ready',
    step: 5,
    label: 'Ready for Dispatch',
    labelBn: 'ডেলিভারির জন্য প্রস্তুত',
    shortLabel: 'Ready',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    headerBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    dotColor: 'bg-emerald-500',
    description: 'Packed into master sacks and waiting for delivery transport'
  },
  {
    id: 'delivered',
    step: 6,
    label: 'Delivered / Completed',
    labelBn: 'ডেলিভারি সম্পন্ন',
    shortLabel: 'Delivered',
    color: 'bg-teal-100 text-teal-800 border-teal-300',
    headerBg: 'bg-teal-50 border-teal-200 text-teal-800',
    dotColor: 'bg-teal-600',
    description: 'Delivered to client with signed delivery challan'
  }
]

export const PRODUCTION_STAGE_MAP = Object.fromEntries(
  PRODUCTION_STAGES.map((s) => [s.id, s])
)

export function getDocProductionStatus(doc) {
  if (!doc) return 'delivered'
  if (doc.productionStatus && PRODUCTION_STAGE_MAP[doc.productionStatus]) {
    return doc.productionStatus
  }
  // Default legacy/past invoices to 'delivered' so they don't clutter the active pipeline
  return 'delivered'
}

export function getProductionStage(statusId) {
  return PRODUCTION_STAGE_MAP[statusId] || PRODUCTION_STAGES[0]
}

export function getNextStage(currentStatusId) {
  const currentIndex = PRODUCTION_STAGES.findIndex((s) => s.id === currentStatusId)
  if (currentIndex >= 0 && currentIndex < PRODUCTION_STAGES.length - 1) {
    return PRODUCTION_STAGES[currentIndex + 1]
  }
  return null
}

export function getPreviousStage(currentStatusId) {
  const currentIndex = PRODUCTION_STAGES.findIndex((s) => s.id === currentStatusId)
  if (currentIndex > 0) {
    return PRODUCTION_STAGES[currentIndex - 1]
  }
  return null
}

export function generateWhatsAppStatusMessage(doc, stageId, companyName = 'Poly Pure Printing & Packaging') {
  const stage = getProductionStage(stageId)
  const client = doc.clientName || 'Valued Client'
  const invNo = doc.number || 'Order'
  const itemsSummary = (doc.items || [])
    .map((item) => `${item.description || 'Bag'} (${Number(item.quantity || 0).toLocaleString()} pcs)`)
    .join(', ')

  let stageMessage = ''
  switch (stageId) {
    case 'confirmed':
      stageMessage = `Your order has been *Confirmed* and queued for production.`
      break
    case 'film_blowing':
      stageMessage = `Your bag film extrusion & material preparation is currently *In Progress*.`
      break
    case 'printing':
      stageMessage = `Your bags are currently running on our *Printing Line*.`
      break
    case 'cutting_packing':
      stageMessage = `Your bags are undergoing *Cutting, Sealing & Packaging*.`
      break
    case 'ready':
      stageMessage = `🎉 Good news! Your order is *Packed and Ready for Delivery/Dispatch*.`
      break
    case 'delivered':
      stageMessage = `✅ Your order has been *Delivered*. Thank you for choosing us!`
      break
    default:
      stageMessage = `Order status update: *${stage.label}*.`
  }

  return `Dear ${client},

Status update for your order *#${invNo}*:
📦 *Items:* ${itemsSummary || 'Bag Order'}
🏭 *Status:* ${stage.label} (${stage.labelBn})

${stageMessage}

Thank you,
*${companyName}*
📞 01914-901703 | 01761-100377`
}
