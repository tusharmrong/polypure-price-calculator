import { useLocation } from 'react-router-dom'

const titles = {
  '/': 'Dashboard',
  '/calculator': 'Calculator',
  '/quotation': 'Quotation',
  '/invoice': 'Invoice',
  '/money-receipt': 'Money Receipt',
  '/history': 'History',
  '/settings': 'Settings'
}

export default function Header() {
  const location = useLocation()
  const title = titles[location.pathname] || 'Poly Pure'

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Poly Pure</p>
          <h1 className="text-xl font-bold text-slate-950">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <img
            alt="Poly Pure"
            className="hidden h-10 w-10 rounded-full border border-brand-100 bg-white object-contain sm:block md:hidden"
            src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
          />
        </div>
      </div>
    </header>
  )
}
