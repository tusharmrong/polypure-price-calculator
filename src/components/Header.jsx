import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function Header() {
  const { language, setLanguage, t } = useUiLanguage()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const navItems = [
    { label: t('nav_dashboard'), path: '/' },
    { label: t('nav_calculator'), path: '/calculator' },
    { label: t('nav_quotation'), path: '/quotation' },
    { label: t('nav_invoice'), path: '/invoice' },
    { label: t('nav_money_receipt'), path: '/money-receipt' },
    { label: t('nav_history'), path: '/history' },
    { label: t('nav_settings'), path: '/settings' }
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

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Poly Pure</p>
          <h1 className="text-xl font-bold text-slate-950">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
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
          <button
            aria-label="Open menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 md:hidden"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
          <img
            alt="Poly Pure"
            className="hidden h-10 w-10 rounded-full border border-brand-100 bg-white object-contain sm:block md:hidden"
            src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
          />
        </div>
      </div>
      {menuOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 py-3 shadow-soft md:hidden">
          <nav className="grid gap-2">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
                end={item.path === '/'}
                key={item.path}
                onClick={() => setMenuOpen(false)}
                to={item.path}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  )
}
