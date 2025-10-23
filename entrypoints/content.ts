// Packages:
import { KEYS, get, set } from '@/utils/localStorage'
import { sha256 } from '@/utils/sha'

// Typescript:
type Pair<T, U> = [T, U]

// Constants:
const BASE_ENDPOINT = import.meta.env.WXT_ENVIRONMENT === 'local' ? 'http://localhost:8080/api' : '//slop-blocker.diragb.dev/api'
const ENDPOINTS = {
  blocklists: (blocklistID: string) => `${BASE_ENDPOINT}/blocklists/${blocklistID}`,
  blocklistHashes: (blocklistID: string) => `${BASE_ENDPOINT}/blocklist-hashes/${blocklistID}`,
}
const DEFAULT_BLOCKLIST_PREFERENCES: string[] = [
  'ai-maximalism',
  'aislop',
  'engagement-farming',
  'low-effort',
]

// Functions:
const getBlocklistPreferences = () => get<string[]>({
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
})

const setBlocklistPreferences = (blocklistIDs: string[]) => set({
  key: KEYS.blocklistPreferences,
  value: blocklistIDs,
})

const getBlocklistHashes = (blocklistIDs: string[]) => {
  const blocklistHashes: Map<string, string | null> = new Map()
  for (const blocklistID of blocklistIDs) {
    const blocklistHash = get<string | null>({
      key: KEYS.blocklistHash(blocklistID)
    })
    blocklistHashes.set(blocklistID, blocklistHash.value === null ? '' : JSON.parse(blocklistHash.value))
  }

  return blocklistHashes
}

const setBlocklistHash = async (blocklistID: string, blocklist: string[]) => {
  try {
    const blocklistHash = await sha256(blocklist.join(','))
    set({
      key: KEYS.blocklistHash(blocklistID),
      value: blocklistHash,
    })
  } catch (error) {
    console.warn(`Encountered an error while attempting to generate blocklist hash for key "${KEYS.blocklistHash(blocklistID)}":`, error)
  }
}

const getBlocklist = (blocklistID: string) => get<string[]>({
  key: KEYS.blocklist(blocklistID),
  defaultValue: [],
  onNull: () => set({
    key: KEYS.blocklist(blocklistID),
    value: '',
  }),
  processor: blocklistUsernames => blocklistUsernames.slice(1, blocklistUsernames.length - 1).split(',')
})

const setBlocklist = (blocklistID: string, blocklist: string[]) => set({
  key: KEYS.blocklist(blocklistID),
  value: blocklist.join(','),
})

const fetchBlocklistHashFromRemote = async (blocklistID: string): Promise<string | null> => {
  try {
    const response = await fetch(ENDPOINTS.blocklistHashes(blocklistID))
    const blocklistHash = await response.text()
    return blocklistHash
  } catch (error) {
    console.warn(`Encountered an error while attempting to fetch the blocklist hash from remote for "${blocklistID}":`, error)
    return null
  }
}

const fetchBlocklistFromRemote = async (blocklistID: string): Promise<string[]> => {
  try {
    const response = await fetch(ENDPOINTS.blocklists(blocklistID))
    const blocklist = (await response.text()).split(',').filter(blocklistUsername => blocklistUsername.length > 0)
    return blocklist
  } catch (error) {
    console.warn(`Encountered an error while attempting to fetch the blocklist from remote for "${blocklistID}":`, error)
    return []
  }
}

const getOutOfSyncBlocklists = async (blocklistIDs: string[]): Promise<string[]> => {
  const blocklistHashes = getBlocklistHashes(blocklistIDs)
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

  return blocklistsOutOfSyncWithRemote
}

const getUnifiedBlocklist = async (blocklistIDs: string[], isFreshInstall: boolean) => {
  const blocklistsToFetch = isFreshInstall ? blocklistIDs : await getOutOfSyncBlocklists(blocklistIDs)
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
    setBlocklist(blocklistID, blocklist)
    setBlocklistHash(blocklistID, blocklist)
  }
  const flatResolvedBlocklists = resolvedBlocklists.flat()

  const flatCachedBlocklists: string[] = []
  for (const blocklistID of cachedBlocklistIDs) {
    const { value: blocklist } = getBlocklist(blocklistID)
    cachedBlocklists.set(blocklistID, blocklist)
    flatCachedBlocklists.push(...blocklist)
  }

  const unifiedBlocklists = [...flatResolvedBlocklists, ...flatCachedBlocklists]
  return new Set(unifiedBlocklists.sort((blocklistUsernameA, blocklistUsernameB) => String(blocklistUsernameA).localeCompare(String(blocklistUsernameB))))
}

const initialize = async () => {
  const { value: blocklistPreferences, wasNull: wasBlocklistPreferencesNull } = getBlocklistPreferences()
  const isFreshInstall = wasBlocklistPreferencesNull === 'yes' || wasBlocklistPreferencesNull === 'indeterminate'
  const unifiedBlocklist = await getUnifiedBlocklist(blocklistPreferences, isFreshInstall)
  console.log(unifiedBlocklist)
  // TODO: use the unifiedBlocklist later on..
}

const scanTweets = (): Array<Pair<string, Element>> => {
  const returnable: Array<Pair<string, Element>> = []
  const tweets = document.querySelectorAll('[data-testid="tweet"]')

  for (const tweet of tweets) {
    const username = tweet.querySelectorAll('[data-testid="User-Name"]')[0].children[1].getElementsByTagName('a')[0].innerText.slice(1)
    returnable.push([username, tweet])
    tweet.setAttribute('data-testid', 'scanned-tweet')
  }

  return returnable
}

const main = () => {
  const scannedTweetTuples = scanTweets()
  if (scannedTweetTuples.length > 0) {
    // TODO:
  }
}

// Exports:
export default defineContentScript({
  matches: ['*://*.x.com/*'],
  main() {
    initialize().then(() => {
      window.addEventListener('scroll', main)
      main()
    })
  },
})
