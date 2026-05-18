import { filterClientSuggestions } from '../utils/clientSuggestions.js'

export default function ClientSuggestions({ suggestions, query, onSelect }) {
  const visibleSuggestions = filterClientSuggestions(suggestions, query)

  if (!visibleSuggestions.length) return null

  return (
    <div className="md:col-span-2 rounded-lg border border-brand-100 bg-brand-50/70 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Previous client suggestions</p>
      <div className="mt-2 grid gap-2">
        {visibleSuggestions.map((client) => (
          <button
            className="rounded-lg border border-brand-100 bg-white px-3 py-2 text-left transition hover:border-brand-300 hover:bg-white"
            key={client.id}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(client)}
            type="button"
          >
            <span className="block text-sm font-bold text-slate-950">{client.clientName}</span>
            <span className="block text-xs text-slate-600">
              {client.phone || 'No phone'}{client.address ? ` | ${client.address}` : ''}
            </span>
            {client.lastDocumentNumber ? (
              <span className="mt-1 block text-[11px] font-semibold text-brand-700">
                Last used: {client.lastDocumentType} {client.lastDocumentNumber}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}
