import { useEffect, useMemo, useState } from 'react'
import { loadDocuments } from './documents.js'

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function getDocumentTime(document) {
  const value = document.updatedAt || document.savedAt || document.createdAt || document.date || ''
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function buildClientKey(document) {
  const phone = normalizeText(document.phone)
  if (phone) return `phone:${phone}`

  const name = normalizeText(document.clientName)
  const address = normalizeText(document.address)
  if (!name) return ''
  return `name:${name}:${address}`
}

export function useClientSuggestions() {
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    let isMounted = true

    loadDocuments()
      .then((items) => {
        if (isMounted) setDocuments(items)
      })
      .catch((error) => {
        console.error('Unable to load client suggestions.', error)
        if (isMounted) setDocuments([])
      })

    return () => {
      isMounted = false
    }
  }, [])

  return useMemo(() => {
    const clientsByKey = new Map()

    documents
      .filter((document) => !document.deletedAt && normalizeText(document.clientName))
      .forEach((document) => {
        const key = buildClientKey(document)
        if (!key) return

        const existing = clientsByKey.get(key)
        const nextTime = getDocumentTime(document)
        const existingTime = existing ? getDocumentTime(existing.sourceDocument) : 0

        if (!existing || nextTime >= existingTime) {
          clientsByKey.set(key, {
            id: key,
            clientName: document.clientName || '',
            phone: document.phone || '',
            address: document.address || '',
            lastDocumentNumber: document.number || '',
            lastDocumentType: document.type || '',
            lastDate: document.displayDate || document.date || '',
            sourceDocument: document
          })
        }
      })

    return [...clientsByKey.values()].sort((left, right) => getDocumentTime(right.sourceDocument) - getDocumentTime(left.sourceDocument))
  }, [documents])
}

export function filterClientSuggestions(suggestions, query, limit = 5) {
  const search = normalizeText(query)
  if (search.length < 2) return []

  return suggestions
    .filter((client) => {
      const searchable = [client.clientName, client.phone, client.address, client.lastDocumentNumber].join(' ').toLowerCase()
      return searchable.includes(search)
    })
    .slice(0, limit)
}

export function matchClientSuggestion(suggestions, value) {
  const search = normalizeText(value)
  if (!search) return null

  return (
    suggestions.find((client) => normalizeText(client.clientName) === search || normalizeText(client.phone) === search) ||
    null
  )
}
