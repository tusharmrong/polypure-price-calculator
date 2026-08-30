import { defaultSettings } from '../data/defaultSettings.js'
import { loadValue, saveValue } from './storage.js'

const companySettingsKey = 'companySettings'

export function loadCompanySettings() {
  const saved = loadValue(companySettingsKey, {})
  const settings = {
    ...defaultSettings,
    ...saved
  }
  // Auto-upgrade if terms don't yet have the new 10-item clauses
  if (saved.terms && !saved.terms.includes('২০০০০') && !saved.terms.includes('20000')) {
    settings.terms = defaultSettings.terms
  }
  return settings
}

export function saveCompanySettings(settings) {
  saveValue(companySettingsKey, settings)
}
