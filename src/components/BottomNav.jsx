import {
  FileText,
  ReceiptText,
  SquarePen,
  WalletCards
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  const items = [
    { label: 'Calculator', path: '/calculator', icon: WalletCards },
    { label: 'Quotation', path: '/quotation', icon: SquarePen },
    { label: 'Invoice', path: '/invoice', icon: FileText },
    { label: 'Money Receipt', path: '/money-receipt', icon: ReceiptText }
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white md:hidden">
      <div className="grid grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold ${
                  isActive ? 'text-brand-700' : 'text-slate-500'
                }`
              }
              end
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
