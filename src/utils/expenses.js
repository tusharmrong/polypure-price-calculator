import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc
} from 'firebase/firestore'
import { firebaseAuth, firebaseDb, firebaseInitError } from './firebase.js'
import { loadValue, saveValue } from './storage.js'

const EXPENSES_STORAGE_KEY = 'pp_business_expenses'
const expensesCollection = firebaseDb ? collection(firebaseDb, 'expenses') : null

export const EXPENSE_CATEGORIES = [
  { id: 'transport', label: 'Transport', shortLabel: 'Transport', color: 'cyan', labelBn: 'পরিবহন' },
  { id: 'labor_wages', label: 'Labor & Wages', shortLabel: 'Labor & Wages', color: 'emerald', labelBn: 'লেবার ও মজুরি' },
  { id: 'rent_power', label: 'Rent & Power', shortLabel: 'Rent & Power', color: 'amber', labelBn: 'ভাড়া ও বিদ্যুৎ' },
  { id: 'maintenance', label: 'Maintenance', shortLabel: 'Maintenance', color: 'orange', labelBn: 'মেরামত ও মেইনটেন্যান্স' },
  { id: 'office_admin', label: 'Office/Admin', shortLabel: 'Office/Admin', color: 'slate', labelBn: 'অফিস ও প্রশাসন' },
  { id: 'ad_cost', label: 'Ad Cost', shortLabel: 'Ad Cost', color: 'blue', labelBn: 'বিজ্ঞাপন খরচ' },
  { id: 'other', label: 'Others', shortLabel: 'Others', color: 'rose', labelBn: 'অন্যান্য' }
]

export const EXPENSE_PRESETS = [
  { title: 'Paper Reel Purchase', category: 'raw_materials' },
  { title: 'Duplex Board Sheets', category: 'raw_materials' },
  { title: 'Printing Ink & Solvent', category: 'ink_chemicals' },
  { title: 'Die Cutting Block', category: 'dies_plates' },
  { title: 'Printing Plate / Cylinder', category: 'dies_plates' },
  { title: 'Daily Labor & Wages', category: 'labor_wages' },
  { title: 'Staff Tea & Snacks', category: 'labor_wages' },
  { title: 'Factory Electricity Bill', category: 'utilities_rent' },
  { title: 'Generator Diesel Fuel', category: 'utilities_rent' },
  { title: 'Factory / Office Rent', category: 'utilities_rent' },
  { title: 'Delivery Pickup Van', category: 'transport_delivery' },
  { title: 'Machine Spare Parts', category: 'maintenance' }
]

function canUseCloudExpenses() {
  return Boolean(firebaseDb && expensesCollection && firebaseAuth?.currentUser && !firebaseInitError)
}

export function getLocalExpenses() {
  return loadValue(EXPENSES_STORAGE_KEY, [])
}

export function saveLocalExpenses(expenses) {
  saveValue(EXPENSES_STORAGE_KEY, expenses)
}

export async function loadExpenses() {
  const localExpenses = getLocalExpenses()

  // Background Cloud Sync (Non-blocking)
  if (canUseCloudExpenses()) {
    const expensesQuery = query(expensesCollection, orderBy('date', 'desc'))
    getDocs(expensesQuery)
      .then((snapshot) => {
        const cloudExpenses = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }))
        const mergedMap = new Map()
        localExpenses.forEach((exp) => mergedMap.set(exp.id, exp))
        cloudExpenses.forEach((exp) => mergedMap.set(exp.id, exp))

        const mergedList = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
        )
        saveLocalExpenses(mergedList)
      })
      .catch((error) => {
        console.warn('Background cloud expenses sync failed:', error)
      })
  }

  // If local records exist, return INSTANTLY (0ms startup!)
  if (localExpenses && localExpenses.length > 0) {
    return localExpenses
  }

  // If fresh device, wait for initial download
  if (canUseCloudExpenses()) {
    try {
      const expensesQuery = query(expensesCollection, orderBy('date', 'desc'))
      const snapshot = await getDocs(expensesQuery)
      const cloudExpenses = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
      saveLocalExpenses(cloudExpenses)
      return cloudExpenses
    } catch (error) {
      console.warn('Unable to fetch cloud expenses, using local records.', error)
    }
  }

  return localExpenses
}

export async function saveExpense(expenseData, actorUser) {
  const expenseId = expenseData.id || `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const nowIso = new Date().toISOString()

  const payload = {
    id: expenseId,
    title: String(expenseData.title || '').trim(),
    category: expenseData.category || 'other',
    amount: Number(expenseData.amount || 0),
    date: expenseData.date || nowIso.slice(0, 10),
    paymentMethod: expenseData.paymentMethod || 'Cash',
    vendor: String(expenseData.vendor || '').trim(),
    reference: String(expenseData.reference || '').trim(),
    notes: String(expenseData.notes || '').trim(),
    updatedAt: nowIso,
    createdAt: expenseData.createdAt || nowIso,
    creatorName: expenseData.creatorName || actorUser?.name || 'Staff',
    creatorUserId: expenseData.creatorUserId || actorUser?.id || ''
  }

  // Update local storage
  const currentList = getLocalExpenses()
  const exists = currentList.some((item) => item.id === expenseId)
  const nextList = exists
    ? currentList.map((item) => (item.id === expenseId ? payload : item))
    : [payload, ...currentList]

  saveLocalExpenses(nextList)

  // Sync to Cloud Firestore if connected
  if (canUseCloudExpenses()) {
    try {
      await setDoc(doc(firebaseDb, 'expenses', expenseId), payload, { merge: true })
    } catch (error) {
      console.warn('Cloud sync for expense failed, stored locally.', error)
    }
  }

  return payload
}

export async function deleteExpense(expenseId) {
  const currentList = getLocalExpenses()
  const nextList = currentList.filter((item) => item.id !== expenseId)
  saveLocalExpenses(nextList)

  if (canUseCloudExpenses()) {
    try {
      await deleteDoc(doc(firebaseDb, 'expenses', expenseId))
    } catch (error) {
      console.warn('Could not delete expense from cloud.', error)
    }
  }

  return nextList
}
