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

export function softDeleteDocument(documentId) {
  const documents = loadDocuments()
  const nextDocuments = documents.map((item) =>
    item.id === documentId
      ? { ...item, deletedAt: new Date().toISOString() }
      : item
  )
  return saveValue(documentsKey, nextDocuments)
}

export function restoreDocument(documentId) {
  const documents = loadDocuments()
  const nextDocuments = documents.map((item) => {
    if (item.id !== documentId) return item
    const { deletedAt, ...rest } = item
    return rest
  })
  return saveValue(documentsKey, nextDocuments)
}

export function hardDeleteDocument(documentId) {
  const documents = loadDocuments()
  const nextDocuments = documents.filter((item) => item.id !== documentId)
  return saveValue(documentsKey, nextDocuments)
}
