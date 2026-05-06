import { defaultSettings } from '../data/defaultSettings.js'
import { loadValue, saveValue } from './storage.js'

const companySettingsKey = 'companySettings'

export function loadCompanySettings() {
  const saved = loadValue(companySettingsKey, {})
  return {
    ...defaultSettings,
    ...saved
  }
}

export function saveCompanySettings(settings) {
  saveValue(companySettingsKey, settings)
}
