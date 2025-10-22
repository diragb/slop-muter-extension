// Constants:
const SIGNATURE = 'slop-blocker-'

// Exports:
export const KEYS = {
  blocklistPreferences: 'blocklist-preferences',
  blocklist: (blocklistID: string) => blocklistID,
  blocklistHash: (blocklistID: string) => `${blocklistID}-hash`,
} as const

export const get = <T = null>({
  key,
  defaultValue,
  onNull,
  processor,
}: {
  key: string
  defaultValue?: T
  onNull?: () => void
  processor?: (unprocessed: string) => T | null
}): {
  value: T,
  wasNull: 'yes' | 'no' | 'indeterminate'
} => {
  try {
    key = SIGNATURE + key
    const value = localStorage.getItem(key)
    const returnable = value === null ? {
      value: (defaultValue ?? null as T),
      wasNull: 'yes' as const,
    } : {
      value: value as T,
      wasNull: 'no' as const,
    }
    
    if (value === null && onNull !== undefined) onNull()
    if (processor !== undefined && value !== null) {
      const parsedValue = processor(value) as T | null
      if (parsedValue === null && onNull !== undefined) onNull()
      return parsedValue === null ? {
        value: (defaultValue ?? null as T),
        wasNull: 'yes'
      } : {
        value: parsedValue,
        wasNull: 'no',
      }
    }
    else return returnable
  } catch (error) {
    console.error(`Encountered an error while attempting to access key "${key}" in LocalStorage:`, error)
    return {
      value: (defaultValue ?? null as T),
      wasNull: 'indeterminate',
    }
  }
}

export const set = <T>({
  key,
  value,
  override,
}: {
  key: string
  value: T
  override?: boolean
}): boolean => {
  try {
    key = SIGNATURE + key
    let stringifiedValue: string | null = null

    try {
      stringifiedValue = JSON.stringify(value)
    } catch (error) {
      console.error(`Encountered an error while attempting to stringify value to store to key "${key}" in LocalStorage:`, error)
    }

    if (stringifiedValue !== null) {
      localStorage.setItem(key, stringifiedValue)
      return true
    } else if (stringifiedValue === null && override) {
      localStorage.removeItem(key)
      return true
    } else return false
  } catch (error) {
    console.error(`Encountered an error while attempting to set key "${key}" in LocalStorage:`, error)
    return false
  }
}
