function pad(value) {
  return String(value).padStart(2, '0')
}

export function getTodayInputDate() {
  const date = new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function createDocumentNumber(prefix, inputDate = getTodayInputDate()) {
  const now = new Date()
  const date = new Date(`${inputDate}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`)
  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const year = date.getFullYear()
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())
  const second = pad(date.getSeconds())
  return `${prefix}-${day}${month}${year}-${hour}${minute}${second}`
}

export function formatDocumentDate(inputDate = getTodayInputDate()) {
  const date = new Date(`${inputDate}T00:00:00`)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date)
}
