import { CheckCircle2, FileDown, Printer, X } from 'lucide-react'
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
    const sheetEl = document.getElementById('challan-printable-sheet')
    printWithFileName({
      type: 'Delivery-Challan',
      clientName: clientName || 'Client',
      documentNumber: challanNumber,
      targetElement: sheetEl
    })
  }

  return (
    <Modal
      maxWidth="max-w-3xl"
      isOpen={isOpen}
      onClose={onClose}
      title={isBn ? 'ডেলিভারি চালান প্রিন্ট প্রিভিউ' : 'Delivery Challan Print Preview'}
    >
      <div className="space-y-3">
        {/* Printable Challan Sheet */}
        <div id="challan-printable-sheet" className="quotation-sheet print-area challan-print-area overflow-hidden rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="h-1.5 bg-brand-600 rounded-t -mx-4 sm:-mx-5 -mt-4 sm:-mt-5 mb-3" />

          {/* Company Header */}
          <div className="flex flex-col gap-2.5 border-b border-brand-100 pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <img
                alt="Poly Pure"
                className="h-11 w-11 rounded-full border border-brand-100 bg-white object-contain shadow-xs"
                src={`${import.meta.env.BASE_URL}poly-pure-logo.png`}
              />
              <div>
                <p className="text-lg font-black text-slate-950 leading-tight">{companySettings.companyName}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                  Printing & Packaging Factory
                </p>
                <div className="mt-0.5 grid gap-0.5 text-[10px] leading-3.5 text-slate-500">
                  <span>Phone: {companySettings.phone} • Email: {companySettings.email}</span>
                  <span>{companySettings.address}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50/80 px-3 py-1.5 text-left sm:text-right shrink-0">
              <p className="text-base font-black uppercase tracking-wider text-brand-800">
                Delivery Challan
              </p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {isBn ? 'ডেলিভারি চালান' : 'Packing Slip'}
              </p>
              <p className="mt-0.5 text-xs font-mono font-black text-slate-900">{challanNumber}</p>
              <p className="text-[10px] text-slate-600">Date: {readableDate}</p>
              {invoiceNumber ? (
                <p className="text-[10px] text-brand-700 font-bold">
                  Ref: {invoiceNumber}
                </p>
              ) : null}
            </div>
          </div>

          {/* Client & Delivery Destination */}
          <div className="grid gap-2.5 py-2.5 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">
                Delivery Destination / গ্রাহকের ঠিকানা
              </p>
              <p className="mt-1 text-sm font-bold text-slate-950">{clientName || 'Client Name'}</p>
              <p className="text-[11px] font-semibold text-slate-700">{phone || 'Phone Number'}</p>
              <p className="whitespace-pre-line text-[11px] leading-4 text-slate-600 mt-0.5">
                {address || 'Delivery Address on file'}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">
                Dispatch Details / পরিবহন বিবরণ
              </p>
              <div className="mt-1.5 space-y-1 text-[11px] text-slate-700">
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
          <div className="overflow-hidden rounded-lg border border-slate-200 mt-1">
            <div className="grid grid-cols-[40px_minmax(0,1fr)_120px_120px] bg-brand-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white">
              <span>No</span>
              <span>Bag Specification & Description</span>
              <span className="text-right">Quantity (Pcs)</span>
              <span className="text-right">Remarks</span>
            </div>
            {items.map((item, index) => (
              <div
                className="grid min-h-10 grid-cols-[40px_minmax(0,1fr)_120px_120px] items-center border-t border-slate-100 px-3 py-1.5 text-xs text-slate-900"
                key={item.id || index}
              >
                <span className="font-bold text-slate-500">{index + 1}</span>
                <span className="pr-3 font-semibold leading-tight text-slate-950">
                  {normalizeThicknessText(item.description) || 'Bag Item Specification'}
                </span>
                <span className="text-right font-black text-slate-950 text-sm">
                  {Number(item.quantity || 0).toLocaleString()} pcs
                </span>
                <span className="text-right text-[11px] text-slate-500 font-medium">
                  Verified Pack
                </span>
              </div>
            ))}

            {/* Total Quantity Footer */}
            <div className="grid grid-cols-[40px_minmax(0,1fr)_120px_120px] items-center border-t-2 border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-900">
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
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700">
              <span className="font-bold text-slate-950">Delivery Instructions: </span>
              <span>{notes}</span>
            </div>
          )}

          {/* 3-Column Signatures */}
          <div className="mt-6 grid grid-cols-3 gap-4 pt-3 text-center">
            <div>
              <div className="mx-auto w-32 border-t border-slate-500 pt-1 text-[11px] font-bold text-slate-800">
                Prepared / Packed By
              </div>
              <p className="text-[9px] text-slate-400">Warehouse Dispatcher</p>
            </div>

            <div>
              <div className="mx-auto w-32 border-t border-slate-500 pt-1 text-[11px] font-bold text-slate-800">
                Driver / Transport
              </div>
              <p className="text-[9px] text-slate-400">Carrier Signature</p>
            </div>

            <div>
              <div className="mx-auto w-32 border-t border-slate-500 pt-1 text-[11px] font-bold text-slate-800">
                Received in Good Condition
              </div>
              <p className="text-[9px] text-slate-400">Customer / Receiver</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2.5 no-print pt-1">
          <Button onClick={onClose} type="button" variant="secondary">
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </Button>
          <Button
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
            onClick={handlePrintChallan}
            type="button"
          >
            <Printer size={15} />
            <span>{isBn ? 'চালান প্রিন্ট করুন' : 'Print Delivery Challan'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
