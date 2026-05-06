function pad(value) {
  return String(value).padStart(2, '0')
}

export function getTodayInputDate() {
  const date = new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function createDocumentNumber(prefix, inputDate = getTodayInputDate(), count = 1) {
  const date = new Date(`${inputDate}T00:00:00`)
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const year = date.getFullYear()
  return `${prefix}-${day}${month}${year}-${String(count).padStart(4, '0')}`
}

export function formatDocumentDate(inputDate = getTodayInputDate()) {
  const date = new Date(`${inputDate}T00:00:00`)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date)
}
