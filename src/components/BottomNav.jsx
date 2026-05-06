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

const items = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Calc', path: '/calculator', icon: WalletCards },
  { label: 'Quote', path: '/quotation', icon: SquarePen },
  { label: 'Invoice', path: '/invoice', icon: FileText },
  { label: 'Receipt', path: '/money-receipt', icon: ReceiptText },
  { label: 'History', path: '/history', icon: FileClock },
  { label: 'Settings', path: '/settings', icon: Settings }
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white md:hidden">
      <div className="grid grid-cols-7 px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
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
