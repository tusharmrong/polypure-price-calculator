import {
  CreditCard,
  Factory,
  FileClock,
  FileText,
  Home,
  IdCard,
  Kanban,
  LogOut,
  ReceiptText,
  Settings,
  ShieldCheck,
  SquarePen,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
  WifiOff
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { APP_NAME } from '../utils/appMeta.js'
import { useAuth } from '../utils/authContext.jsx'
import { useOffline } from '../utils/offlineMode.jsx'
import { PERMISSIONS } from '../utils/permissions.js'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function Sidebar() {
  const { t, language } = useUiLanguage()
  const isBn = language === 'bn'
  const { currentUser, logout, hasPermission } = useAuth()
  const { isOffline } = useOffline()
  const navigate = useNavigate()

  const offlineItems = [
    { label: t('nav_calculator'), path: '/calculator', icon: WalletCards },
    { label: t('nav_quotation'), path: '/quotation', icon: SquarePen },
    { label: t('nav_invoice'), path: '/invoice', icon: FileText },
    { label: t('nav_money_receipt'), path: '/money-receipt', icon: ReceiptText }
  ]

  const coreItems = isOffline
    ? offlineItems
    : [
        { label: t('nav_dashboard'), path: '/', icon: Home },
        { label: t('nav_calculator'), path: '/calculator', icon: WalletCards },
        { label: t('nav_quotation'), path: '/quotation', icon: SquarePen },
        { label: t('nav_invoice'), path: '/invoice', icon: FileText },
        { label: t('nav_money_receipt'), path: '/money-receipt', icon: ReceiptText },
        hasPermission(PERMISSIONS.VIEW_PRODUCTION)
          ? { label: t('nav_production'), path: '/production', icon: Kanban }
          : null,
        hasPermission(PERMISSIONS.MANAGE_EXPENSES)
          ? { label: t('nav_expenses'), path: '/expenses', icon: CreditCard }
          : null
      ].filter(Boolean)

  const adminItems = isOffline
    ? []
    : [
        hasPermission(PERMISSIONS.VIEW_CLIENTS)
          ? { label: t('nav_clients'), path: '/clients', icon: IdCard }
          : null,
        hasPermission(PERMISSIONS.VIEW_REPORTS)
          ? { label: t('nav_reports'), path: '/reports', icon: TrendingUp }
          : null,
        hasPermission(PERMISSIONS.MANAGE_FACTORY_COST)
          ? { label: t('nav_factory_costing'), path: '/factory-costing', icon: Factory }
          : null,
        hasPermission(PERMISSIONS.VIEW_USERS)
          ? { label: t('nav_users'), path: '/users', icon: Users }
          : null,
        hasPermission(PERMISSIONS.VIEW_HISTORY)
          ? { label: t('nav_history'), path: '/history', icon: FileClock }
          : null,
        hasPermission(PERMISSIONS.MANAGE_SETTINGS)
          ? { label: t('nav_settings'), path: '/settings', icon: Settings }
          : null
      ].filter(Boolean)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-slate-200/80 bg-white md:block">
      <div className="flex h-full flex-col justify-between p-4">
        <div className="space-y-6 overflow-y-auto pr-1">
          {/* Brand Header Card */}
          <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <img
                alt="Poly Pure"
                className="h-11 w-11 rounded-xl border border-white/20 bg-white object-contain p-0.5 shadow-sm"
                src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold tracking-wide text-brand-400">Poly Pure</span>
                  {isOffline ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Offline
                    </span>
                  ) : (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <p className="truncate text-base font-extrabold tracking-tight text-white">
                  {APP_NAME.replace('Poly Pure ', '')}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Groups */}
          <div className="space-y-5">
            {/* Workspace / Core Documents */}
            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {isOffline ? (isBn ? 'অফলাইন টুলসমূহ' : 'Offline Tools') : 'Workspace'}
              </p>
              <nav className="mt-1.5 grid gap-1">
                {coreItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      className={({ isActive }) =>
                        `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          isActive
                            ? 'border border-brand-200 bg-brand-50/90 text-brand-700 shadow-2xs font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                        }`
                      }
                      end={item.path === '/'}
                      key={item.path}
                      to={item.path}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </nav>
            </div>

            {/* Offline Info Card */}
            {isOffline ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <WifiOff size={14} />
                  <span>{isBn ? 'অফলাইন মোড সক্রিয়' : 'Offline Mode'}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
                  {isBn
                    ? 'ক্যালকুলেটর, কোটেশন, ইনভয়েস ও মানি রিসিপ্ট অফলাইনে প্রস্তুত।'
                    : 'Calculator, Quotation, Invoice & Money Receipt are active offline.'}
                </p>
              </div>
            ) : null}

            {/* Management / Administration */}
            {adminItems.length ? (
              <div>
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Management
                </p>
                <nav className="mt-1.5 grid gap-1">
                  {adminItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <NavLink
                        className={({ isActive }) =>
                          `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                            isActive
                              ? 'border border-brand-200 bg-brand-50/90 text-brand-700 shadow-2xs font-bold'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                          }`
                        }
                        key={item.path}
                        to={item.path}
                      >
                        <Icon size={18} aria-hidden="true" />
                        <span>{item.label}</span>
                      </NavLink>
                    )
                  })}
                </nav>
              </div>
            ) : null}
          </div>
        </div>

        {/* Bottom User Card & Quick Logout */}
        {currentUser ? (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 border border-brand-200 text-brand-700">
                  {currentUser.role === 'admin' ? (
                    <ShieldCheck size={18} />
                  ) : (
                    <UserRound size={18} />
                  )}
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-xs font-bold text-slate-900">{currentUser.name}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {currentUser.role}
                  </p>
                </div>
              </div>

              <button
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                onClick={handleLogout}
                title="Logout"
                type="button"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
