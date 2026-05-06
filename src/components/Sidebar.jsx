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
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Calculator', path: '/calculator', icon: WalletCards },
  { label: 'Quotation', path: '/quotation', icon: SquarePen },
  { label: 'Invoice', path: '/invoice', icon: FileText },
  { label: 'Money Receipt', path: '/money-receipt', icon: ReceiptText },
  { label: 'History', path: '/history', icon: FileClock },
  { label: 'Settings', path: '/settings', icon: Settings }
]

export default function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="sticky top-0 flex h-screen flex-col p-5">
        <div className="mb-8 rounded-lg bg-brand-600 px-4 py-5 text-white">
          <div className="flex items-center gap-3">
            <img
              alt="Poly Pure"
              className="h-14 w-14 rounded-full border-2 border-white bg-white object-contain"
              src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
            />
            <div>
              <p className="text-sm font-semibold opacity-90">Poly Pure</p>
              <p className="mt-1 text-xl font-bold">Price Calculator</p>
            </div>
          </div>
        </div>
        <nav className="grid gap-2">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                className={({ isActive }) =>
                  `flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`
                }
                end={item.path === '/'}
                key={item.path}
                to={item.path}
              >
                <Icon size={20} aria-hidden="true" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
