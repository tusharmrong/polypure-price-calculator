const BN_ONES = ['', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ', 'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ']
const BN_TENS = ['', '', 'বিশ', 'ত্রিশ', 'চল্লিশ', 'পঞ্চাশ', 'ষাট', 'সত্তর', 'আশি', 'নব্বই']

// Numbers 20-99 in Bangla words
const BN_NUMS_20_99 = {
  20: 'বিশ', 21: 'একুশ', 22: 'বাইশ', 23: 'তেইশ', 24: 'চব্বিশ', 25: 'পঁচিশ', 26: 'ছাব্বিশ', 27: 'সাতাশ', 28: 'আঠাশ', 29: 'উনত্রিশ',
  30: 'ত্রিশ', 31: 'একত্রিশ', 32: 'বত্রিশ', 33: 'তেত্রিশ', 34: 'চৌত্রিশ', 35: 'পঁয়ত্রিশ', 36: 'ছত্রিশ', 37: 'সাঁইত্রিশ', 38: 'আটত্রিশ', 39: 'উনচল্লিশ',
  40: 'চল্লিশ', 41: 'একচল্লিশ', 42: 'বিয়াল্লিশ', 43: 'তেতাল্লিশ', 44: 'চুয়াল্লিশ', 45: 'পঁয়তাল্লিশ', 46: 'ছেচল্লিশ', 47: 'সাতচল্লিশ', 48: 'আটচল্লিশ', 49: 'উনপঞ্চাশ',
  50: 'পঞ্চাশ', 51: 'একান্ন', 52: 'বায়ান্ন', 53: 'তিপ্পান্ন', 54: 'চুয়ান্ন', 55: 'পঞ্চান্ন', 56: 'ছাপ্পান্ন', 57: 'সাতান্ন', 58: 'আটান্ন', 59: 'উনষাট',
  60: 'ষাট', 61: 'একষট্টি', 62: 'বাষট্টি', 63: 'তেষট্টি', 64: 'চৌষট্টি', 65: 'পঁয়ষট্টি', 66: 'ছেষট্টি', 67: 'সাতষট্টি', 68: 'আটষট্টি', 69: 'উনসত্তর',
  70: 'সত্তর', 71: 'একাত্তর', 72: 'বাহাত্তর', 73: 'তিয়াত্তর', 74: 'চুয়াত্তর', 75: 'পঁচাত্তর', 76: 'ছিয়াত্তর', 77: 'সাতাত্তর', 78: 'আটাত্তর', 79: 'উনাশি',
  80: 'আশি', 81: 'একাশি', 82: 'বিরাশি', 83: 'তিরাশি', 84: 'চুরাশি', 85: 'পঁচাশি', 86: 'ছিয়াশি', 87: 'সাতাশি', 88: 'আটাশি', 89: 'ঊননব্বই',
  90: 'নব্বই', 91: 'একানব্বই', 92: 'বানব্বই', 93: 'তিরানব্বই', 94: 'চুরানব্বই', 95: 'পঁচানব্বই', 96: 'ছিয়ানব্বই', 97: 'সাতানব্বই', 98: 'আটানব্বই', 99: 'নিরানব্বই'
}

const EN_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const EN_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function convertTwoDigitsBn(n) {
  if (n === 0) return ''
  if (n < 20) return BN_ONES[n]
  return BN_NUMS_20_99[n] || `${BN_TENS[Math.floor(n / 10)]} ${BN_ONES[n % 10]}`.trim()
}

function convertTwoDigitsEn(n) {
  if (n === 0) return ''
  if (n < 20) return EN_ONES[n]
  const ten = EN_TENS[Math.floor(n / 10)]
  const unit = EN_ONES[n % 10]
  return unit ? `${ten} ${unit}` : ten
}

function convertNumberToBn(num) {
  if (num === 0) return 'শূন্য টাকা মাত্র'
  let n = Math.floor(Math.abs(num))
  const parts = []

  const crore = Math.floor(n / 10000000)
  n %= 10000000
  if (crore > 0) {
    parts.push(`${convertNumberToBn(crore).replace(' টাকা মাত্র', '')} কোটি`)
  }

  const lakh = Math.floor(n / 100000)
  n %= 100000
  if (lakh > 0) {
    parts.push(`${convertTwoDigitsBn(lakh)} লাখ`)
  }

  const thousand = Math.floor(n / 1000)
  n %= 1000
  if (thousand > 0) {
    parts.push(`${convertTwoDigitsBn(thousand)} হাজার`)
  }

  const hundred = Math.floor(n / 100)
  n %= 100
  if (hundred > 0) {
    parts.push(`${BN_ONES[hundred]} শত`)
  }

  if (n > 0) {
    parts.push(convertTwoDigitsBn(n))
  }

  return `${parts.join(' ')} টাকা মাত্র`.trim()
}

function convertNumberToEn(num) {
  if (num === 0) return 'Zero Taka Only'
  let n = Math.floor(Math.abs(num))
  const parts = []

  const crore = Math.floor(n / 10000000)
  n %= 10000000
  if (crore > 0) {
    parts.push(`${convertNumberToEn(crore).replace(' Taka Only', '')} Crore`)
  }

  const lakh = Math.floor(n / 100000)
  n %= 100000
  if (lakh > 0) {
    parts.push(`${convertTwoDigitsEn(lakh)} Lakh`)
  }

  const thousand = Math.floor(n / 1000)
  n %= 1000
  if (thousand > 0) {
    parts.push(`${convertTwoDigitsEn(thousand)} Thousand`)
  }

  const hundred = Math.floor(n / 100)
  n %= 100
  if (hundred > 0) {
    parts.push(`${EN_ONES[hundred]} Hundred`)
  }

  if (n > 0) {
    parts.push(convertTwoDigitsEn(n))
  }

  return `${parts.join(' ')} Taka Only`.trim()
}

/**
 * Convert numerical money amount into formal words.
 * @param {number|string} amount
 * @param {'bn'|'en'} language
 * @returns {string}
 */
export function numberToWords(amount, language = 'bn') {
  const num = Number(amount)
  if (isNaN(num) || num <= 0) return ''
  return language === 'bn' ? convertNumberToBn(num) : convertNumberToEn(num)
}
