function sanitizeFileNamePart(value) {
  return String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
}

export function printWithFileName(arg) {
  let nextTitle = 'Document'
  let targetEl = null

  if (typeof arg === 'string') {
    nextTitle = sanitizeFileNamePart(arg) || 'Document'
  } else if (arg && typeof arg === 'object') {
    const safeType = sanitizeFileNamePart(arg.type) || 'Document'
    const safeClient = sanitizeFileNamePart(arg.clientName)
    const safeNumber = sanitizeFileNamePart(arg.documentNumber)
    const parts = [safeType, safeClient, safeNumber].filter(Boolean)
    nextTitle = parts.join('-') || 'Document'
    targetEl = arg.targetElement || (arg.elementId ? document.getElementById(arg.elementId) : null)
  }

  // Priority lookup for specific printable sheet elements
  if (!targetEl) {
    targetEl =
      document.getElementById('quotation-printable-sheet') ||
      document.getElementById('invoice-printable-sheet') ||
      document.getElementById('receipt-printable-sheet') ||
      document.getElementById('challan-printable-sheet') ||
      document.getElementById('factory-job-card-print') ||
      document.querySelector('.challan-print-area') ||
      document.querySelector('.job-card-print-area') ||
      document.querySelector('.quotation-sheet') ||
      document.querySelector('.print-area')
  }

  let printRoot = document.getElementById('print-root')
  if (!printRoot) {
    printRoot = document.createElement('div')
    printRoot.id = 'print-root'
    document.body.appendChild(printRoot)
  }

  if (targetEl) {
    printRoot.innerHTML = ''
    const clone = targetEl.cloneNode(true)
    
    // Strip no-print buttons/elements from print clone
    clone.querySelectorAll('.no-print').forEach((el) => el.remove())

    // CRITICAL: Strip responsive visibility/display restrictions from cloned element
    clone.classList.remove('hidden', 'invisible', 'xl:hidden', 'lg:hidden', 'md:hidden')
    clone.style.display = 'block'
    clone.style.visibility = 'visible'

    printRoot.appendChild(clone)
    document.body.classList.add('is-printing')
  }

  const previousTitle = document.title
  document.title = nextTitle

  window.print()

  window.setTimeout(() => {
    document.title = previousTitle
    document.body.classList.remove('is-printing')
    if (printRoot) {
      printRoot.innerHTML = ''
    }
  }, 1200)
}
