// Packages:
import { KEYS, get, set } from '@/utils/storage'
import { sha256 } from '@/utils/sha'
import returnable from '@/utils/returnable'
import xonsole from '@/utils/xonsole'

// Typescript:
import type { Returnable } from '@/types/helpers'

// Constants:
import { INTERNAL_MESSAGE_ACTIONS } from '@/constants/internal-messaging'

const DEFAULT_BLOCKLIST_PREFERENCES: string[] = [
  'ai-maximalism',
  'aislop',
  'engagement-farming',
  'low-effort',
]

// Functions:
const getBlocklistPreferences = async (): Promise<Returnable<Returnable<{
  value: string[]
  wasNull: 'yes' | 'no'
}, {
  value: string[]
  wasNull: 'indeterminate'
}>, Error>> => {
  try {
    return returnable.success(await get<string[]>({
      key: KEYS.blocklistPreferences,
      defaultValue: DEFAULT_BLOCKLIST_PREFERENCES,
      onNull: () => set({
        key: KEYS.blocklistPreferences,
        value: DEFAULT_BLOCKLIST_PREFERENCES,
      }),
      processor: preferences => {
        const parsedPreferences = JSON.parse(preferences)
        if (typeof parsedPreferences === 'object' && Array.isArray(parsedPreferences)) {
          return parsedPreferences as string[]
        } else {
          return null
        }
      }
    }))
  } catch (error) {
    xonsole.warn('getBlocklistPreferences', error as Error, { })
    return returnable.fail(error as Error)
  }
}

const setBlocklistPreferences = async ({
  blocklistIDs,
}: {
  blocklistIDs: string[]
}): Promise<Returnable<undefined, Error>> => {
  try {
    const result = await set({
      key: KEYS.blocklistPreferences,
      value: blocklistIDs,
    })
    if (!result.status) throw result.payload
    else return returnable.success(result.payload)
  } catch (error) {
    xonsole.warn('setBlocklistPreferences', error as Error, { blocklistIDs })
    return returnable.fail(error as Error)
  }
}

const getBlocklistHashes = async ({
  blocklistIDs,
}: {
  blocklistIDs: string[]
}): Promise<Returnable<Map<string, string | null>, Error>> => {
  try {
    const blocklistHashes: Map<string, string | null> = new Map()
    for (const blocklistID of blocklistIDs) {
      const { status, payload: blocklistHash } = await get<string | null>({
        key: KEYS.blocklistHash(blocklistID)
      })
      blocklistHashes.set(blocklistID, !status ? '' : blocklistHash.value === null ? '' : JSON.parse(blocklistHash.value))
    }

    return returnable.success(blocklistHashes)
  } catch (error) {
    xonsole.error('getBlocklistHashes', error as Error, { blocklistIDs })
    return returnable.fail(error as Error)
  }
}

const setBlocklistHash = async ({
  blocklistID,
  blocklist,
}: {
  blocklistID: string
  blocklist: string[]
}): Promise<Returnable<undefined, Error>> => {
  try {
    const blocklistHash = await sha256(blocklist.join(','))
    const result = await set({
      key: KEYS.blocklistHash(blocklistID),
      value: blocklistHash,
    })

    if (!result.status) throw result.payload
    else return returnable.success(result.payload)
  } catch (error) {
    xonsole.warn('setBlocklistHash', error as Error, { blocklistID, blocklist }, 'generate blocklist hash for key by calling')
    return returnable.fail(error as Error)
  }
}

const getBlocklist = async ({
  blocklistID,
}: {
  blocklistID: string
}): (Promise<Returnable<Returnable<{
  value: string[]
  wasNull: 'yes' | 'no'
}, {
  value: string[]
  wasNull: 'indeterminate'
}>, Error>>) => {
  try {
    return returnable.success(await get<string[]>({
      key: KEYS.blocklist(blocklistID),
      defaultValue: [],
      onNull: () => set({
        key: KEYS.blocklist(blocklistID),
        value: '',
      }),
      processor: blocklistUsernames => blocklistUsernames.slice(1, blocklistUsernames.length - 1).split(',')
    }))
  } catch (error) {
    xonsole.warn('getBlocklist', error as Error, { })
    return returnable.fail(error as Error)
  }
}

const setBlocklist = async ({
  blocklistID,
  blocklist,
}: {
  blocklistID: string
  blocklist: string[]
}): Promise<Returnable<undefined, Error>> => {
  try {
    const result = await set({
      key: KEYS.blocklist(blocklistID),
      value: blocklist.join(','),
    })

    if (!result.status) throw result.payload
    else return returnable.success(result.payload)
  } catch (error) {
    xonsole.warn('setBlocklist', error as Error, { blocklistID, blocklist })
    return returnable.fail(error as Error)
  }
}

// Exports:
export default defineBackground(() => {
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // const tabID = sender?.tab?.id

    switch (request.type) {
      case INTERNAL_MESSAGE_ACTIONS.getBlocklistPreferences:
        getBlocklistPreferences().then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.setBlocklistPreferences:
        setBlocklistPreferences(request.payload).then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.getBlocklistHashes:
        getBlocklistHashes(request.payload).then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.setBlocklistHash:
        setBlocklistHash(request.payload).then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.getBlocklist:
        getBlocklist(request.payload).then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.setBlocklist:
        setBlocklist(request.payload).then(sendResponse)
        return true
    }
  })
})
