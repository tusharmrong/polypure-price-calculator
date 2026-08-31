import {
  FileText,
  Home,
  ReceiptText,
  SquarePen,
  WalletCards
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../utils/authContext.jsx'
import { useOffline } from '../utils/offlineMode.jsx'
import { PERMISSIONS } from '../utils/permissions.js'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function BottomNav() {
  const { t, language } = useUiLanguage()
  const isBn = language === 'bn'
  const { hasPermission } = useAuth()
  const { isOffline } = useOffline()

  const allItems = [
    { label: t('nav_dashboard'), path: '/', icon: Home, permission: PERMISSIONS.VIEW_DASHBOARD, offline: false },
    { label: t('nav_calculator'), path: '/calculator', icon: WalletCards, permission: PERMISSIONS.USE_CALCULATOR, offline: true },
    { label: t('nav_quotation'), path: '/quotation', icon: SquarePen, permission: PERMISSIONS.MANAGE_QUOTATIONS, offline: true },
    { label: t('nav_invoice'), path: '/invoice', icon: FileText, permission: PERMISSIONS.MANAGE_INVOICES, offline: true },
    { label: isBn ? 'মানি রিসিপ্ট' : 'Receipt', path: '/money-receipt', icon: ReceiptText, permission: PERMISSIONS.MANAGE_RECEIPTS, offline: true }
  ]

  const items = allItems.filter((item) => {
    if (isOffline) {
      return item.offline
    }
    return hasPermission(item.permission)
  })

  if (!items.length) return null

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-lg md:hidden">
      <div
        className="grid px-1.5 py-1 pb-[calc(0.4rem+env(safe-area-inset-bottom))]"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              className={({ isActive }) =>
                `relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl py-1 px-0.5 text-[10px] font-bold transition-all duration-200 active:scale-95 ${
                  isActive
                    ? 'text-brand-700 bg-brand-50/90 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
              end={item.path === '/'}
              key={item.path}
              to={item.path}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-1 h-0.5 w-5 rounded-full bg-brand-600 animate-in fade-in" />
                  )}
                  <Icon size={19} aria-hidden="true" className={isActive ? 'text-brand-600 scale-105 transition-transform' : 'text-slate-500'} />
                  <span className="truncate w-full text-center text-[9px] sm:text-[10px] leading-tight font-bold tracking-tight mt-0.5">{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
