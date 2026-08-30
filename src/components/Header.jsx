import {
  ArrowDownToLine,
  CreditCard,
  Factory,
  FileClock,
  FileText,
  Home,
  IdCard,
  Kanban,
  LogOut,
  Menu,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  SquarePen,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
  WifiOff,
  X
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import LanguageToggle from './LanguageToggle.jsx'
import { loadDocuments } from '../utils/documents.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { useAuth } from '../utils/authContext.jsx'
import { useOffline } from '../utils/offlineMode.jsx'
import { PERMISSIONS } from '../utils/permissions.js'
import { usePwa } from '../utils/pwaInstall.jsx'
import { useUiLanguage } from '../utils/uiLanguage.js'

const mobileLabels = {
  bn: {
    dashboard: 'ড্যাশবোর্ড',
    calculator: 'ক্যালকুলেটর',
    quotation: 'কোটেশন',
    invoice: 'ইনভয়েস',
    moneyReceipt: 'মানি রিসিপ্ট',
    production: 'উৎপাদন ট্র্যাকিং',
    expenses: 'খরচ এন্ট্রি',
    clients: 'ক্লায়েন্ট ডিরেক্টরি',
    reports: 'রিপোর্ট ও লাভ-ক্ষতি',
    factoryCosting: 'কারখানা কস্টিং',
    users: 'ইউজার ম্যানেজমেন্ট',
    history: 'ডকুমেন্ট হিস্ট্রি',
    settings: 'সেটিংস',
    search: 'ডকুমেন্ট বা ক্লায়েন্ট খুঁজুন...',
    noResult: 'কোনো ডকুমেন্ট পাওয়া যায়নি',
    logout: 'লগআউট'
  },
  en: {
    dashboard: 'Dashboard',
    calculator: 'Calculator',
    quotation: 'Quotation',
    invoice: 'Invoice',
    moneyReceipt: 'Money Receipt',
    production: 'Production',
    expenses: 'Expenses',
    clients: 'Clients Directory',
    reports: 'Reports & P&L',
    factoryCosting: 'Factory Costing',
    users: 'User Management',
    history: 'Document History',
    settings: 'Settings',
    search: 'Search document or client...',
    noResult: 'No matching document found',
    logout: 'Logout'
  }
}

export default function Header() {
  const { language, setLanguage } = useUiLanguage()
  const isBn = language === 'bn'
  const { currentUser, logout, hasPermission } = useAuth()
  const { isOffline } = useOffline()
  const { isInstalled, promptInstall } = usePwa()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [focusSearch, setFocusSearch] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [savedDocuments, setSavedDocuments] = useState([])
  const copy = mobileLabels[language === 'en' ? 'en' : 'bn']

  useEffect(() => {
    let isMounted = true

    loadDocuments()
      .then((documents) => {
        if (isMounted) setSavedDocuments(documents)
      })
      .catch((error) => {
        console.error('Unable to load documents for search.', error)
        if (isMounted) setSavedDocuments([])
      })

    return () => {
      isMounted = false
    }
  }, [])

  const offlineMobileNavItems = [
    { label: copy.calculator, path: '/calculator', icon: WalletCards },
    { label: copy.quotation, path: '/quotation', icon: SquarePen },
    { label: copy.invoice, path: '/invoice', icon: FileText },
    { label: copy.moneyReceipt, path: '/money-receipt', icon: ReceiptText }
  ]

  const baseMobileNavItems = isOffline
    ? offlineMobileNavItems
    : [
        { label: copy.dashboard, path: '/', icon: Home },
        { label: copy.calculator, path: '/calculator', icon: WalletCards },
        { label: copy.quotation, path: '/quotation', icon: SquarePen },
        { label: copy.invoice, path: '/invoice', icon: FileText },
        { label: copy.moneyReceipt, path: '/money-receipt', icon: ReceiptText },
        hasPermission(PERMISSIONS.VIEW_PRODUCTION)
          ? { label: copy.production, path: '/production', icon: Kanban }
          : null,
        hasPermission(PERMISSIONS.MANAGE_EXPENSES)
          ? { label: copy.expenses, path: '/expenses', icon: CreditCard }
          : null
      ].filter(Boolean)

  const adminOnlyMobileItems = isOffline
    ? []
    : [
        hasPermission(PERMISSIONS.VIEW_CLIENTS) ? { label: copy.clients, path: '/clients', icon: IdCard } : null,
        hasPermission(PERMISSIONS.VIEW_REPORTS) ? { label: copy.reports, path: '/reports', icon: TrendingUp } : null,
        hasPermission(PERMISSIONS.MANAGE_FACTORY_COST) ? { label: copy.factoryCosting, path: '/factory-costing', icon: Factory } : null,
        hasPermission(PERMISSIONS.VIEW_USERS) ? { label: copy.users, path: '/users', icon: Users } : null,
        hasPermission(PERMISSIONS.VIEW_HISTORY) ? { label: copy.history, path: '/history', icon: FileClock } : null,
        hasPermission(PERMISSIONS.MANAGE_SETTINGS) ? { label: copy.settings, path: '/settings', icon: Settings } : null
      ].filter(Boolean)

  const mobileNavItems = [...baseMobileNavItems, ...adminOnlyMobileItems]

  const pageMeta = {
    '/': { title: 'Dashboard', subtitle: 'Overview & business KPIs', icon: Home },
    '/calculator': { title: 'Price Calculator', subtitle: 'Job cost estimation', icon: WalletCards },
    '/quotation': { title: 'Quotation Form', subtitle: 'Create client proposal', icon: SquarePen },
    '/invoice': { title: 'Invoice Billing', subtitle: 'Bill & payment tracking', icon: FileText },
    '/money-receipt': { title: 'Money Receipt', subtitle: 'Acknowledge payment', icon: ReceiptText },
    '/production': { title: 'Production Tracking', subtitle: 'Factory manufacturing pipeline & job cards', icon: Kanban },
    '/expenses': { title: 'Expense Logger', subtitle: 'Daily costs & petty cash', icon: CreditCard },
    '/clients': { title: 'Clients Directory', subtitle: 'Manage client database', icon: IdCard },
    '/reports': { title: 'Reports & P&L', subtitle: 'Profit & Loss, Cash flow & Dues', icon: TrendingUp },
    '/factory-costing': { title: 'Factory Costing', subtitle: 'Per-order COGS, production cost & net profit', icon: Factory },
    '/users': { title: 'User Management', subtitle: 'Manage team access', icon: Users },
    '/history': { title: 'Document History', subtitle: 'Previous records sheet', icon: FileClock },
    '/settings': { title: 'System Settings', subtitle: 'Company info & printing', icon: Settings }
  }

  const currentMeta = pageMeta[location.pathname] || {
    title: 'Poly Pure',
    subtitle: 'Printing & Packaging Business Suite',
    icon: Home
  }

  const PageIcon = currentMeta.icon

  const matches = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return []

    return savedDocuments
      .filter((document) => !document.deletedAt)
      .filter((document) =>
        `${document.number} ${document.clientName} ${document.type} ${document.phone || ''}`
          .toLowerCase()
          .includes(keyword)
      )
      .slice(0, 6)
  }, [query, savedDocuments])

  const openFromSearch = (document) => {
    const targetByType = {
      Quotation: '/quotation',
      Invoice: '/invoice',
      'Money Receipt': '/money-receipt'
    }
    const targetPath = targetByType[document.type]
    if (!targetPath) return
    navigate(targetPath, { state: { prefillDocument: document } })
    setQuery('')
    setFocusSearch(false)
    setMenuOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <header className="shrink-0 border-b border-slate-200/80 bg-white/95 shadow-2xs backdrop-blur-md z-30">
        <div className="mx-auto flex flex-col w-full max-w-[1760px] px-4 sm:px-6 lg:px-8">
          {/* Top Bar: Title & Right Actions */}
          <div className="flex min-h-14 items-center justify-between gap-3 py-2 border-b border-slate-100/90">
            {/* Page Title & Breadcrumb */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 border border-brand-100 text-brand-700">
                <PageIcon size={18} />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 whitespace-nowrap">
                  {currentMeta.title}
                </h1>
                <p className="hidden sm:block text-xs text-slate-500 truncate max-w-sm">
                  {currentMeta.subtitle}
                </p>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Offline Mode Pill */}
              {isOffline && (
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-amber-900 shadow-2xs whitespace-nowrap shrink-0">
                  <WifiOff size={14} className="text-amber-700 shrink-0" />
                  <span className="whitespace-nowrap">{language === 'en' ? 'Offline Mode' : 'অফলাইন মোড'}</span>
                </div>
              )}

              {/* Install App Button */}
              {!isInstalled && (
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-brand-700 shadow-2xs whitespace-nowrap shrink-0 transition hover:bg-brand-100 hover:border-brand-300"
                  onClick={promptInstall}
                  title={language === 'en' ? 'Install App' : 'অ্যাপ ইন্সটল করুন'}
                  type="button"
                >
                  <ArrowDownToLine size={14} className="text-brand-600 shrink-0" />
                  <span className="whitespace-nowrap">{language === 'en' ? 'Install App' : 'ইন্সটল অ্যাপ'}</span>
                </button>
              )}

              {/* Language Toggle */}
              <div className="hidden sm:block shrink-0">
                <LanguageToggle compact language={language} onChange={setLanguage} />
              </div>

              {/* Mobile Menu Toggle Button */}
              <button
                aria-label="Open navigation menu"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs transition hover:bg-slate-50 md:hidden"
                onClick={() => setMenuOpen(true)}
                type="button"
              >
                <Menu size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Bottom Bar: Search Bar */}
          <div className="py-2.5">
            <div className="relative w-full">
              <div className="flex h-9.5 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 transition focus-within:border-brand-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
                <Search size={15} className="text-slate-400 shrink-0" aria-hidden="true" />
                <input
                  className="w-full border-0 bg-transparent p-0 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none font-medium"
                  onBlur={() => window.setTimeout(() => setFocusSearch(false), 150)}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => setFocusSearch(true)}
                  placeholder={copy.search}
                  type="text"
                  value={query}
                />
                {query ? (
                  <button
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                    onClick={() => setQuery('')}
                    type="button"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>

              {/* Search Dropdown */}
              {focusSearch && query.trim() ? (
                <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  {matches.length ? (
                    <div className="max-h-80 overflow-auto divide-y divide-slate-100 py-1">
                      {matches.map((document) => {
                        const isQuotation = document.type === 'Quotation'
                        const isInvoice = document.type === 'Invoice'
                        return (
                          <button
                            className="flex w-full items-start justify-between gap-3 p-3.5 text-left transition hover:bg-slate-50"
                            key={document.id || document.number}
                            onClick={() => openFromSearch(document)}
                            type="button"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                    isQuotation
                                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                                      : isInvoice
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {document.type}
                                </span>
                                <span className="font-mono text-xs font-bold text-slate-900">
                                  {document.number}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs sm:text-sm font-semibold text-slate-800">
                                {document.clientName || 'Unknown Client'}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {document.displayDate || document.date}
                              </p>
                            </div>

                            {document.totalAmount || document.receivedAmount ? (
                              <span className="shrink-0 text-xs sm:text-sm font-bold text-brand-700">
                                {formatCurrency(document.totalAmount || document.receivedAmount)}
                              </span>
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="p-4 text-center text-xs text-slate-500">{copy.noResult}</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Off-Canvas Slide-Over Drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative flex h-full w-[82vw] max-w-sm flex-col justify-between bg-white p-5 shadow-2xl">
            <div className="space-y-6 overflow-y-auto">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <img
                    alt="Poly Pure"
                    className="h-9 w-9 rounded-xl border border-brand-100 bg-white object-contain"
                    src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
                  />
                  <div>
                    <p className="text-xs font-semibold text-brand-700">Poly Pure</p>
                    <p className="text-sm font-bold text-slate-950">Business Suite</p>
                  </div>
                </div>

                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                  onClick={() => setMenuOpen(false)}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mobile Search */}
              <div>
                <div className="flex h-9.5 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                  <Search size={15} className="text-slate-400" />
                  <input
                    className="w-full border-0 bg-transparent text-xs text-slate-800 placeholder-slate-400 outline-none"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={copy.search}
                    type="text"
                    value={query}
                  />
                </div>
                {query.trim() && matches.length ? (
                  <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                    {matches.map((doc) => (
                      <button
                        className="flex w-full items-center justify-between p-2.5 text-left border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        key={doc.id || doc.number}
                        onClick={() => openFromSearch(doc)}
                        type="button"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">{doc.number}</p>
                          <p className="text-[11px] text-slate-500">{doc.clientName}</p>
                        </div>
                        <span className="text-[10px] font-bold text-brand-700">{doc.type}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Drawer Nav Links */}
              {isOffline ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <WifiOff size={14} className="text-amber-700" />
                    <span>{isBn ? 'অফলাইন মোড সক্রিয়' : 'Offline Mode Active'}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
                    {isBn
                      ? 'শুধুমাত্র ক্যালকুলেটর, কোটেশন, ইনভয়েস ও মানি রিসিপ্ট অফলাইনে ব্যবহারের জন্য প্রস্তুত রয়েছে।'
                      : 'Calculator, Quotation, Invoice & Money Receipt are active without internet.'}
                  </p>
                </div>
              ) : null}

              <nav className="grid gap-1">
                {mobileNavItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                          isActive
                            ? 'border border-brand-200 bg-brand-50 text-brand-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`
                      }
                      end={item.path === '/'}
                      key={item.path}
                      onClick={() => setMenuOpen(false)}
                      to={item.path}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </nav>

              {/* Mobile Install App Button */}
              {!isInstalled && (
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white shadow-soft hover:bg-brand-700 transition"
                  onClick={() => {
                    setMenuOpen(false)
                    promptInstall()
                  }}
                  type="button"
                >
                  <ArrowDownToLine size={16} />
                  <span>{language === 'en' ? 'Install App on Device' : 'ডিভাইসে অ্যাপ ইন্সটল করুন'}</span>
                </button>
              )}

              {/* Language Switch */}
              <div className="pt-1">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Language / ভাষা
                </p>
                <LanguageToggle language={language} onChange={setLanguage} />
              </div>
            </div>

            {/* Bottom User info & Logout */}
            {currentUser ? (
              <div className="border-t border-slate-100 pt-4">
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 border border-brand-200">
                    {currentUser.role === 'admin' ? <ShieldCheck size={18} /> : <UserRound size={18} />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">{currentUser.name}</p>
                    <p className="text-[10px] uppercase font-semibold text-slate-500">{currentUser.role}</p>
                  </div>
                </div>

                <button
                  className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                  onClick={handleLogout}
                  type="button"
                >
                  <LogOut size={15} />
                  {copy.logout}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}


