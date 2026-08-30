import React, { createContext, useContext, useEffect, useState } from 'react'
import { useToast } from './toast.jsx'

export const OFFLINE_TOOL_PATHS = ['/calculator', '/quotation', '/invoice', '/money-receipt']

export function isOfflineAvailableRoute(pathname) {
  if (!pathname) return false
  const cleanPath = pathname.toLowerCase().replace(/\/+$/, '') || '/'
  return OFFLINE_TOOL_PATHS.includes(cleanPath)
}

const OfflineContext = createContext({
  isOnline: true,
  isOffline: false,
  offlineTools: OFFLINE_TOOL_PATHS
})

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  })
  const { showToast } = useToast()

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      showToast('🟢 Internet connected! Cloud sync active.', 'success')
    }

    const handleOffline = () => {
      setIsOnline(false)
      showToast('⚡ Offline Mode: Calculator, Quotation, Invoice & Money Receipt are active.', 'info')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [showToast])

  const value = {
    isOnline,
    isOffline: !isOnline,
    offlineTools: OFFLINE_TOOL_PATHS
  }

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
}

export function useOffline() {
  return useContext(OfflineContext)
}
