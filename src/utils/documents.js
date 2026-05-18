import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc
} from 'firebase/firestore'
import { firebaseAuth, firebaseDb, firebaseInitError } from './firebase.js'
import { loadValue, saveValue } from './storage.js'

const documentsKey = 'documents'
const documentsCollection = firebaseDb ? collection(firebaseDb, 'documents') : null

function safeIdPart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildDocumentIdentity(document) {
  const type = String(document?.type || '').trim()
  const number = String(document?.number || '').trim()
  if (type && number) return `${type}::${number}`
  return document?.id ? `id::${document.id}` : ''
}

function buildLegacyDocumentId(document) {
  const identity = buildDocumentIdentity(document)
  if (!identity) return `legacy-${Date.now()}`

  const [type = '', number = ''] = identity.split('::')
  const idValue = `${safeIdPart(type)}-${safeIdPart(number)}`
  return `legacy-${idValue || Date.now()}`
}

function getLocalDocuments() {
  return loadValue(documentsKey, [])
}

function saveLocalDocuments(documents) {
  saveValue(documentsKey, documents)
}

function sortDocuments(documents) {
  return [...documents].sort((left, right) => {
    const rightDate = right.updatedAt || right.savedAt || right.createdAt || right.date || ''
    const leftDate = left.updatedAt || left.savedAt || left.createdAt || left.date || ''
    return new Date(rightDate) - new Date(leftDate)
  })
}

function syncDocumentToLocal(document) {
  const localDocuments = getLocalDocuments()
  const identity = buildDocumentIdentity(document)
  const nextDocuments = sortDocuments([
    document,
    ...localDocuments.filter((item) => item.id !== document.id && buildDocumentIdentity(item) !== identity)
  ])
  saveLocalDocuments(nextDocuments)
  return nextDocuments
}

function removeDocumentFromLocal(documentId) {
  const nextDocuments = getLocalDocuments().filter((item) => item.id !== documentId)
  saveLocalDocuments(nextDocuments)
  return nextDocuments
}

function canUseCloudDocuments() {
  return Boolean(firebaseDb && documentsCollection && firebaseAuth?.currentUser && !firebaseInitError)
}

async function getExistingCloudDocument(documentId) {
  if (!canUseCloudDocuments() || !documentId) return null
  const snapshot = await getDoc(doc(firebaseDb, 'documents', documentId))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

async function getExistingCloudDocumentByIdentity(identity) {
  if (!canUseCloudDocuments() || !identity) return null
  const cloudDocuments = await getCloudDocumentsWithoutCaching()
  return cloudDocuments.find((document) => buildDocumentIdentity(document) === identity) || null
}

function buildCreatorMetadata(actorUser) {
  return {
    creatorUserId: actorUser?.id || firebaseAuth?.currentUser?.uid || '',
    creatorName: actorUser?.name || firebaseAuth?.currentUser?.displayName || 'Unknown User',
    creatorRole: actorUser?.role || 'staff'
  }
}

function buildEditorMetadata(actorUser) {
  return {
    updatedByUserId: actorUser?.id || firebaseAuth?.currentUser?.uid || '',
    updatedByName: actorUser?.name || firebaseAuth?.currentUser?.displayName || 'Unknown User',
    updatedByRole: actorUser?.role || 'staff'
  }
}

async function getCloudDocumentsWithoutCaching() {
  if (!canUseCloudDocuments()) return []
  const snapshot = await getDocs(documentsCollection)
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }))
}

export async function loadDocuments() {
  if (canUseCloudDocuments()) {
    try {
      const snapshot = await getDocs(query(documentsCollection, orderBy('updatedAt', 'desc')))
      const documents = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }))
      saveLocalDocuments(documents)
      return documents
    } catch (error) {
      console.error('Unable to load cloud documents, using local backup instead.', error)
    }
  }

  return sortDocuments(getLocalDocuments())
}

export async function syncLocalDocumentsToCloud(actorUser = null) {
  if (!canUseCloudDocuments()) {
    return { uploaded: 0, skipped: 0 }
  }

  const localDocuments = sortDocuments(getLocalDocuments())
  if (!localDocuments.length) {
    return { uploaded: 0, skipped: 0 }
  }

  const cloudDocuments = await getCloudDocumentsWithoutCaching()
  const cloudById = new Map(cloudDocuments.map((document) => [document.id, document]))
  const cloudByIdentity = new Map(
    cloudDocuments
      .map((document) => [buildDocumentIdentity(document), document])
      .filter(([identity]) => Boolean(identity))
  )

  let uploaded = 0
  let skipped = 0

  for (const localDocument of localDocuments) {
    const identity = buildDocumentIdentity(localDocument)
    const existingCloudDocument =
      (localDocument.id && cloudById.get(localDocument.id)) ||
      (identity ? cloudByIdentity.get(identity) : null)

    if (existingCloudDocument) {
      skipped += 1
      continue
    }

    const creator = buildCreatorMetadata(actorUser)
    const uploadId = localDocument.id || buildLegacyDocumentId(localDocument)
    const preparedDocument = {
      ...localDocument,
      id: uploadId,
      createdAt: localDocument.createdAt || localDocument.savedAt || localDocument.updatedAt || new Date().toISOString(),
      updatedAt: localDocument.updatedAt || localDocument.savedAt || new Date().toISOString(),
      savedAt: localDocument.savedAt || localDocument.updatedAt || new Date().toISOString(),
      creatorUserId: localDocument.creatorUserId || creator.creatorUserId,
      creatorName: localDocument.creatorName || creator.creatorName,
      creatorRole: localDocument.creatorRole || creator.creatorRole,
      updatedByUserId: localDocument.updatedByUserId || localDocument.creatorUserId || creator.creatorUserId,
      updatedByName: localDocument.updatedByName || localDocument.creatorName || creator.creatorName,
      updatedByRole: localDocument.updatedByRole || localDocument.creatorRole || creator.creatorRole,
      syncSource: localDocument.syncSource || 'local-import',
      cloudBacked: true,
      importedFromLocal: true,
      importedAt: new Date().toISOString()
    }

    await setDoc(doc(firebaseDb, 'documents', uploadId), preparedDocument)
    cloudById.set(uploadId, preparedDocument)
    if (identity) cloudByIdentity.set(identity, preparedDocument)
    syncDocumentToLocal(preparedDocument)
    uploaded += 1
  }

  await loadDocuments()
  return { uploaded, skipped }
}

export async function saveDocument(documentData, actorUser = null) {
  const now = new Date().toISOString()
  const creator = buildCreatorMetadata(actorUser)
  const editor = buildEditorMetadata(actorUser)
  const identity = buildDocumentIdentity(documentData)

  let existingDocument =
    getLocalDocuments().find((item) => documentData.id && item.id === documentData.id) ||
    getLocalDocuments().find((item) => identity && buildDocumentIdentity(item) === identity) ||
    null

  if (!existingDocument && canUseCloudDocuments() && documentData.id) {
    try {
      existingDocument = await getExistingCloudDocument(documentData.id)
    } catch (error) {
      console.error('Unable to read existing cloud document before save.', error)
    }
  }

  if (!existingDocument && canUseCloudDocuments() && identity) {
    try {
      existingDocument = await getExistingCloudDocumentByIdentity(identity)
    } catch (error) {
      console.error('Unable to read existing cloud document identity before save.', error)
    }
  }

  const documentId = existingDocument?.id || documentData.id || window.crypto?.randomUUID?.() || `${Date.now()}`

  const savedDocument = {
    ...existingDocument,
    ...documentData,
    id: documentId,
    createdAt: existingDocument?.createdAt || documentData.createdAt || now,
    updatedAt: now,
    savedAt: now,
    syncSource: documentData.syncSource || existingDocument?.syncSource || 'app-save',
    cloudBacked: canUseCloudDocuments(),
    ...(!existingDocument
      ? creator
      : {
          creatorUserId: existingDocument.creatorUserId || creator.creatorUserId,
          creatorName: existingDocument.creatorName || creator.creatorName,
          creatorRole: existingDocument.creatorRole || creator.creatorRole
        }),
    updatedByUserId: editor.updatedByUserId,
    updatedByName: editor.updatedByName,
    updatedByRole: editor.updatedByRole
  }

  if (canUseCloudDocuments()) {
    try {
      await setDoc(doc(firebaseDb, 'documents', documentId), savedDocument)
    } catch (error) {
      console.error('Unable to save cloud document, keeping local backup.', error)
    }
  }

  syncDocumentToLocal(savedDocument)
  return savedDocument
}

export async function softDeleteDocument(documentId) {
  const localDocument = getLocalDocuments().find((item) => item.id === documentId)
  if (!localDocument) return false

  const nextDocument = {
    ...localDocument,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  if (canUseCloudDocuments()) {
    try {
      await updateDoc(doc(firebaseDb, 'documents', documentId), {
        deletedAt: nextDocument.deletedAt,
        updatedAt: nextDocument.updatedAt
      })
    } catch (error) {
      console.error('Unable to move cloud document to trash, keeping local trash state.', error)
    }
  }

  syncDocumentToLocal(nextDocument)
  return true
}

export async function restoreDocument(documentId) {
  const localDocument = getLocalDocuments().find((item) => item.id === documentId)
  if (!localDocument) return false

  const { deletedAt, ...restoredDocument } = localDocument
  const nextDocument = {
    ...restoredDocument,
    updatedAt: new Date().toISOString()
  }

  if (canUseCloudDocuments()) {
    try {
      await setDoc(doc(firebaseDb, 'documents', documentId), nextDocument, { merge: true })
    } catch (error) {
      console.error('Unable to restore cloud document, keeping local restore state.', error)
    }
  }

  syncDocumentToLocal(nextDocument)
  return true
}

export async function hardDeleteDocument(documentId) {
  if (canUseCloudDocuments()) {
    try {
      await deleteDoc(doc(firebaseDb, 'documents', documentId))
    } catch (error) {
      console.error('Unable to permanently delete cloud document, removing local backup only.', error)
    }
  }

  removeDocumentFromLocal(documentId)
  return true
}
