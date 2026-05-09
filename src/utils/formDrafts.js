import { loadValue, saveValue } from './storage.js'

const draftPrefix = 'formDraft:'

export function loadFormDraft(formId, fallback = null) {
  return loadValue(`${draftPrefix}${formId}`, fallback)
}

export function saveFormDraft(formId, value) {
  return saveValue(`${draftPrefix}${formId}`, value)
}

export function clearFormDraft(formId) {
  return saveValue(`${draftPrefix}${formId}`, null)
}
