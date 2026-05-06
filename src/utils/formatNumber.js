export function formatDecimal(value, digits = 2) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toFixed(digits) : Number(0).toFixed(digits)
}
