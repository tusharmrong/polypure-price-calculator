import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'info', duration = 2800) => {
    const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    setToasts((current) => [...current, { id, message, type }])
    window.setTimeout(() => dismissToast(id), duration)
  }, [dismissToast])

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" role="status">
        {toasts.map((toast) => (
          <div className={`toast-item toast-${toast.type}`} key={toast.id}>
            <p>{toast.message}</p>
            <button onClick={() => dismissToast(toast.id)} type="button">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  return context || { showToast: () => {}, dismissToast: () => {} }
}
