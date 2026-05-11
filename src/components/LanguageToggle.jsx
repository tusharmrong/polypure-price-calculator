export default function LanguageToggle({ language, onChange, compact = false }) {
  return (
    <div
      className={`inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm ${
        compact ? 'gap-1' : 'gap-1.5'
      }`}
      role="group"
      aria-label="Language switch"
    >
      <button
        className={`rounded-lg px-3 font-semibold transition ${
          compact ? 'min-h-8 text-xs' : 'min-h-9 text-sm'
        } ${
          language === 'bn'
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
        onClick={() => onChange('bn')}
        type="button"
      >
        বাংলা
      </button>
      <button
        className={`rounded-lg px-3 font-semibold transition ${
          compact ? 'min-h-8 text-xs' : 'min-h-9 text-sm'
        } ${
          language === 'en'
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
        onClick={() => onChange('en')}
        type="button"
      >
        EN
      </button>
    </div>
  )
}
