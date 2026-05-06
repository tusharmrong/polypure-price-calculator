const storagePrefix = 'polypure:'

export function loadValue(key, fallback) {
  try {
    const value = window.localStorage.getItem(`${storagePrefix}${key}`)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export function saveValue(key, value) {
  window.localStorage.setItem(`${storagePrefix}${key}`, JSON.stringify(value))
}
