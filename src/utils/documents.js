import { loadValue, saveValue } from './storage.js'

const documentsKey = 'documents'

export function loadDocuments() {
  return loadValue(documentsKey, [])
}

export function saveDocument(document) {
  const documents = loadDocuments()
  const savedDocument = {
    ...document,
    id: document.id || window.crypto?.randomUUID?.() || `${Date.now()}`,
    savedAt: new Date().toISOString()
  }

  const nextDocuments = [
    savedDocument,
    ...documents.filter((item) => item.id !== savedDocument.id && item.number !== savedDocument.number)
  ]

  saveValue(documentsKey, nextDocuments)
  return savedDocument
}
