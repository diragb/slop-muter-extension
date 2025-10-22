// Exports:
export const KEYS = {
  blocklistPreferences: 'blocklist-preferences',
}

export const get = <T = null>(key: string, defaultValue?: T, onNull?: () => void, processor?: (unprocessed: string) => T | null): T => {
  try {
    key = 'slop-blocker-' + key
    const value = localStorage.getItem(key)
    const returnable = value === null ? (defaultValue ?? null as T) : value as T
    if (value === null && onNull !== undefined) onNull()
    if (processor !== undefined && value !== null) {
      const parsedValue = processor(value) as T | null
      if (parsedValue === null && onNull !== undefined) onNull()
      return parsedValue === null ? (defaultValue ?? null as T) : parsedValue
    }
    else return returnable
  } catch (error) {
    console.error(`Encountered an error while attempting to access key ${key} in LocalStorage`)
    return (defaultValue ?? null as T)
  }
}
