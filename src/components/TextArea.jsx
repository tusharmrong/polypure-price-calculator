export default function TextArea({ label, id, className = '', textAreaClassName = '', rows = 2, ...props }) {
  return (
    <label className={`grid w-full min-w-0 gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 ${className}`} htmlFor={id}>
      {label}
      <textarea
        id={id}
        rows={rows}
        className={`w-full min-w-0 min-h-16 max-h-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${textAreaClassName}`}
        {...props}
      />
    </label>
  )
}
