import { loadValue } from './storage.js'

export function isValidSignatureDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:image/png;base64,')
}

export function loadSignatureImage() {
  const value = loadValue('signaturePngDataUrl', '')
  return isValidSignatureDataUrl(value) ? value : ''
}
