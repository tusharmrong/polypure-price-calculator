import {
  FileClock,
  FileText,
  Home,
  ReceiptText,
  Settings,
  SquarePen,
  WalletCards
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function BottomNav() {
  const { t } = useUiLanguage()
  const items = [
    { label: t('nav_dashboard'), path: '/', icon: Home },
    { label: t('nav_calculator'), path: '/calculator', icon: WalletCards },
    { label: t('nav_quotation'), path: '/quotation', icon: SquarePen },
    { label: t('nav_invoice'), path: '/invoice', icon: FileText },
    { label: t('nav_money_receipt'), path: '/money-receipt', icon: ReceiptText },
    { label: t('nav_history'), path: '/history', icon: FileClock },
    { label: t('nav_settings'), path: '/settings', icon: Settings }
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white md:hidden">
      <div className="grid grid-cols-7 px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${
                  isActive ? 'text-brand-700' : 'text-slate-500'
                }`
              }
              end={item.path === '/'}
              key={item.path}
              to={item.path}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
