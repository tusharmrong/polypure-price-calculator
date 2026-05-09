import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'
import { UiLanguageProvider } from './utils/uiLanguage.js'
import { ToastProvider } from './utils/toast.jsx'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true)
  },
  onOfflineReady() {}
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
