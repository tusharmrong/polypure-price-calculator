export default function Button({
  children,
  className = '',
  variant = 'primary',
  disabled = false,
  ...props
}) {
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    secondary: 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50',
    muted: 'bg-slate-100 text-slate-500'
  }

  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
