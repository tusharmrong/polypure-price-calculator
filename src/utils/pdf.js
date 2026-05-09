function sanitizeFileNamePart(value) {
  return String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
}

export function printWithFileName({ clientName, documentNumber, type }) {
  const safeClient = sanitizeFileNamePart(clientName) || 'Client'
  const safeNumber = sanitizeFileNamePart(documentNumber) || 'Document'
  const safeType = sanitizeFileNamePart(type) || 'File'
  const nextTitle = `${safeType}-${safeClient}-${safeNumber}`
  const previousTitle = document.title
  document.title = nextTitle
  window.print()
  window.setTimeout(() => {
    document.title = previousTitle
  }, 400)
}
