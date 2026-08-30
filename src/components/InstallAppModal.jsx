import {
  ArrowDownToLine,
  CheckCircle2,
  Download,
  Laptop,
  Share2,
  Smartphone,
  Sparkles,
  WifiOff,
  X,
  Zap
} from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import { APP_NAME } from '../utils/appMeta.js'
import { usePwa } from '../utils/pwaInstall.jsx'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function InstallAppModal() {
  const { language } = useUiLanguage()
  const isBn = language === 'bn'
  const {
    canInstall,
    isInstalled,
    isIOS,
    isAndroid,
    installModalOpen,
    closeInstallModal,
    promptInstall,
    hasNativePrompt
  } = usePwa()

  if (!installModalOpen) return null

  return (
    <Modal
      className="max-w-md"
      isOpen={installModalOpen}
      onClose={closeInstallModal}
      title={isBn ? 'অ্যাপ ইন্সটল করুন' : 'Install Application'}
    >
      <div className="space-y-5 pt-1">
        {/* App Banner Card */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-brand-50/50 p-4 shadow-2xs">
          <img
            alt="Poly Pure"
            className="h-14 w-14 rounded-2xl border-2 border-white bg-white p-1 object-contain shadow-md"
            src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
          />
          <div className="min-w-0">
            <span className="rounded-md bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              PWA App
            </span>
            <h3 className="mt-1 font-black text-slate-900 text-base leading-tight truncate">
              {APP_NAME}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {isBn ? 'মোবাইল ও পিসির জন্য অফিশিয়াল অ্যাপ' : 'Official Web App for Mobile & Desktop'}
            </p>
          </div>
        </div>

        {/* Value Proposition Bullets */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <Zap size={18} className="mx-auto text-amber-600 mb-1" />
            <p className="text-[11px] font-bold text-slate-800 leading-tight">
              {isBn ? 'দ্রুত লোড' : 'Instant Launch'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{isBn ? 'হোমস্ক্রিন থেকে' : 'From Homescreen'}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <WifiOff size={18} className="mx-auto text-emerald-600 mb-1" />
            <p className="text-[11px] font-bold text-slate-800 leading-tight">
              {isBn ? 'অফলাইন সুবিধা' : 'Offline Ready'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{isBn ? 'নেট ছাড়াও কাজ' : 'Without internet'}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <Sparkles size={18} className="mx-auto text-brand-600 mb-1" />
            <p className="text-[11px] font-bold text-slate-800 leading-tight">
              {isBn ? 'ফুল স্ক্রিন' : 'No URL Bar'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{isBn ? 'অ্যাপের মতো' : 'Native experience'}</p>
          </div>
        </div>

        {/* Installation Instructions / Trigger */}
        {isInstalled ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center space-y-1">
            <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
            <p className="text-sm font-bold text-emerald-900">
              {isBn ? 'অ্যাপটি ইতিমধ্যে ইন্সটল করা আছে!' : 'App is already installed!'}
            </p>
            <p className="text-xs text-emerald-700">
              {isBn ? 'আপনি আপনার হোমস্ক্রিন বা অ্যাপ মেনু থেকে এটি সরাসরি ওপেন করতে পারেন।' : 'You can open it directly from your device home screen.'}
            </p>
          </div>
        ) : isIOS ? (
          /* iOS Safari Specific Guide */
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
              <Smartphone size={15} />
              <span>{isBn ? 'iPhone / iPad এ ইন্সটল করার নিয়ম:' : 'iOS Safari Installation Steps:'}</span>
            </div>

            <ol className="space-y-2 text-xs text-slate-700 font-medium list-decimal list-inside pl-1">
              <li className="leading-relaxed">
                Safari ব্রাউজারের নিচে থাকা <strong className="text-blue-900 font-bold">Share (শেয়ার ⎙ / ⬆)</strong> বাটনে চাপ দিন।
              </li>
              <li className="leading-relaxed">
                মেনুটি একটু নিচে স্ক্রোল করে <strong className="text-blue-900 font-bold">"Add to Home Screen"</strong> (বা <span className="font-bold">"হোম স্ক্রিনে যোগ করুন"</span>) সিলেক্ট করুন।
              </li>
              <li className="leading-relaxed">
                উপরে ডান কোণে থাকা <strong className="text-blue-900 font-bold">"Add"</strong> বাটনে ক্লিক করলেই অ্যাপটি হোমস্ক্রিনে চলে আসবে!
              </li>
            </ol>
          </div>
        ) : (
          /* Android / Desktop / Chrome Guide & Direct Prompt */
          <div className="space-y-3">
            <Button
              className="w-full py-3 justify-center text-sm font-black bg-brand-600 hover:bg-brand-700 text-white shadow-soft"
              onClick={promptInstall}
              type="button"
              variant="primary"
            >
              <ArrowDownToLine size={18} />
              <span>{isBn ? 'এখনই ইন্সটল করুন (Install App)' : 'Install App Now'}</span>
            </Button>

            <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-3.5 space-y-1.5 text-xs text-slate-700">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-brand-600" />
                <span>{isBn ? 'ডেস্কটপ ও ক্রোম ব্রাউজারে ইন্সটল করার উপায়:' : 'Desktop / Chrome 1-Click Install:'}</span>
              </p>
              <p className="leading-relaxed">
                {isBn
                  ? 'ব্রাউজারের অ্যাড্রেস বারের (URL bar) ডানপাশে থাকা '
                  : 'Click the '}
                <strong className="text-brand-700 font-bold">
                  {isBn ? 'ইন্সটল আইকন (⊕ বা Install icon)' : 'Install icon (⊕ or App Install)'}
                </strong>
                {isBn
                  ? ' অথবা ডান কোণের ৩-ডট মেনু (⋮) থেকে "Install Poly Pure" চাপুন।'
                  : ' in your browser address bar or menu (⋮) to install instantly.'}
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button onClick={closeInstallModal} type="button" variant="secondary" className="w-full sm:w-auto text-xs">
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
