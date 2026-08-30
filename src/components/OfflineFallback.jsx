import {
  FileText,
  ReceiptText,
  SquarePen,
  WalletCards,
  WifiOff
} from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function OfflineFallback() {
  const { language } = useUiLanguage()
  const isBn = language === 'bn'

  const offlineTools = [
    {
      title: isBn ? 'ব্যাগ প্রাইস ক্যালকুলেটর' : 'Bag Price Calculator',
      desc: isBn
        ? 'পাউচ, ডি-কাট, ফোল্ডিং সাইজ এবং রিয়েল-টাইম রেট ক্যালকুলেশন।'
        : 'Accurate poly bag pricing, sheet weight & dynamic formula engine.',
      icon: WalletCards,
      path: '/calculator',
      badge: isBn ? 'অফলাইন রেডি' : 'Offline Ready',
      color: 'border-blue-200 bg-blue-50/50 hover:border-blue-400 text-blue-700'
    },
    {
      title: isBn ? 'কোটেশন তৈরি' : 'Quotation Generator',
      desc: isBn
        ? 'ক্লায়েন্ট কোটেশন তৈরি, ড্রাফট সংরক্ষণ এবং প্রিন্ট প্রিভিউ।'
        : 'Generate client quotations with advance calculations and print.',
      icon: SquarePen,
      path: '/quotation',
      badge: isBn ? 'অফলাইন রেডি' : 'Offline Ready',
      color: 'border-indigo-200 bg-indigo-50/50 hover:border-indigo-400 text-indigo-700'
    },
    {
      title: isBn ? 'ইনভয়েস ও ডেলিভারি চালান' : 'Invoice & Delivery Challan',
      desc: isBn
        ? 'ইনভয়েস তৈরি, পেমেন্ট স্ট্যাটাস এবং ডেলিভারি চালান প্রিন্ট।'
        : 'Create invoices, real-time payment badges, amount in words & challan.',
      icon: FileText,
      path: '/invoice',
      badge: isBn ? 'অফলাইন রেডি' : 'Offline Ready',
      color: 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 text-emerald-700'
    },
    {
      title: isBn ? 'মানি রিসিপ্ট' : 'Money Receipt',
      desc: isBn
        ? 'টাকা প্রাপ্তির মানি রিসিপ্ট তৈরি ও কথায় টাকা সহ প্রিন্ট।'
        : 'Instant payment receipts with automatic amount in words.',
      icon: ReceiptText,
      path: '/money-receipt',
      badge: isBn ? 'অফলাইন রেডি' : 'Offline Ready',
      color: 'border-amber-200 bg-amber-50/50 hover:border-amber-400 text-amber-700'
    }
  ]

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-amber-200 bg-white p-6 shadow-sm md:p-8">
        {/* Top Header Badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <WifiOff size={24} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-900">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
              {isBn ? 'অফলাইন মোড সক্রিয়' : 'Offline Mode Active'}
            </div>
            <h2 className="mt-1 text-xl font-black text-slate-900">
              {isBn ? 'ইন্টারনেট সংযোগ ছাড়া উপলব্ধ টুলসমূহ' : 'Available Offline Tools'}
            </h2>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          {isBn
            ? 'আপনি বর্তমানে অফলাইনে আছেন। পলি পিওর অ্যাপে ইন্টারনেট ছাড়াও নিচে থাকা ৪টি প্রধান টুল সম্পূর্ণভাবে ব্যবহার ও প্রিন্ট করতে পারবেন:'
            : 'You are currently offline. While disconnected from the cloud, the following 4 core business tools are fully functional with local saving and printing:'}
        </p>

        {/* 4 Tool Cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {offlineTools.map((tool) => {
            const Icon = tool.icon
            return (
              <Link
                className={`group flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${tool.color}`}
                key={tool.path}
                to={tool.path}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-xs">
                      <Icon size={20} />
                    </div>
                    <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 border border-slate-200">
                      {tool.badge}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-normal">{tool.desc}</p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs font-bold text-brand-600">
                  <span>{isBn ? 'ব্যবহার করুন →' : 'Open Tool →'}</span>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Footnote */}
        <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-3 text-center text-xs text-slate-500">
          {isBn
            ? '💡 ক্লাউড রিপোর্ট, প্রোডাকশন ট্র্যাকিং ও অনলাইন ডাটা ইন্টারনেট সংযুক্ত হলেই স্বয়ংক্রিয়ভাবে আনলক হয়ে যাবে।'
            : '💡 Cloud production tracking, expenses, reports & history will automatically unlock as soon as your device reconnects.'}
        </div>
      </div>
    </div>
  )
}
