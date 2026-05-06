export default function Select({ label, id, children, className = '', ...props }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700" htmlFor={id}>
      {label}
      <select
        id={id}
        className={`min-h-12 rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}
