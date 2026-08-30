import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'
import { APP_BUILD } from './utils/appMeta.js'
import { AuthProvider } from './utils/authContext.jsx'
import { OfflineProvider } from './utils/offlineMode.jsx'
import { PwaProvider } from './utils/pwaInstall.jsx'
import { UiLanguageProvider } from './utils/uiLanguage.js'
import { ToastProvider } from './utils/toast.jsx'
import InstallAppModal from './components/InstallAppModal.jsx'

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('The app hit a runtime error:', error, errorInfo)
  }

  handleClearCacheAndReload = async () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
      await hardRefreshAppCaches()
    } catch {}
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 flex items-center justify-center">
          <div className="mx-auto w-full max-w-xl rounded-2xl border border-rose-200 bg-white p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-2 text-rose-700">
              <span className="flex h-3 w-3 rounded-full bg-rose-600 animate-ping" />
              <p className="text-xs font-bold uppercase tracking-wider">App Recovery</p>
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-black text-slate-900">We hit a startup problem</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The application encountered an unexpected runtime error.
            </p>

            {this.state.error && (
              <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/70 p-3.5 text-left font-mono text-xs text-rose-900 overflow-auto max-h-48">
                <p className="font-bold">{this.state.error.toString()}</p>
                {this.state.error.stack && (
                  <pre className="mt-2 whitespace-pre-wrap text-[11px] text-rose-700">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-700 transition shadow-sm"
                onClick={() => window.location.reload()}
                type="button"
              >
                Refresh App
              </button>
              <button
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                onClick={this.handleClearCacheAndReload}
                type="button"
              >
                Clear Cache & Reload
              </button>
            </div>
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
        <ToastProvider>
          <OfflineProvider>
            <AuthProvider>
              <UiLanguageProvider>
                <PwaProvider>
                  <HashRouter>
                    <App />
                    <InstallAppModal />
                  </HashRouter>
                </PwaProvider>
              </UiLanguageProvider>
            </AuthProvider>
          </OfflineProvider>
        </ToastProvider>
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
