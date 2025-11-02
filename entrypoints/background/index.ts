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

// const BASE_ENDPOINT = import.meta.env.WXT_ENVIRONMENT === 'local' ? 'http://localhost:8080/api' : '//slop-blocker.diragb.dev/api'
const BASE_ENDPOINT = 'https://raw.githubusercontent.com/diragb/slop-muter-webapp/refs/heads/main'
const ENDPOINTS = {
  blocklists: (blocklistID: string) => `${BASE_ENDPOINT}/public/blocklists/${blocklistID}.txt`,
  blocklistHashes: (blocklistID: string) => `${BASE_ENDPOINT}/public/blocklist-hashes/${blocklistID}.txt`,
  blocklistsMap: `${BASE_ENDPOINT}/src/constants/blocklists-map.json`,
}

// Functions:
const fetchBlocklistHashFromRemote = async (blocklistID: string): Promise<string | null> => {
  try {
    const response = await fetch(ENDPOINTS.blocklistHashes(blocklistID))
    if (response.status !== 200) {
      xonsole.warn('fetchBlocklistHashFromRemote', new Error(`fetchBlocklistHashFromRemote returned with status ${response.status}`), { blocklistID })
      return null
    }
    const blocklistHash = await response.text()
    return blocklistHash
  } catch (error) {
    xonsole.warn('fetchBlocklistHashFromRemote', error as Error, { blocklistID }, 'fetch the blocklist hash from remote by calling')
    return null
  }
}

const fetchBlocklistFromRemote = async (blocklistID: string): Promise<string[]> => {
  try {
    const response = await fetch(ENDPOINTS.blocklists(blocklistID))
    if (response.status !== 200) {
      xonsole.warn('fetchBlocklistFromRemote', new Error(`fetchBlocklistFromRemote returned with status ${response.status}`), { blocklistID })
      return []
    }
    const blocklist = (await response.text()).split(',').filter(blocklistUsername => blocklistUsername.length > 0)
    return blocklist
  } catch (error) {
    xonsole.warn('fetchBlocklistFromRemote', error as Error, { blocklistID }, 'fetch the blocklist hash from remote by calling')
    return []
  }
}

const fetchBlocklistsMapFromRemote = async (): Promise<Returnable<Record<string, { name: string, description: string }>, Error>> => {
  try {
    const response = await fetch(ENDPOINTS.blocklistsMap)
    if (response.status !== 200) {
      throw new Error(`fetchBlocklistsMapFromRemote returned with status ${response.status}`)
    }
    const blocklistsMap = JSON.parse(await response.text()) as Record<string, { name: string, description: string }>
    return returnable.success(blocklistsMap)
  } catch (error) {
    xonsole.warn('fetchBlocklistsMapFromRemote', error as Error, {}, 'fetch the blocklists map from remote by calling')
    return returnable.fail(error as Error)
  }
}

const getOutOfSyncBlocklists = async (blocklistIDs: string[]): Promise<Returnable<string[], Error>> => {
  try {
    const { status, payload } = await getBlocklistHashes({ blocklistIDs })
    if (!status) throw payload
    const blocklistHashes = new Map<string, string | null>(Object.entries(payload))

    const fetchedBlocklistHashes = new Map<string, string | null>()
    const blocklistsOutOfSyncWithRemote: string[] = []

    const blocklistHashPromises = new Map<string, Promise<string | null>>()
    for (const blocklistID of blocklistIDs) {
      blocklistHashPromises.set(
        blocklistID,
        fetchBlocklistHashFromRemote(blocklistID)
      )
    }

    const resolvedBlocklistHashes = await Promise.all(blocklistHashPromises.values())
    for (let i = 0; i < resolvedBlocklistHashes.length; i++) {
      fetchedBlocklistHashes.set(blocklistIDs[i], resolvedBlocklistHashes[i])
    }

    for (const blocklistID of blocklistIDs) {
      if (
        blocklistHashes.get(blocklistID) === null ||
        fetchedBlocklistHashes.get(blocklistID) === null ||
        blocklistHashes.get(blocklistID) !== fetchedBlocklistHashes.get(blocklistID)
      ) {
        blocklistsOutOfSyncWithRemote.push(blocklistID)
      }
    }

    return returnable.success(blocklistsOutOfSyncWithRemote)
  } catch (error) {
    xonsole.warn('getOutOfSyncBlocklists', error as Error, { blocklistIDs })
    return returnable.fail(error as Error)
  }
}

const generateAndUpdateUnifiedBlocklist = async (): Promise<Returnable<string[], Error>> => {
  try {
    const {
      status: getBlocklistPreferencesStatus,
      payload: getBlocklistPreferencesPayload,
    } = await getBlocklistPreferences()
    if (!getBlocklistPreferencesStatus) throw getBlocklistPreferencesPayload
    const { payload: { value: blocklistIDs, wasNull: wasBlocklistPreferencesNull } } = getBlocklistPreferencesPayload
    const isFreshInstall = wasBlocklistPreferencesNull === 'yes' || wasBlocklistPreferencesNull === 'indeterminate'

    let blocklistsToFetch: string[] = []
    
    if (!isFreshInstall) {
      const {
        status: getOutOfSyncBlocklistsStatus,
        payload: getOutOfSyncBlocklistsPayload,
      } = await getOutOfSyncBlocklists(blocklistIDs)
      if (!getOutOfSyncBlocklistsStatus) throw getOutOfSyncBlocklistsPayload

      blocklistsToFetch = getOutOfSyncBlocklistsPayload
    } else {
      blocklistsToFetch = blocklistIDs
    }
    const cachedBlocklistIDs: string[] = isFreshInstall ? [] : blocklistIDs.filter(blocklistID => !blocklistsToFetch.includes(blocklistID))
    const fetchedBlocklists = new Map<string, string[]>()
    const cachedBlocklists = new Map<string, string[]>()

    const blocklistPromises = new Map<string, Promise<string[]>>()
    for (const blocklistID of blocklistsToFetch) {
      blocklistPromises.set(
        blocklistID,
        fetchBlocklistFromRemote(blocklistID)
      )
    }

    const resolvedBlocklists = await Promise.all(blocklistPromises.values())
    for (let i = 0; i < resolvedBlocklists.length; i++) {
      const blocklistID = blocklistsToFetch[i]
      fetchedBlocklists.set(blocklistID, resolvedBlocklists[i])
      const blocklist = resolvedBlocklists[i].flat().sort((a, b) => String(a).localeCompare(String(b)))
      const { status: setBlocklistStatus, payload: setBlocklistPayload } = await setBlocklist({ blocklistID, blocklist })
      if (!setBlocklistStatus) throw setBlocklistPayload
      const { status: setBlocklistHashStatus, payload: setBlocklistHashPayload } = await setBlocklistHash({ blocklistID, blocklist })
      if (!setBlocklistHashStatus) throw setBlocklistHashPayload
    }
    const flatResolvedBlocklists = resolvedBlocklists.flat()

    const flatCachedBlocklists: string[] = []
    for (const blocklistID of cachedBlocklistIDs) {
      const { status, payload } = await getBlocklist({ blocklistID })
      if (!status) throw payload
      const { payload: { value: blocklist } } = payload
      cachedBlocklists.set(blocklistID, blocklist)
      flatCachedBlocklists.push(...blocklist)
    }

    const unifiedBlocklists = [...flatResolvedBlocklists, ...flatCachedBlocklists]
    const nonDuplicatedUnifiedBlocklists = [...(new Set(unifiedBlocklists.sort((blocklistUsernameA, blocklistUsernameB) => String(blocklistUsernameA).localeCompare(String(blocklistUsernameB)))))]

    const {
      status: setUnifiedBlocklistStatus,
      payload: setUnifiedBlocklistPayload,
    } = await setUnifiedBlocklist({ blocklist: nonDuplicatedUnifiedBlocklists })
    if (!setUnifiedBlocklistStatus) throw setUnifiedBlocklistPayload

    return returnable.success(nonDuplicatedUnifiedBlocklists)
  } catch (error) {
    xonsole.warn('generateAndUpdateUnifiedBlocklist', error as Error, {})
    return returnable.fail(error as Error)
  }
}

// Getters And Setters:
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
}): Promise<Returnable<Record<string, string | null>, Error>> => {
  try {
    const blocklistHashes: Map<string, string | null> = new Map()
    for (const blocklistID of blocklistIDs) {
      const { status, payload: blocklistHash } = await get<string | null>({
        key: KEYS.blocklistHash(blocklistID)
      })
      blocklistHashes.set(blocklistID, !status ? '' : blocklistHash.value === null ? '' : JSON.parse(blocklistHash.value))
    }
    
    const blocklistHashesObject: Record<string, string | null> = Object.fromEntries(blocklistHashes.entries())
    return returnable.success(blocklistHashesObject)
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

const getBlocklistsMap = async (): (Promise<Returnable<Returnable<{
  value: Record<string, { name: string, description: string }>
  wasNull: 'yes' | 'no'
}, {
  value: Record<string, { name: string, description: string }>
  wasNull: 'indeterminate'
}>, Error>>) => {
  try {
    return returnable.success(await get<Record<string, { name: string, description: string }>>({
      key: KEYS.blocklistsMap,
      defaultValue: {},
      processor: json => JSON.parse(json),
    }))
  } catch (error) {
    xonsole.warn('getBlocklistsMap', error as Error, {})
    return returnable.fail(error as Error)
  }
}

const setBlocklistsMap = async ({
  blocklistsMap,
}: {
  blocklistsMap: Record<string, { name: string, description: string }>
}): Promise<Returnable<undefined, Error>> => {
  try {
    const result = await set({
      key: KEYS.blocklistsMap,
      value: JSON.stringify(blocklistsMap),
    })

    if (!result.status) throw result.payload
    else return returnable.success(result.payload)
  } catch (error) {
    xonsole.warn('setBlocklistsMap', error as Error, { blocklistsMap })
    return returnable.fail(error as Error)
  }
}

const getUnifiedBlocklist = async (): (Promise<Returnable<Returnable<{
  value: string[]
  wasNull: 'yes' | 'no'
}, {
  value: string[]
  wasNull: 'indeterminate'
}>, Error>>) => {
  try {
    return returnable.success(await get<string[]>({
      key: KEYS.unifiedBlocklist,
      defaultValue: [],
      onNull: () => set({
        key: KEYS.unifiedBlocklist,
        value: '',
      }),
      processor: blocklistUsernames => blocklistUsernames.slice(1, blocklistUsernames.length - 1).split(',')
    }))
  } catch (error) {
    xonsole.warn('getUnifiedBlocklist', error as Error, { })
    return returnable.fail(error as Error)
  }
}

const setUnifiedBlocklist = async ({
  blocklist,
}: {
  blocklist: string[]
}): Promise<Returnable<undefined, Error>> => {
  try {
    const result = await set({
      key: KEYS.unifiedBlocklist,
      value: blocklist.join(','),
    })

    if (!result.status) throw result.payload
    else return returnable.success(result.payload)
  } catch (error) {
    xonsole.warn('setUnifiedBlocklist', error as Error, { blocklist })
    return returnable.fail(error as Error)
  }
}

const getScannedTweetCount = async (): (Promise<Returnable<Returnable<{
  value: number
  wasNull: 'yes' | 'no'
}, {
  value: number
  wasNull: 'indeterminate'
}>, Error>>) => {
  try {
    return returnable.success(await get<number>({
      key: KEYS.scannedTweetCount,
      defaultValue: 0,
      onNull: () => set({
        key: KEYS.scannedTweetCount,
        value: '',
      }),
      processor: scanCount => {
        const parsed = parseInt(scanCount)
        return isNaN(parsed) ? 0 : parsed
      }
    }))
  } catch (error) {
    xonsole.warn('getScannedTweetCount', error as Error, { })
    return returnable.fail(error as Error)
  }
}

const incrementScannedTweetCount = async ({
  by,
}: {
  by: number
}): Promise<Returnable<undefined, Error>> => {
  try {
    const {
      status: getScannedTweetCountStatus,
      payload: getScannedTweetCountPayload,
    } = await getScannedTweetCount()
    if (!getScannedTweetCountStatus) throw getScannedTweetCountPayload
    const { status, payload } = getScannedTweetCountPayload
    if (!status) throw payload
    
    const result = await set({
      key: KEYS.scannedTweetCount,
      value: payload.value + by,
    })

    if (!result.status) throw result.payload
    else return returnable.success(result.payload)
  } catch (error) {
    xonsole.warn('incrementScannedTweetCount', error as Error, { by })
    return returnable.fail(error as Error)
  }
}

const getRemovedTweetCount = async (): (Promise<Returnable<Returnable<{
  value: number
  wasNull: 'yes' | 'no'
}, {
  value: number
  wasNull: 'indeterminate'
}>, Error>>) => {
  try {
    return returnable.success(await get<number>({
      key: KEYS.removedTweetCount,
      defaultValue: 0,
      onNull: () => set({
        key: KEYS.removedTweetCount,
        value: '',
      }),
      processor: scanCount => {
        const parsed = parseInt(scanCount)
        return isNaN(parsed) ? 0 : parsed
      }
    }))
  } catch (error) {
    xonsole.warn('getRemovedTweetCount', error as Error, { })
    return returnable.fail(error as Error)
  }
}

const incrementRemovedTweetCount = async ({
  by,
}: {
  by: number
}): Promise<Returnable<undefined, Error>> => {
  try {
    const {
      status: getRemovedTweetCountStatus,
      payload: getRemovedTweetCountPayload,
    } = await getRemovedTweetCount()
    if (!getRemovedTweetCountStatus) throw getRemovedTweetCountPayload
    const { status, payload } = getRemovedTweetCountPayload
    if (!status) throw payload
    
    const result = await set({
      key: KEYS.removedTweetCount,
      value: payload.value + by,
    })

    if (!result.status) throw result.payload
    else return returnable.success(result.payload)
  } catch (error) {
    xonsole.warn('incrementRemovedTweetCount', error as Error, { by })
    return returnable.fail(error as Error)
  }
}

const getCurrentSessionUsername = async (): (Promise<Returnable<Returnable<{
  value: string
  wasNull: 'yes' | 'no'
}, {
  value: string
  wasNull: 'indeterminate'
}>, Error>>) => {
  try {
    return returnable.success(await get<string>({
      key: KEYS.currentSessionUsername,
      defaultValue: '',
      onNull: () => set({
        key: KEYS.currentSessionUsername,
        value: '',
      }),
      processor: username => JSON.parse(username)
    }))
  } catch (error) {
    xonsole.warn('getCurrentSessionUsername', error as Error, { })
    return returnable.fail(error as Error)
  }
}

const setCurrentSessionUsername = async ({
  username,
}: {
  username: string
}): Promise<Returnable<undefined, Error>> => {
  try {
    const result = await set({
      key: KEYS.currentSessionUsername,
      value: username,
    })

    if (!result.status) throw result.payload
    else return returnable.success(result.payload)
  } catch (error) {
    xonsole.warn('setCurrentSessionUsername', error as Error, { username })
    return returnable.fail(error as Error)
  }
}

const getIsCurrentSessionUserBlocked = async (): (Promise<Returnable<Returnable<{
  value: boolean
  wasNull: 'yes' | 'no'
}, {
  value: boolean
  wasNull: 'indeterminate'
}>, Error>>) => {
  try {
    return returnable.success(await get<boolean>({
      key: KEYS.isCurrentSessionUserBlocked,
      defaultValue: false,
      onNull: () => set({
        key: KEYS.isCurrentSessionUserBlocked,
        value: false,
      }),
      processor: isBlocked => JSON.parse(isBlocked)
    }))
  } catch (error) {
    xonsole.warn('getIsCurrentSessionUserBlocked', error as Error, { })
    return returnable.fail(error as Error)
  }
}

const setIsCurrentSessionUserBlocked = async ({
  isBlocked,
}: {
  isBlocked: boolean
}): Promise<Returnable<undefined, Error>> => {
  try {
    const result = await set({
      key: KEYS.isCurrentSessionUserBlocked,
      value: isBlocked,
    })

    if (!result.status) throw result.payload
    else return returnable.success(result.payload)
  } catch (error) {
    xonsole.warn('setIsCurrentSessionUserBlocked', error as Error, { isBlocked })
    return returnable.fail(error as Error)
  }
}

// Exports:
export default defineBackground(() => {
  let popupPort: globalThis.Browser.runtime.Port, contentScriptPort: globalThis.Browser.runtime.Port

  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // const tabID = sender?.tab?.id

    switch (request.type) {
      case INTERNAL_MESSAGE_ACTIONS.fetchBlocklistsMapFromRemote:
        fetchBlocklistsMapFromRemote().then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.generateAndUpdateUnifiedBlocklist:
        generateAndUpdateUnifiedBlocklist().then(sendResponse)
        return true
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
      case INTERNAL_MESSAGE_ACTIONS.getBlocklistsMap:
        getBlocklistsMap().then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.setBlocklistsMap:
        setBlocklistsMap(request.payload).then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.getUnifiedBlocklist:
        getUnifiedBlocklist().then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.setUnifiedBlocklist:
        setUnifiedBlocklist(request.payload).then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.getScannedTweetCount:
        getScannedTweetCount().then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.incrementScannedTweetCount:
        incrementScannedTweetCount(request.payload).then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.getRemovedTweetCount:
        getRemovedTweetCount().then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.incrementRemovedTweetCount:
        incrementRemovedTweetCount(request.payload).then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.getCurrentSessionUsername:
        getCurrentSessionUsername().then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.setCurrentSessionUsername:
        setCurrentSessionUsername(request.payload).then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.getIsCurrentSessionUserBlocked:
        getIsCurrentSessionUserBlocked().then(sendResponse)
        return true
      case INTERNAL_MESSAGE_ACTIONS.setIsCurrentSessionUserBlocked:
        setIsCurrentSessionUserBlocked(request.payload).then(sendResponse)
        return true
    }
  })

  browser.runtime.onConnect.addListener(port => {
    if (port.name === 'popup') popupPort = port
    if (port.name === 'content-script') contentScriptPort = port
  
    port.onMessage.addListener(request => {
      try {
        if (port === contentScriptPort && popupPort) popupPort.postMessage(request)
      } catch {}
    })
  })
  
})
