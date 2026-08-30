export default function Input({ label, id, className = '', inputClassName = '', ...props }) {
  const computedInputMode = props.inputMode || (props.type === 'number' ? 'decimal' : undefined)

  return (
    <label className={`grid w-full min-w-0 gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 ${className}`} htmlFor={id}>
      {label}
      <input
        id={id}
        inputMode={computedInputMode}
        className={`w-full min-w-0 min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-base sm:text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100 ${inputClassName}`}
        {...props}
      />
    </label>
  )
}
