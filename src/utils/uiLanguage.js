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
    nav_expenses: 'Expenses',
    nav_clients: 'Clients',
    nav_history: 'History',
    nav_reports: 'Reports & P&L',
    nav_factory_costing: 'Factory Costing',
    nav_production: 'Production',
    nav_users: 'Users',
    nav_settings: 'Settings',
    app_title: 'Business Suite',
    dashboard_tagline: 'Bag pricing, profit & loss, expenses, and client dues in one place.',
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
    install_now: 'Install Business Suite',
    installed: 'Already Installed',
    company_settings: 'Company Settings',
    save_company_settings: 'Save Company Settings',
    backup_restore: 'Backup and Restore',
    export_backup: 'Export Backup JSON',
    import_backup: 'Import Backup JSON'
  },
  bn: {
    nav_dashboard: 'ড্যাশবোর্ড',
    nav_calculator: 'ক্যালকুলেটর',
    nav_quotation: 'কোটেশন',
    nav_invoice: 'ইনভয়েস',
    nav_money_receipt: 'মানি রিসিপ্ট',
    nav_expenses: 'খরচ এন্ট্রি',
    nav_clients: 'ক্লায়েন্ট',
    nav_history: 'হিস্ট্রি',
    nav_reports: 'রিপোর্ট ও লাভ-ক্ষতি',
    nav_factory_costing: 'কারখানা কস্টিং',
    nav_production: 'উৎপাদন ট্র্যাকিং',
    nav_users: 'ইউজার',
    nav_settings: 'সেটিংস',
    app_title: 'বিজনেস স্যুট',
    dashboard_tagline: 'ব্যাগের দাম, লাভ-ক্ষতি এবং ক্লায়েন্ট বকেয়া এক জায়গায়।',
    dashboard_recent_documents: 'সাম্প্রতিক ডকুমেন্ট',
    view_all: 'সব দেখুন',
    history_title: 'হিস্ট্রি',
    history_sample_note: 'আপনি প্রথম কোটেশন সেভ না করা পর্যন্ত নমুনা ডকুমেন্ট দেখানো হচ্ছে।',
    history_saved_note: 'এই ডিভাইসে সেভ করা ডকুমেন্ট।',
    history_filter_type: 'টাইপ দিয়ে ফিল্টার',
    history_search: 'ডকুমেন্ট নম্বর বা ক্লায়েন্ট দিয়ে খুঁজুন',
    history_no_data: 'এই ফিল্টারে কোনো ডকুমেন্ট পাওয়া যায়নি।',
    actions: 'অ্যাকশন',
    open: 'ওপেন',
    duplicate: 'ডুপ্লিকেট',
    settings_title: 'সেটিংস',
    install_app: 'অ্যাপ ইনস্টল',
    install_app_text: 'দ্রুত ব্যবহার ও ফুল-স্ক্রিন অভিজ্ঞতার জন্য ফোন বা পিসিতে অ্যাপ ইনস্টল করুন।',
    install_now: 'বিজনেস স্যুট ইনস্টল করুন',
    installed: 'ইনস্টল করা আছে',
    company_settings: 'কোম্পানি সেটিংস',
    save_company_settings: 'কোম্পানি সেটিংস সেভ করুন',
    backup_restore: 'ব্যাকআপ ও রিস্টোর',
    export_backup: 'ব্যাকআপ JSON ডাউনলোড',
    import_backup: 'ব্যাকআপ JSON ইম্পোর্ট'
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
