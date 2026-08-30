import React, { createContext, useContext, useEffect, useState } from 'react'

const PwaContext = createContext({
  canInstall: false,
  isInstalled: false,
  isIOS: false,
  isAndroid: false,
  isStandalone: false,
  installModalOpen: false,
  openInstallModal: () => {},
  closeInstallModal: () => {},
  promptInstall: async () => {}
})

export function PwaProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(() => {
    return typeof window !== 'undefined' ? window.__deferredPwaPrompt || null : null
  })
  const [isInstalled, setIsInstalled] = useState(false)
  const [installModalOpen, setInstallModalOpen] = useState(false)

  // Check if running in standalone PWA mode
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator?.standalone === true ||
    document.referrer.includes('android-app://')
  )

  // Detect Device Types
  const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : ''
  const isIOS = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream
  const isAndroid = /android/.test(userAgent)

  useEffect(() => {
    if (isStandalone) {
      setIsInstalled(true)
    }

    if (typeof window !== 'undefined') {
      window.__onDeferredPwaPrompt = (e) => {
        setDeferredPrompt(e)
      }
      if (window.__deferredPwaPrompt) {
        setDeferredPrompt(window.__deferredPwaPrompt)
      }
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent browser's automatic mini-infobar
      e.preventDefault()
      // Stash event for manual prompt trigger
      window.__deferredPwaPrompt = e
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      window.__deferredPwaPrompt = null
      setDeferredPrompt(null)
      setIsInstalled(true)
      setInstallModalOpen(false)
      console.log('Poly Pure Business Suite was installed as a PWA.')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Listen for display-mode changes
    const matchMediaStandAlone = window.matchMedia('(display-mode: standalone)')
    const handleDisplayModeChange = (e) => {
      if (e.matches) {
        setIsInstalled(true)
      }
    }
    matchMediaStandAlone.addEventListener?.('change', handleDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      matchMediaStandAlone.removeEventListener?.('change', handleDisplayModeChange)
    }
  }, [isStandalone])

  const openInstallModal = () => setInstallModalOpen(true)
  const closeInstallModal = () => setInstallModalOpen(false)

  const promptInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          setIsInstalled(true)
          setDeferredPrompt(null)
          setInstallModalOpen(false)
        }
      } catch (err) {
        console.error('Error invoking PWA install prompt:', err)
        setInstallModalOpen(true)
      }
    } else {
      // If no native prompt available (e.g. iOS or manual install), show the modal guide
      setInstallModalOpen(true)
    }
  }

  const canInstall = !isInstalled && (Boolean(deferredPrompt) || isIOS || isAndroid)

  return (
    <PwaContext.Provider
      value={{
        canInstall,
        isInstalled,
        isIOS,
        isAndroid,
        isStandalone,
        installModalOpen,
        openInstallModal,
        closeInstallModal,
        promptInstall,
        hasNativePrompt: Boolean(deferredPrompt)
      }}
    >
      {children}
    </PwaContext.Provider>
  )
}

export function usePwa() {
  return useContext(PwaContext)
}
