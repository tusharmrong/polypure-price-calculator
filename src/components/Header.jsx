import { LogOut, Menu, Search, ShieldCheck, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import LanguageToggle from './LanguageToggle.jsx'
import { loadDocuments } from '../utils/documents.js'
import { useAuth } from '../utils/authContext.jsx'
import { PERMISSIONS } from '../utils/permissions.js'
import { useUiLanguage } from '../utils/uiLanguage.js'

const mobileLabels = {
  bn: {
    dashboard: 'ড্যাশবোর্ড',
    calculator: 'ক্যালকুলেটর',
    quotation: 'কোটেশন',
    invoice: 'ইনভয়েস',
    moneyReceipt: 'মানি রিসিপ্ট',
    users: 'ইউজার',
    history: 'হিস্ট্রি',
    settings: 'সেটিংস',
    search: 'ডকুমেন্ট বা ক্লায়েন্ট খুঁজুন',
    noResult: 'কোনো ডকুমেন্ট পাওয়া যায়নি',
    logout: 'লগআউট'
  },
  en: {
    dashboard: 'Dashboard',
    calculator: 'Calculator',
    quotation: 'Quotation',
    invoice: 'Invoice',
    moneyReceipt: 'Money Receipt',
    users: 'Users',
    history: 'History',
    settings: 'Settings',
    search: 'Search document or client',
    noResult: 'No matching document found',
    logout: 'Logout'
  }
}

export default function Header() {
  const { language, setLanguage } = useUiLanguage()
  const { currentUser, logout, hasPermission } = useAuth()
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

  const baseMobileNavItems = [
    { label: copy.dashboard, path: '/' },
    { label: copy.calculator, path: '/calculator' },
    { label: copy.quotation, path: '/quotation' },
    { label: copy.invoice, path: '/invoice' },
    { label: copy.moneyReceipt, path: '/money-receipt' }
  ]

  const adminOnlyMobileItems = [
    hasPermission(PERMISSIONS.VIEW_CLIENTS) ? { label: 'Clients', path: '/clients' } : null,
    hasPermission(PERMISSIONS.VIEW_USERS) ? { label: copy.users, path: '/users' } : null,
    hasPermission(PERMISSIONS.VIEW_HISTORY) ? { label: copy.history, path: '/history' } : null,
    hasPermission(PERMISSIONS.MANAGE_SETTINGS) ? { label: copy.settings, path: '/settings' } : null
  ].filter(Boolean)

  const mobileNavItems = [...baseMobileNavItems, ...adminOnlyMobileItems]

  const titles = {
    '/': 'Dashboard',
    '/calculator': 'Calculator',
    '/quotation': 'Quotation',
    '/invoice': 'Invoice',
    '/money-receipt': 'Money Receipt',
    '/clients': 'Clients',
    '/users': 'Users',
    '/history': 'History',
    '/settings': 'Settings'
  }

  const title = titles[location.pathname] || 'Poly Pure'

  const matches = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return []

    return savedDocuments
      .filter((document) => !document.deletedAt)
      .filter((document) =>
        `${document.number} ${document.clientName} ${document.type}`.toLowerCase().includes(keyword)
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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-[1760px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Poly Pure</p>
          <h1 className="text-xl font-bold text-slate-950">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 md:flex">
              {currentUser.role === 'admin' ? (
                <ShieldCheck size={16} className="text-brand-700" aria-hidden="true" />
              ) : (
                <UserRound size={16} className="text-brand-700" aria-hidden="true" />
              )}
              <div className="leading-tight">
                <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{currentUser.role}</p>
              </div>
            </div>
          ) : null}

          <div className="relative hidden md:block">
            <div className="flex h-10 w-72 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
              <Search size={16} className="text-slate-400" aria-hidden="true" />
              <input
                className="w-full border-0 bg-transparent p-0 text-sm text-slate-700 outline-none"
                onBlur={() => window.setTimeout(() => setFocusSearch(false), 120)}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setFocusSearch(true)}
                placeholder={copy.search}
                type="text"
                value={query}
              />
            </div>
            {focusSearch && query.trim() ? (
              <div className="absolute right-0 top-11 z-40 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
                {matches.length ? (
                  <div className="max-h-80 overflow-auto py-1">
                    {matches.map((document) => (
                      <button
                        className="grid w-full gap-0.5 px-3 py-2 text-left hover:bg-slate-50"
                        key={document.id || document.number}
                        onClick={() => openFromSearch(document)}
                        type="button"
                      >
                        <span className="text-xs font-bold text-slate-900">
                          {document.type} | {document.number}
                        </span>
                        <span className="text-xs text-slate-500">
                          {document.clientName} | {document.displayDate || document.date}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 py-2 text-xs text-slate-500">{copy.noResult}</p>
                )}
              </div>
            ) : null}
          </div>

          <div className="hidden md:block">
            <LanguageToggle compact language={language} onChange={setLanguage} />
          </div>

          <button
            className="hidden h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 md:inline-flex"
            onClick={handleLogout}
            type="button"
          >
            <LogOut size={16} aria-hidden="true" />
            {copy.logout}
          </button>

          <button
            aria-label="Open menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 md:hidden"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="grid gap-1 px-4 py-3">
            {mobileNavItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
                  }`
                }
                key={item.path}
                onClick={() => setMenuOpen(false)}
                to={item.path}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-2">
              <LanguageToggle language={language} onChange={setLanguage} />
            </div>
            <button
              className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              onClick={handleLogout}
              type="button"
            >
              <LogOut size={16} aria-hidden="true" />
              {copy.logout}
            </button>
          </div>
        </div>
      ) : null}
    </header>
  )
}
