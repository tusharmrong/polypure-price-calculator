import {
  FileClock,
  FileText,
  ReceiptText,
  Settings,
  SquarePen,
  WalletCards
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../components/Card.jsx'
import { sampleDocuments } from '../data/sampleDocuments.js'
import { formatCurrency } from '../utils/formatCurrency.js'

const actions = [
  { label: 'Calculator', path: '/calculator', icon: WalletCards },
  { label: 'Create Quotation', path: '/quotation', icon: SquarePen },
  { label: 'Create Invoice', path: '/invoice', icon: FileText },
  { label: 'Create Money Receipt', path: '/money-receipt', icon: ReceiptText },
  { label: 'Recent Documents', path: '/history', icon: FileClock },
  { label: 'Settings', path: '/settings', icon: Settings }
]

export default function Dashboard() {
  return (
    <div className="grid gap-5">
      <section className="rounded-lg bg-brand-600 px-5 py-6 text-white shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <img
            alt="Poly Pure"
            className="h-20 w-20 rounded-full border-2 border-white bg-white object-contain"
            src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
          />
          <div>
            <p className="text-sm font-semibold opacity-90">Poly Pure Price Calculator</p>
            <h2 className="mt-2 text-2xl font-bold">Bag pricing and business documents in one place.</h2>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              className="flex min-h-28 items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-200"
              key={action.path}
              to={action.path}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Icon size={24} aria-hidden="true" />
              </span>
              <span className="text-base font-bold text-slate-950">{action.label}</span>
            </Link>
          )
        })}
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-950">Recent Documents</h3>
          <Link className="text-sm font-semibold text-brand-700" to="/history">
            View all
          </Link>
        </div>
        <div className="grid gap-3">
          {sampleDocuments.map((document) => (
            <div
              className="grid gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
              key={document.number}
            >
              <div>
                <p className="font-semibold text-slate-950">
                  {document.type} | {document.number}
                </p>
                <p className="text-sm text-slate-500">
                  {document.clientName} | {document.date}
                </p>
              </div>
              <p className="font-bold text-brand-700">{formatCurrency(document.amount)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
