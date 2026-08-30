import React from 'react'
import { Printer, X } from 'lucide-react'

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  title = 'Document Preview',
  onPrintPdf,
  children
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-sm lg:hidden animate-in fade-in">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-white shadow-md">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{title}</p>
          <p className="text-[11px] text-slate-400">Mobile Sheet Preview</p>
        </div>

        <div className="flex items-center gap-2">
          {onPrintPdf && (
            <button
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700 active:scale-95 transition"
              onClick={onPrintPdf}
              type="button"
            >
              <Printer size={14} />
              <span>Print / PDF</span>
            </button>
          )}

          <button
            aria-label="Close Preview"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Scrollable Document Container */}
      <div className="flex-1 overflow-y-auto overflow-x-auto p-3 sm:p-5">
        <div className="mx-auto min-w-[320px] max-w-[800px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  )
}
