// Packages:
import Adapter from './adapter'

// Typescript:
import type { Pair } from '@/types/helpers'

// Constants:
const adapter = new Adapter()
const BASE_ENDPOINT = import.meta.env.WXT_ENVIRONMENT === 'local' ? 'http://localhost:8080/api' : '//slop-blocker.diragb.dev/api'
const ENDPOINTS = {
  blocklists: (blocklistID: string) => `${BASE_ENDPOINT}/blocklists/${blocklistID}`,
  blocklistHashes: (blocklistID: string) => `${BASE_ENDPOINT}/blocklist-hashes/${blocklistID}`,
}


// Functions:
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
  const { status, payload } = await adapter.execute('getBlocklistHashes', { blocklistIDs })
  if (!status) throw payload
  const blocklistHashes = payload

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
    const { status: setBlocklistStatus, payload: setBlocklistPayload } = await adapter.execute('setBlocklist', { blocklistID, blocklist })
    if (!setBlocklistStatus) throw setBlocklistPayload
    const { status: setBlocklistHashStatus, payload: setBlocklistHashPayload } = await adapter.execute('setBlocklistHash', { blocklistID, blocklist })
    if (!setBlocklistHashStatus) throw setBlocklistHashPayload
  }
  const flatResolvedBlocklists = resolvedBlocklists.flat()

  const flatCachedBlocklists: string[] = []
  for (const blocklistID of cachedBlocklistIDs) {
    const { status, payload } = await adapter.execute('getBlocklist', { blocklistID })
    if (!status) throw payload
    const { payload: { value: blocklist } } = payload
    cachedBlocklists.set(blocklistID, blocklist)
    flatCachedBlocklists.push(...blocklist)
  }

  const unifiedBlocklists = [...flatResolvedBlocklists, ...flatCachedBlocklists]
  return new Set(unifiedBlocklists.sort((blocklistUsernameA, blocklistUsernameB) => String(blocklistUsernameA).localeCompare(String(blocklistUsernameB))))
}

const initialize = async () => {
  const { status, payload } = await adapter.execute('getBlocklistPreferences', undefined)
  if (!status) throw payload
  const { payload: { value: blocklistPreferences, wasNull: wasBlocklistPreferencesNull } } = payload
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
