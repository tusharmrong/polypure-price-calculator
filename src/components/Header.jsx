import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadDocuments } from '../utils/documents.js'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function Header() {
  const { language, setLanguage } = useUiLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [focusSearch, setFocusSearch] = useState(false)
  const savedDocuments = useMemo(() => loadDocuments(), [])
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
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
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
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 md:inline-flex">
            <button
              className={`min-h-9 px-3 text-xs font-semibold ${language === 'bn' ? 'bg-brand-600 text-white' : 'bg-white text-slate-700'}`}
              onClick={() => setLanguage('bn')}
              type="button"
            >
              {'\u09AC\u09BE\u0982\u09B2\u09BE'}
            </button>
            <button
              className={`min-h-9 px-3 text-xs font-semibold ${language === 'en' ? 'bg-brand-600 text-white' : 'bg-white text-slate-700'}`}
              onClick={() => setLanguage('en')}
              type="button"
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
