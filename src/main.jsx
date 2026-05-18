import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'
import { APP_BUILD } from './utils/appMeta.js'
import { AuthProvider } from './utils/authContext.jsx'
import { UiLanguageProvider } from './utils/uiLanguage.js'
import { ToastProvider } from './utils/toast.jsx'

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('The app hit a runtime error.', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-xl rounded-lg border border-rose-200 bg-white p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">App Recovery</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">We hit a startup problem</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              The app stayed visible instead of going blank. Please refresh once. If it still happens,
              the latest cloud-login change needs one more fix.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const APP_CACHE_VERSION = APP_BUILD
const APP_CACHE_VERSION_KEY = 'polypure:appCacheVersion'
const IS_LOCALHOST = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)

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

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <AuthProvider>
          <UiLanguageProvider>
            <ToastProvider>
              <HashRouter>
                <App />
              </HashRouter>
            </ToastProvider>
          </UiLanguageProvider>
        </AuthProvider>
      </AppErrorBoundary>
    </React.StrictMode>
  )
}

async function startApp() {
  if (IS_LOCALHOST) {
    renderApp()
    return
  }

  await ensureLatestCacheVersion()

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

  renderApp()
}

startApp().catch((error) => {
  console.error('Unable to start the app cleanly. Falling back to direct render.', error)
  renderApp()
})
