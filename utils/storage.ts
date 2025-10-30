// Packages:
import returnable from '@/utils/returnable'
import xonsole from '@/utils/xonsole'
import { storage } from '#imports'

// Typescript:
import type { Returnable } from '@/types/helpers'

// Constants:
const SIGNATURE = 'slop-blocker-'

// Exports:
export const KEYS = {
  blocklistPreferences: 'blocklist-preferences',
  blocklist: (blocklistID: string) => blocklistID,
  blocklistHash: (blocklistID: string) => `${blocklistID}-hash`,
  blocklistsMap: 'blocklists-map',
  unifiedBlocklist: 'unified-blocklist',
  scannedTweetCount: 'scanned-tweet-count',
  removedTweetCount: 'removed-tweet-count',
} as const

export const get = async <T = null>({
  key,
  defaultValue,
  onNull,
  processor,
}: {
  key: string
  defaultValue?: T
  onNull?: () => void
  processor?: (unprocessed: string) => T | null
}): Promise<Returnable<{
  value: T,
  wasNull: 'yes' | 'no'
}, {
  value: T,
  wasNull: 'indeterminate'
}>> => {
  try {
    key = SIGNATURE + key
    const value = (await storage.getItem<string>(`local:${key}`)) ?? null
    const result = value === null ? {
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
      return returnable.success(parsedValue === null ? {
        value: (defaultValue ?? null as T),
        wasNull: 'yes'
      } : {
        value: parsedValue,
        wasNull: 'no',
      })
    }
    else return returnable.success(result)
  } catch (error) {
    xonsole.error('get', error as Error, { key }, 'access key in LocalStorage by calling')
    return returnable.fail({
      value: (defaultValue ?? null as T),
      wasNull: 'indeterminate',
    })
  }
}

export const set = async <T>({
  key,
  value,
  override,
}: {
  key: string
  value: T
  override?: boolean
}): Promise<Returnable<undefined, Error>> => {
  try {
    key = SIGNATURE + key
    let stringifiedValue: string | null = null
    let error: Error | null = null

    try {
      stringifiedValue = JSON.stringify(value)
    } catch (stringificationError) {
      error = stringificationError as Error
      xonsole.error('set', error as Error, { key, value, override }, 'stringify value to store key in LocalStorage by calling')
    }

    if (stringifiedValue !== null) {
      await storage.setItem(`local:${key}`, stringifiedValue)
      return returnable.success(undefined)
    } else if (stringifiedValue === null && override) {
      await storage.removeItem(`local:${key}`)
      return returnable.success(undefined)
    } else return returnable.fail(error === null ? new Error(`Encountered an error while attempting to stringify value to store to key "${key}" in LocalStorage`) : error)
  } catch (error) {
    xonsole.error('set', error as Error, { key, value, override }, 'set key in LocalStorage by calling')
    return returnable.fail(error as Error)
  }
}
