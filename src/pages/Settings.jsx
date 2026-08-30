import { CheckCircle2, Download, Smartphone, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import TextArea from '../components/TextArea.jsx'
import { APP_BUILD, APP_RELEASE_DATE, APP_RELEASE_NOTES, APP_VERSION_LABEL } from '../utils/appMeta.js'
import { loadCompanySettings, saveCompanySettings } from '../utils/companySettings.js'
import { usePwa } from '../utils/pwaInstall.jsx'
import { isValidSignatureDataUrl, loadSignatureImage } from '../utils/signature.js'
import { loadValue, saveValue } from '../utils/storage.js'
import { useToast } from '../utils/toast.jsx'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function Settings() {
  const { language, t } = useUiLanguage()
  const { showToast } = useToast()
  const { isInstalled, isIOS, promptInstall } = usePwa()
  const [signatureImage, setSignatureImage] = useState(() => loadSignatureImage())
  const [signatureStatus, setSignatureStatus] = useState('')
  const [backupStatus, setBackupStatus] = useState('')
  const [lastAutoBackupAt, setLastAutoBackupAt] = useState(() => loadValue('autoBackupLastAt', ''))
  const [companySettings, setCompanySettings] = useState(() => loadCompanySettings())
  const [settingsStatus, setSettingsStatus] = useState('')

  const handleSignatureUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const fileName = (file.name || '').toLowerCase()
    const isPngByType = file.type === 'image/png'
    const isPngByName = fileName.endsWith('.png')
    if (!isPngByType && !isPngByName) {
      setSignatureStatus('Please upload only PNG signature file.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const pngDataUrl = typeof reader.result === 'string' ? reader.result : ''
      if (!isValidSignatureDataUrl(pngDataUrl)) {
        setSignatureStatus('Could not read the file. Please try again.')
        event.target.value = ''
        return
      }
      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement('canvas')
        const maxWidth = 900
        const scale = image.width > maxWidth ? maxWidth / image.width : 1
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          setSignatureStatus('Could not process this image. Please try another PNG.')
          event.target.value = ''
          return
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        const normalizedPngDataUrl = canvas.toDataURL('image/png')

        const didSave = saveValue('signaturePngDataUrl', normalizedPngDataUrl)
        if (!didSave) {
          setSignatureStatus('Could not save signature. Please use a smaller PNG file.')
          event.target.value = ''
          return
        }
        setSignatureImage(normalizedPngDataUrl)
        setSignatureStatus('Signature saved for this device.')
        event.target.value = ''
      }
      image.onerror = () => {
        setSignatureStatus('PNG appears invalid. Please upload another file.')
        event.target.value = ''
      }
      image.src = pngDataUrl
    }
    reader.onerror = () => {
      setSignatureStatus('Upload failed. Please try another PNG file.')
      event.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  const removeSignature = () => {
    const didSave = saveValue('signaturePngDataUrl', '')
    if (!didSave) {
      setSignatureStatus('Could not remove signature right now. Please try again.')
      return
    }
    setSignatureImage('')
    setSignatureStatus('Saved signature removed from this device.')
  }

  const updateCompanySetting = (field, value) => {
    setCompanySettings((current) => ({ ...current, [field]: value }))
  }

  const handleSaveCompanySettings = () => {
    saveCompanySettings(companySettings)
    setSettingsStatus('Company settings saved on this device.')
    showToast('Company settings saved.', 'success')
  }

  const buildBackupData = () => {
    return {
      version: 1,
      appVersion: APP_VERSION_LABEL,
      appBuild: APP_BUILD,
      exportedAt: new Date().toISOString(),
      data: {
        companySettings,
        documents: loadValue('documents', []),
        signaturePngDataUrl: loadValue('signaturePngDataUrl', '')
      }
    }
  }

  const downloadBackupFile = (backupData) => {
    const exportedDate = String(backupData.exportedAt || new Date().toISOString()).slice(0, 10)
    const exportedTime = String(backupData.exportedAt || new Date().toISOString())
      .slice(11, 19)
      .replaceAll(':', '-')

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `polypure-backup-${exportedDate}-${exportedTime}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportBackup = () => {
    const backupData = buildBackupData()
    downloadBackupFile(backupData)
    setBackupStatus('Backup exported successfully.')
    showToast('Backup exported successfully.', 'success')
  }

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    const lastDate = loadValue('autoBackupLastDate', '')

    if (lastDate === today) return

    const backupData = buildBackupData()
    try {
      downloadBackupFile(backupData)
      saveValue('autoBackupLastDate', today)
      saveValue('autoBackupLastAt', backupData.exportedAt)
      setLastAutoBackupAt(backupData.exportedAt)
      setBackupStatus('Daily auto-backup completed for today.')
      showToast('Daily auto-backup completed.', 'success')
    } catch {
      setBackupStatus('Daily auto-backup could not download automatically. Please use Export Backup JSON.')
      showToast('Daily auto-backup failed. Please export manually.', 'error')
    }
  }, [])

  const importBackup = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'))
        const data = parsed?.data || {}
        const nextCompanySettings = {
          ...loadCompanySettings(),
          ...(data.companySettings || {})
        }
        saveCompanySettings(nextCompanySettings)
        const didSaveDocuments = saveValue('documents', Array.isArray(data.documents) ? data.documents : [])
        const importedSignature = isValidSignatureDataUrl(data.signaturePngDataUrl) ? data.signaturePngDataUrl : ''
        const didSaveSignature = saveValue('signaturePngDataUrl', importedSignature)
        if (!didSaveDocuments || !didSaveSignature) {
          setBackupStatus('Import failed due to storage limit. Clear some old data and try again.')
          event.target.value = ''
          return
        }
        setCompanySettings(nextCompanySettings)
        setSignatureImage(importedSignature)
        setBackupStatus('Backup imported successfully.')
        showToast('Backup imported successfully.', 'success')
      } catch {
        setBackupStatus('Invalid backup file. Please select a valid Polypure backup JSON.')
        showToast('Invalid backup file.', 'error')
      } finally {
        event.target.value = ''
      }
    }
    reader.onerror = () => {
      setBackupStatus('Could not read backup file. Please try again.')
      showToast('Could not read backup file.', 'error')
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  return (
    <div className="grid gap-5">
      {/* App Version Info */}
      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-950">{language === 'bn' ? 'অ্যাপ ভার্সন' : 'App Version'}</h2>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {language === 'bn' ? 'বর্তমান ভার্সন' : 'Current Version'}
              </p>
              <p className="mt-1 text-lg font-bold text-slate-950">{APP_VERSION_LABEL}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {language === 'bn' ? 'বিল্ড' : 'Build'}
              </p>
              <p className="mt-1 text-lg font-bold text-slate-950">{APP_BUILD}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {language === 'bn' ? 'রিলিজ তারিখ' : 'Release Date'}
              </p>
              <p className="mt-1 text-lg font-bold text-slate-950">{APP_RELEASE_DATE}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-bold text-slate-950">
              {language === 'bn' ? 'এই ভার্সনে যা আছে' : "What's in this version"}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {APP_RELEASE_NOTES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* PWA App Installation Card */}
      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-950">{t('install_app')}</h2>
        <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
          <p className="text-sm text-slate-700">
            {t('install_app_text')}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
              onClick={promptInstall}
              type="button"
            >
              <Download size={18} />
              {isInstalled ? t('installed') : t('install_now')}
            </Button>
          </div>
          {isIOS && (
            <p className="mt-3 text-xs text-slate-600">
              iPhone / iPad: Safari ব্রাউজারে Share (শেয়ার ⎙ / ⬆) বাটনে ট্যাপ করে "Add to Home Screen" বেছে নিন।
            </p>
          )}
        </div>
      </Card>

      {/* Company Settings Card */}
      <Card>
        <h2 className="mb-5 text-lg font-bold text-slate-950">{t('company_settings')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="company-name" label="Company Name" onChange={(event) => updateCompanySetting('companyName', event.target.value)} value={companySettings.companyName} />
          <Input id="company-phone" label="Phone" onChange={(event) => updateCompanySetting('phone', event.target.value)} value={companySettings.phone} />
          <Input id="company-email" label="Email" onChange={(event) => updateCompanySetting('email', event.target.value)} value={companySettings.email} />
          <Input id="company-website" label="Website" onChange={(event) => updateCompanySetting('website', event.target.value)} value={companySettings.website} />
          <TextArea
            className="sm:col-span-2"
            id="company-address"
            label="Address"
            onChange={(event) => updateCompanySetting('address', event.target.value)}
            value={companySettings.address}
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
            id="company-payment"
            label="Payment Method"
            onChange={(event) => updateCompanySetting('paymentMethod', event.target.value)}
            value={companySettings.paymentMethod}
          />
          <TextArea
            className="sm:col-span-2"
            id="company-terms"
            label="Terms and Conditions"
            onChange={(event) => updateCompanySetting('terms', event.target.value)}
            value={companySettings.terms}
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
                  disabled={!isValidSignatureDataUrl(signatureImage)}
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
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={handleSaveCompanySettings} type="button">
            {t('save_company_settings')}
          </Button>
        </div>
        {settingsStatus ? <p className="mt-3 text-xs font-semibold text-brand-700">{settingsStatus}</p> : null}
      </Card>

      {/* Backup & Restore Card */}
      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-950">{t('backup_restore')}</h2>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-700">
            Backup includes company settings, saved documents, and this device signature.
          </p>
          <p className="mt-2 text-xs font-medium text-slate-500">
            Last daily auto-backup: {lastAutoBackupAt ? new Date(lastAutoBackupAt).toLocaleString() : 'Not yet'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={exportBackup} type="button" variant="secondary">
              {t('export_backup')}
            </Button>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
              {t('import_backup')}
              <input accept="application/json,.json" className="hidden" onChange={importBackup} type="file" />
            </label>
          </div>
          {backupStatus ? <p className="mt-3 text-xs font-semibold text-brand-700">{backupStatus}</p> : null}
        </div>
      </Card>
    </div>
  )
}
