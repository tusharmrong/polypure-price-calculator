import { Download } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import TextArea from '../components/TextArea.jsx'
import { defaultSettings } from '../data/defaultSettings.js'
import { loadValue, saveValue } from '../utils/storage.js'

export default function Settings() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [installStatus, setInstallStatus] = useState('')
  const [signatureImage, setSignatureImage] = useState(() => loadValue('signaturePngDataUrl', ''))
  const [signatureStatus, setSignatureStatus] = useState('')

  useEffect(() => {
    const installed =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    setIsInstalled(installed)

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    const handleInstalled = () => {
      setInstallStatus('App installed successfully.')
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const isiOS = useMemo(() => /iPad|iPhone|iPod/.test(window.navigator.userAgent), [])

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      setInstallStatus('Install option is not ready in this browser yet. Try Safari share menu on iPhone.')
      return
    }

    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice

    if (choice?.outcome === 'accepted') {
      setInstallStatus('Install request accepted.')
    } else {
      setInstallStatus('Install cancelled.')
    }

    setDeferredPrompt(null)
  }

  const handleSignatureUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (file.type !== 'image/png') {
      setSignatureStatus('Please upload only PNG signature file.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const pngDataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!pngDataUrl) {
        setSignatureStatus('Could not read the file. Please try again.')
        return
      }
      saveValue('signaturePngDataUrl', pngDataUrl)
      setSignatureImage(pngDataUrl)
      setSignatureStatus('Signature saved for this device.')
      event.target.value = ''
    }
    reader.onerror = () => {
      setSignatureStatus('Upload failed. Please try another PNG file.')
      event.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  const removeSignature = () => {
    saveValue('signaturePngDataUrl', '')
    setSignatureImage('')
    setSignatureStatus('Saved signature removed from this device.')
  }

  return (
    <div className="grid gap-5">
      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-950">Install App</h2>
        <div className="rounded-lg border border-brand-100 bg-brand-50 p-4">
          <p className="text-sm text-slate-700">
            Install this app on your phone or PC for quick access and full-screen experience.
          </p>
          <div className="mt-3">
            <Button
              disabled={isInstalled}
              onClick={handleInstallApp}
              type="button"
            >
              <Download size={18} />
              {isInstalled ? 'Already Installed' : 'Install Polypure App'}
            </Button>
          </div>
          {isiOS ? (
            <p className="mt-3 text-xs text-slate-600">
              iPhone: Open in Safari, tap Share, then choose Add to Home Screen.
            </p>
          ) : null}
          {installStatus ? <p className="mt-3 text-xs font-semibold text-brand-700">{installStatus}</p> : null}
        </div>
      </Card>

      <Card>
        <h2 className="mb-5 text-lg font-bold text-slate-950">Company Settings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input defaultValue={defaultSettings.companyName} id="company-name" label="Company Name" />
          <Input defaultValue={defaultSettings.phone} id="company-phone" label="Phone" />
          <Input defaultValue={defaultSettings.email} id="company-email" label="Email" />
          <Input defaultValue={defaultSettings.website} id="company-website" label="Website" />
          <TextArea
            className="sm:col-span-2"
            defaultValue={defaultSettings.address}
            id="company-address"
            label="Address"
          />
          <div className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Logo Upload
            <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed border-brand-200 bg-brand-50 px-4 text-center text-sm text-slate-500">
              <img
                alt="Poly Pure"
                className="h-28 w-28 rounded-full bg-white object-contain shadow-sm"
                src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
              />
            </div>
          </div>
          <TextArea
            className="sm:col-span-2"
            defaultValue={defaultSettings.paymentMethod}
            id="company-payment"
            label="Payment Method"
          />
          <TextArea
            className="sm:col-span-2"
            defaultValue={defaultSettings.terms}
            id="company-terms"
            label="Terms and Conditions"
          />
          <div className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            Signature / Stamp
            <div className="grid gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
              <input
                accept="image/png"
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
                onChange={handleSignatureUpload}
                type="file"
              />
              <div className="flex min-h-24 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-center text-sm text-slate-500">
                {signatureImage ? (
                  <img alt="Saved signature" className="max-h-20 w-auto object-contain" src={signatureImage} />
                ) : (
                  'No signature uploaded yet.'
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!signatureImage}
                  onClick={removeSignature}
                  type="button"
                  variant="secondary"
                >
                  Remove Signature
                </Button>
              </div>
              {signatureStatus ? <p className="text-xs font-semibold text-brand-700">{signatureStatus}</p> : null}
            </div>
          </div>
        </div>
        <div className="mt-5">
          <Button disabled variant="muted">
            Save Settings Later
          </Button>
        </div>
      </Card>
    </div>
  )
}
