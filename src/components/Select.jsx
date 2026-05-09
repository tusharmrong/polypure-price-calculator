export default function Select({ label, id, children, className = '', selectClassName = '', ...props }) {
  return (
    <label className={`grid min-w-0 gap-2 text-sm font-medium text-slate-700 ${className}`} htmlFor={id}>
      {label}
      <select
        id={id}
        className={`w-full min-w-0 min-h-12 rounded-lg border border-slate-200 bg-white px-3 text-base text-slate-900 outline-none transition focus:border-brand-600 focus:ring-4 focus:ring-brand-100 ${selectClassName}`}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}
