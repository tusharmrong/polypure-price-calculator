import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'
import { UiLanguageProvider } from './utils/uiLanguage.js'
import { ToastProvider } from './utils/toast.jsx'

const APP_CACHE_VERSION = '2026-05-11-3'
const APP_CACHE_VERSION_KEY = 'polypure:appCacheVersion'

async function hardRefreshAppCaches() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  } catch {}

  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
  } catch {}
}

async function ensureLatestCacheVersion() {
  const currentVersion = window.localStorage.getItem(APP_CACHE_VERSION_KEY)
  if (currentVersion === APP_CACHE_VERSION) return
  window.localStorage.setItem(APP_CACHE_VERSION_KEY, APP_CACHE_VERSION)
  await hardRefreshAppCaches()
  window.location.reload()
}

ensureLatestCacheVersion()

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true)
  },
  onOfflineReady() {},
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    const runUpdateCheck = () => {
      registration.update()
    }

    runUpdateCheck()
    window.setInterval(runUpdateCheck, 15 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        runUpdateCheck()
      }
    })
  },
  onRegisterError() {}
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UiLanguageProvider>
      <ToastProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </ToastProvider>
    </UiLanguageProvider>
  </React.StrictMode>
)
