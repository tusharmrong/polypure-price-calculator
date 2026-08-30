import { CheckCircle2, FileDown, Printer, Truck, X } from 'lucide-react'
import React, { useMemo } from 'react'
import Button from './Button.jsx'
import Modal from './Modal.jsx'
import { loadCompanySettings } from '../utils/companySettings.js'
import { formatDocumentDate } from '../utils/documentNumber.js'
import { normalizeThicknessText } from '../utils/calculatorDraft.js'
import { printWithFileName } from '../utils/pdf.js'
import { useUiLanguage } from '../utils/uiLanguage.js'

export default function DeliveryChallanModal({
  isOpen,
  onClose,
  invoiceNumber,
  documentDate,
  clientName,
  phone,
  address,
  items = [],
  notes = ''
}) {
  const { language } = useUiLanguage()
  const isBn = language === 'bn'
  const companySettings = useMemo(() => loadCompanySettings(), [])
  const readableDate = useMemo(() => formatDocumentDate(documentDate), [documentDate])
  const challanNumber = useMemo(() => {
    if (!invoiceNumber) return 'DC-0001'
    return invoiceNumber.startsWith('PP-I')
      ? invoiceNumber.replace('PP-I', 'PP-DC')
      : `DC-${invoiceNumber}`
  }, [invoiceNumber])

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.quantity || 0), 0)
  }, [items])

  if (!isOpen) return null

  const handlePrintChallan = () => {
    printWithFileName(`Delivery-Challan-${challanNumber}`)
  }

  return (
    <Modal
      className="max-w-4xl"
      isOpen={isOpen}
      onClose={onClose}
      title={isBn ? 'ডেলিভারি চালান প্রিন্ট প্রিভিউ' : 'Delivery Challan Print Preview'}
    >
      <div className="space-y-4">
        {/* Printable Challan Sheet */}
        <div className="quotation-sheet print-area overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="h-2 bg-brand-600 rounded-t -mx-6 -mt-6 mb-5" />

          {/* Company Header */}
          <div className="flex flex-col gap-4 border-b border-brand-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3.5">
              <img
                alt="Poly Pure"
                className="h-14 w-14 rounded-full border border-brand-100 bg-white object-contain shadow-sm"
                src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
              />
              <div>
                <p className="text-xl font-bold text-slate-950">{companySettings.companyName}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Printing & Packaging Factory
                </p>
                <div className="mt-1 grid gap-0.5 text-[11px] leading-4 text-slate-500">
                  <span>Phone: {companySettings.phone}</span>
                  <span>Email: {companySettings.email}</span>
                  <span>{companySettings.address}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50/80 px-4 py-2.5 text-left sm:text-right">
              <div className="flex items-center gap-1.5 justify-start sm:justify-end text-brand-700 font-bold text-lg uppercase tracking-wider">
                <Truck size={18} />
                <span>Delivery Challan</span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase">{isBn ? 'ডেলিভারি চালান' : 'Packing Slip'}</p>
              <p className="mt-1 text-xs font-bold text-slate-900 font-mono">{challanNumber}</p>
              <p className="text-xs text-slate-600">Date: {readableDate}</p>
              {invoiceNumber ? (
                <p className="text-[10px] text-brand-700 font-semibold mt-0.5">
                  Ref Invoice: {invoiceNumber}
                </p>
              ) : null}
            </div>
          </div>

          {/* Client & Delivery Destination */}
          <div className="grid gap-3 py-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">
                Delivery Destination / গ্রাহকের ঠিকানা
              </p>
              <p className="mt-1.5 text-sm font-bold text-slate-950">{clientName || 'Client Name'}</p>
              <p className="text-xs text-slate-700 font-semibold">{phone || 'Phone Number'}</p>
              <p className="whitespace-pre-line text-xs leading-5 text-slate-600 mt-1">
                {address || 'Delivery Address'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">
                Dispatch Details / পরিবহন বিবরণ
              </p>
              <div className="mt-2 space-y-1 text-xs text-slate-700">
                <p>
                  <span className="font-semibold">Transport / Vehicle:</span> ___________________
                </p>
                <p>
                  <span className="font-semibold">Driver / Courier:</span> _____________________
                </p>
                <p>
                  <span className="font-semibold">Driver Contact:</span> _______________________
                </p>
              </div>
            </div>
          </div>

          {/* Items Table (Strictly NO PRICES) */}
          <div className="overflow-hidden rounded-xl border border-slate-200 mt-2">
            <div className="grid grid-cols-[40px_minmax(0,1fr)_120px_140px] bg-brand-600 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white">
              <span>No</span>
              <span>Bag Specification & Description</span>
              <span className="text-right">Quantity (Pcs)</span>
              <span className="text-right">Remarks</span>
            </div>
            {items.map((item, index) => (
              <div
                className="grid min-h-12 grid-cols-[40px_minmax(0,1fr)_120px_140px] items-center border-t border-slate-100 px-3.5 py-2 text-xs text-slate-800"
                key={item.id || index}
              >
                <span className="font-semibold text-slate-500">{index + 1}</span>
                <span className="pr-3 font-bold leading-5 text-slate-950">
                  {normalizeThicknessText(item.description) || 'Item specification'}
                </span>
                <span className="text-right font-black text-slate-900 text-sm">
                  {Number(item.quantity || 0).toLocaleString()} pcs
                </span>
                <span className="text-right text-[11px] text-slate-500 font-medium">
                  Verified Pack
                </span>
              </div>
            ))}

            {/* Total Quantity Footer */}
            <div className="grid grid-cols-[40px_minmax(0,1fr)_120px_140px] items-center border-t-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-black text-slate-900">
              <span />
              <span>TOTAL DISPATCHED BAGS:</span>
              <span className="text-right text-brand-700 font-black text-sm">
                {totalQuantity.toLocaleString()} pcs
              </span>
              <span />
            </div>
          </div>

          {/* Special Delivery Notes */}
          {notes && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
              <span className="font-bold text-slate-900">Delivery Instructions: </span>
              <span>{notes}</span>
            </div>
          )}

          {/* 3-Column Signatures */}
          <div className="mt-10 grid grid-cols-3 gap-4 pt-4 text-center">
            <div>
              <div className="mx-auto w-36 border-t-2 border-slate-400 pt-1.5 text-xs font-bold text-slate-800">
                Prepared / Packed By
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Warehouse Dispatcher</p>
            </div>

            <div>
              <div className="mx-auto w-36 border-t-2 border-slate-400 pt-1.5 text-xs font-bold text-slate-800">
                Driver / Transport
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Carrier Signature</p>
            </div>

            <div>
              <div className="mx-auto w-36 border-t-2 border-slate-400 pt-1.5 text-xs font-bold text-slate-800">
                Received in Good Condition
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Customer / Receiver Signature</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-end gap-3 no-print pt-2">
          <Button onClick={onClose} type="button" variant="secondary">
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </Button>
          <Button
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
            onClick={handlePrintChallan}
            type="button"
          >
            <Printer size={16} />
            <span>{isBn ? 'চালান প্রিন্ট করুন' : 'Print Delivery Challan'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
