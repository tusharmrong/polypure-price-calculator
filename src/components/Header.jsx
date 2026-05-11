import { Menu, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import LanguageToggle from './LanguageToggle.jsx'
import { loadDocuments } from '../utils/documents.js'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function Header() {
  const { language, setLanguage } = useUiLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [focusSearch, setFocusSearch] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const savedDocuments = useMemo(() => loadDocuments(), [])
  const mobileNavItems = [
    { label: language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard', path: '/' },
    { label: language === 'bn' ? 'ক্যালকুলেটর' : 'Calculator', path: '/calculator' },
    { label: language === 'bn' ? 'কোটেশন' : 'Quotation', path: '/quotation' },
    { label: language === 'bn' ? 'ইনভয়েস' : 'Invoice', path: '/invoice' },
    { label: language === 'bn' ? 'মানি রিসিপ্ট' : 'Money Receipt', path: '/money-receipt' },
    { label: language === 'bn' ? 'হিস্ট্রি' : 'History', path: '/history' },
    { label: language === 'bn' ? 'সেটিংস' : 'Settings', path: '/settings' }
  ]
  const titles = {
    '/': 'Dashboard',
    '/calculator': 'Calculator',
    '/quotation': 'Quotation',
    '/invoice': 'Invoice',
    '/money-receipt': 'Money Receipt',
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

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-16 w-full items-center justify-between px-4 sm:px-6 md:mx-auto md:max-w-6xl lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Poly Pure</p>
          <h1 className="text-xl font-bold text-slate-950">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <div className="flex h-10 w-72 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
              <Search size={16} className="text-slate-400" aria-hidden="true" />
              <input
                className="w-full border-0 bg-transparent p-0 text-sm text-slate-700 outline-none"
                onBlur={() => window.setTimeout(() => setFocusSearch(false), 120)}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setFocusSearch(true)}
                placeholder={language === 'bn' ? 'ডকুমেন্ট বা ক্লায়েন্ট খুঁজুন' : 'Search document or client'}
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
                  <p className="px-3 py-2 text-xs text-slate-500">
                    {language === 'bn' ? 'কোনো ডকুমেন্ট পাওয়া যায়নি' : 'No matching document found'}
                  </p>
                )}
              </div>
            ) : null}
          </div>
          <div className="hidden md:block">
            <LanguageToggle language={language} onChange={setLanguage} compact />
          </div>
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
          </div>
        </div>
      ) : null}
    </header>
  )
}
