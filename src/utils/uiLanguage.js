import { createContext, createElement, useContext, useMemo, useState } from 'react'
import { loadValue, saveValue } from './storage.js'

const UiLanguageContext = createContext(null)

const translations = {
  en: {
    nav_dashboard: 'Dashboard',
    nav_calculator: 'Calculator',
    nav_quotation: 'Quotation',
    nav_invoice: 'Invoice',
    nav_money_receipt: 'Money Receipt',
    nav_history: 'History',
    nav_settings: 'Settings',
    app_title: 'Price Calculator',
    dashboard_tagline: 'Bag pricing and business documents in one place.',
    dashboard_recent_documents: 'Recent Documents',
    view_all: 'View all',
    history_title: 'History',
    history_sample_note: 'Sample documents are shown until you save your first quotation.',
    history_saved_note: 'Saved documents on this device.',
    history_filter_type: 'Filter by type',
    history_search: 'Search by document number or client',
    history_no_data: 'No document found for this filter.',
    actions: 'Actions',
    open: 'Open',
    duplicate: 'Duplicate',
    settings_title: 'Settings',
    install_app: 'Install App',
    install_app_text: 'Install this app on your phone or PC for quick access and full-screen experience.',
    install_now: 'Install Polypure App',
    installed: 'Already Installed',
    company_settings: 'Company Settings',
    save_company_settings: 'Save Company Settings',
    backup_restore: 'Backup and Restore',
    export_backup: 'Export Backup JSON',
    import_backup: 'Import Backup JSON'
  },
  bn: {
    nav_dashboard: '\u09A1\u09CD\u09AF\u09BE\u09B6\u09AC\u09CB\u09B0\u09CD\u09A1',
    nav_calculator: '\u0995\u09CD\u09AF\u09BE\u09B2\u0995\u09C1\u09B2\u09C7\u099F\u09B0',
    nav_quotation: '\u0995\u09CB\u099F\u09C7\u09B6\u09A8',
    nav_invoice: '\u0987\u09A8\u09AD\u09DF\u09C7\u09B8',
    nav_money_receipt: '\u09AE\u09BE\u09A8\u09BF \u09B0\u09BF\u09B8\u09BF\u09AA\u09CD\u099F',
    nav_history: '\u09B9\u09BF\u09B8\u09CD\u099F\u09CD\u09B0\u09BF',
    nav_settings: '\u09B8\u09C7\u099F\u09BF\u0982\u09B8',
    app_title: '\u09AA\u09CD\u09B0\u09BE\u0987\u09B8 \u0995\u09CD\u09AF\u09BE\u09B2\u0995\u09C1\u09B2\u09C7\u099F\u09B0',
    dashboard_tagline: '\u09AC\u09CD\u09AF\u09BE\u0997\u09C7\u09B0 \u09A6\u09BE\u09AE \u0993 \u09AC\u09CD\u09AF\u09AC\u09B8\u09BE\u09B0 \u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F \u098F\u0995 \u099C\u09BE\u09DF\u0997\u09BE\u09DF\u0964',
    dashboard_recent_documents: '\u09B8\u09BE\u09AE\u09CD\u09AA\u09CD\u09B0\u09A4\u09BF\u0995 \u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F',
    view_all: '\u09B8\u09AC \u09A6\u09C7\u0996\u09C1\u09A8',
    history_title: '\u09B9\u09BF\u09B8\u09CD\u099F\u09CD\u09B0\u09BF',
    history_sample_note: '\u0986\u09AA\u09A8\u09BF \u09AA\u09CD\u09B0\u09A5\u09AE \u0995\u09CB\u099F\u09C7\u09B6\u09A8 \u09B8\u09C7\u09AD \u09A8\u09BE \u0995\u09B0\u09BE \u09AA\u09B0\u09CD\u09AF\u09A8\u09CD\u09A4 \u09A8\u09AE\u09C1\u09A8\u09BE \u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F \u09A6\u09C7\u0996\u09BE\u09A8\u09CB \u09B9\u099A\u09CD\u099B\u09C7\u0964',
    history_saved_note: '\u098F\u0987 \u09A1\u09BF\u09AD\u09BE\u0987\u09B8\u09C7 \u09B8\u09C7\u09AD \u0995\u09B0\u09BE \u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F\u0964',
    history_filter_type: '\u099F\u09BE\u0987\u09AA \u09A6\u09BF\u09DF\u09C7 \u09AB\u09BF\u09B2\u09CD\u099F\u09BE\u09B0',
    history_search: '\u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F \u09A8\u09AE\u09CD\u09AC\u09B0 \u09AC\u09BE \u0995\u09CD\u09B2\u09BE\u09DF\u09C7\u09A8\u09CD\u099F \u09A6\u09BF\u09DF\u09C7 \u0996\u09C1\u0981\u099C\u09C1\u09A8',
    history_no_data: '\u098F\u0987 \u09AB\u09BF\u09B2\u09CD\u099F\u09BE\u09B0\u09C7 \u0995\u09CB\u09A8\u09CB \u09A1\u0995\u09C1\u09AE\u09C7\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09DF\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF\u0964',
    actions: '\u0985\u09CD\u09AF\u09BE\u0995\u09B6\u09A8',
    open: '\u0993\u09AA\u09C7\u09A8',
    duplicate: '\u09A1\u09C1\u09AA\u09CD\u09B2\u09BF\u0995\u09C7\u099F',
    settings_title: '\u09B8\u09C7\u099F\u09BF\u0982\u09B8',
    install_app: '\u0985\u09CD\u09AF\u09BE\u09AA \u0987\u09A8\u09B8\u09CD\u099F\u09B2',
    install_app_text: '\u09A6\u09CD\u09B0\u09C1\u09A4 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0993 \u09AB\u09C1\u09B2-\u09B8\u09CD\u0995\u09CD\u09B0\u09BF\u09A8 \u0985\u09AD\u09BF\u099C\u09CD\u099E\u09A4\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09AB\u09CB\u09A8 \u09AC\u09BE \u09AA\u09BF\u09B8\u09BF\u09A4\u09C7 \u0985\u09CD\u09AF\u09BE\u09AA \u0987\u09A8\u09B8\u09CD\u099F\u09B2 \u0995\u09B0\u09C1\u09A8\u0964',
    install_now: '\u09AA\u09B2\u09BF\u09AA\u09BF\u0989\u09B0 \u0985\u09CD\u09AF\u09BE\u09AA \u0987\u09A8\u09B8\u09CD\u099F\u09B2 \u0995\u09B0\u09C1\u09A8',
    installed: '\u0987\u09A8\u09B8\u09CD\u099F\u09B2 \u0995\u09B0\u09BE \u0986\u099B\u09C7',
    company_settings: '\u0995\u09CB\u09AE\u09CD\u09AA\u09BE\u09A8\u09BF \u09B8\u09C7\u099F\u09BF\u0982\u09B8',
    save_company_settings: '\u0995\u09CB\u09AE\u09CD\u09AA\u09BE\u09A8\u09BF \u09B8\u09C7\u099F\u09BF\u0982\u09B8 \u09B8\u09C7\u09AD \u0995\u09B0\u09C1\u09A8',
    backup_restore: '\u09AC\u09CD\u09AF\u09BE\u0995\u0986\u09AA \u0993 \u09B0\u09BF\u09B8\u09CD\u099F\u09CB\u09B0',
    export_backup: '\u09AC\u09CD\u09AF\u09BE\u0995\u0986\u09AA JSON \u09A1\u09BE\u0989\u09A8\u09B2\u09CB\u09A1',
    import_backup: '\u09AC\u09CD\u09AF\u09BE\u0995\u0986\u09AA JSON \u0987\u09AE\u09CD\u09AA\u09CB\u09B0\u09CD\u099F'
  }
}

export function UiLanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => loadValue('uiLanguage', 'bn'))

  const value = useMemo(() => {
    const safeLanguage = language === 'en' ? 'en' : 'bn'
    return {
      language: safeLanguage,
      setLanguage: (next) => {
        const safeNext = next === 'en' ? 'en' : 'bn'
        saveValue('uiLanguage', safeNext)
        setLanguage(safeNext)
      },
      t: (key) => translations[safeLanguage][key] || translations.en[key] || key
    }
  }, [language])

  return createElement(UiLanguageContext.Provider, { value }, children)
}

export function useUiLanguage() {
  const context = useContext(UiLanguageContext)
  if (!context) {
    return {
      language: 'bn',
      setLanguage: () => {},
      t: (key) => key
    }
  }
  return context
}
