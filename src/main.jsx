import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'
import { UiLanguageProvider } from './utils/uiLanguage.js'

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UiLanguageProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </UiLanguageProvider>
  </React.StrictMode>
)
