// Packages:
import Adapter from '@/utils/adapter'
import xonsole from '@/utils/xonsole'

// Typescript:
interface ScannedBasicTweet {
  username: string
  tweet: HTMLElement
  type: 'tweet'
}

interface ScannedRepostTweet {
  username: string
  tweet: HTMLElement
  type: 'repost'
}

interface ScannedQuoteTweet {
  parentUsername: string
  username: string
  parentTweet: HTMLElement
  tweet: HTMLElement
  type: 'quote-tweet'
}

type ScannedTweet = ScannedBasicTweet | ScannedRepostTweet | ScannedQuoteTweet

// Constants:
const adapter = new Adapter()
// const BASE_ENDPOINT = import.meta.env.WXT_ENVIRONMENT === 'local' ? 'http://localhost:8080/api' : '//slop-blocker.diragb.dev/api'
const BASE_ENDPOINT = 'https://raw.githubusercontent.com/diragb/slop-muter-webapp/refs/heads/main'
const ENDPOINTS = {
  blocklists: (blocklistID: string) => `${BASE_ENDPOINT}/public/blocklists/${blocklistID}.txt`,
  blocklistHashes: (blocklistID: string) => `${BASE_ENDPOINT}/public/blocklist-hashes/${blocklistID}.txt`,
  blocklistsMap: `${BASE_ENDPOINT}/src/constants/blocklists-map.json`,
}

// Variables:
let _unifiedBlocklist = new Set<string>()

// Functions:
const fetchBlocklistHashFromRemote = async (blocklistID: string): Promise<string | null> => {
  try {
    const response = await fetch(ENDPOINTS.blocklistHashes(blocklistID))
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
    const blocklist = (await response.text()).split(',').filter(blocklistUsername => blocklistUsername.length > 0)
    return blocklist
  } catch (error) {
    xonsole.warn('fetchBlocklistFromRemote', error as Error, { blocklistID }, 'fetch the blocklist hash from remote by calling')
    return []
  }
}

const fetchBlocklistsMapFromRemote = async (): Promise<Record<string, { name: string, description: string }>> => {
  try {
    const response = await fetch(ENDPOINTS.blocklistsMap)
    const blocklistsMap = JSON.parse(await response.text()) as Record<string, { name: string, description: string }>
    return blocklistsMap
  } catch (error) {
    xonsole.warn('fetchBlocklistsMapFromRemote', error as Error, {}, 'fetch the blocklists map from remote by calling')
    return {}
  }
}

const getOutOfSyncBlocklists = async (blocklistIDs: string[]): Promise<string[]> => {
  const { status, payload } = await adapter.execute('getBlocklistHashes', { blocklistIDs })
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

// Shift the logic here to background pages so that popup can fetch and update blocklists at will.
// TODO: use https://www.npmjs.com/package/trpc-chrome
const initialize = async () => {
  const {
    status: getBlocklistPreferencesStatus,
    payload: getBlocklistPreferencesPayload,
  } = await adapter.execute('getBlocklistPreferences', undefined)
  if (!getBlocklistPreferencesStatus) throw getBlocklistPreferencesPayload
  const { payload: { value: blocklistPreferences, wasNull: wasBlocklistPreferencesNull } } = getBlocklistPreferencesPayload
  const isFreshInstall = wasBlocklistPreferencesNull === 'yes' || wasBlocklistPreferencesNull === 'indeterminate'
  const unifiedBlocklist = await getUnifiedBlocklist(blocklistPreferences, isFreshInstall)

  const {
    status: getBlocklistsMapStatus,
    payload: getBlocklistsMapPayload,
  } = await adapter.execute('getBlocklistsMap', undefined)
  if (!getBlocklistsMapStatus) throw getBlocklistsMapStatus
  const { payload: { wasNull: wasBlocklistsMapNull } } = getBlocklistsMapPayload
  if (wasBlocklistsMapNull === 'yes') {
    const blocklistsMap = await fetchBlocklistsMapFromRemote()
    const { status: setBlocklistsMapStatus, payload: setBlocklistsMapPayload } = await adapter.execute('setBlocklistsMap', { blocklistsMap })
    if (!setBlocklistsMapStatus) throw setBlocklistsMapPayload
  }

  return unifiedBlocklist
}

const scanTweets = (): Array<ScannedTweet> => {
  const result: Array<ScannedTweet> = []
  const tweets = document.querySelectorAll('[data-testid="tweet"]')

  for (let tweet of tweets) {
    const _tweet = tweet

    try {
      const socialContextNode = tweet.children[0].children[0].children[0] as HTMLElement
      const isReposted = (socialContextNode.innerText ?? '').length > 0
      let parentUsername = '', username = '', type: ScannedTweet['type'] = 'tweet'
      let parentTweet: HTMLElement | null = null

      if (isReposted) type = 'repost'
      const isQuoteTweet = tweet?.querySelectorAll('[data-testid="Tweet-User-Avatar"]').length > 1

      if (isQuoteTweet) {
        parentUsername = tweet?.querySelectorAll('[data-testid="User-Name"]')[0].children[1].getElementsByTagName('a')[0].innerText?.slice(1)
        parentTweet = tweet as HTMLElement
        tweet = tweet?.querySelectorAll('[tabindex="0"]')[0]
        username = (tweet?.querySelectorAll('[data-testid="User-Name"]')[0]?.querySelectorAll('[tabindex="-1"]')[0] as HTMLElement).innerText?.slice(1)
        type = 'quote-tweet'
      } else {
        username = tweet?.querySelectorAll('[data-testid="User-Name"]')[0].children[1].getElementsByTagName('a')[0].innerText?.slice(1)
      }

      if (type === 'quote-tweet') {
        result.push({
          parentUsername,
          username,
          parentTweet: parentTweet as HTMLElement,
          tweet: tweet as HTMLElement,
          type,
        })
      } else {
        result.push({
          username,
          tweet: tweet as HTMLElement,
          type,
        })
      }
    } catch (error) {
      xonsole.warn('scanTweets', error as Error, { _tweet })
    } finally {
      _tweet.setAttribute('data-testid', 'scanned-tweet')
    }
  }
  
  return result
}

const muteSlop = () => {
  const scannedTweets = scanTweets()
  if (scannedTweets.length > 0) {
    for (const scannedTweet of scannedTweets) {
      if (
        (
          scannedTweet.type === 'quote-tweet' && (
            _unifiedBlocklist.has(scannedTweet.username) ||
            _unifiedBlocklist.has(scannedTweet.parentUsername)
          )
        ) ||
        _unifiedBlocklist.has(scannedTweet.username)
      ) {
        console.log(`Removed ${scannedTweet.username}'s tweet.`)
        if (scannedTweet.type === 'quote-tweet' && !_unifiedBlocklist.has(scannedTweet.parentUsername)) {
          while (scannedTweet.tweet.firstChild) {
            scannedTweet.tweet.removeChild(scannedTweet.tweet.firstChild)
          }
          scannedTweet.tweet.style.display = 'flex'
          scannedTweet.tweet.style.justifyContent = 'center'
          scannedTweet.tweet.style.minHeight = '46px'
          scannedTweet.tweet.style.paddingLeft = '12px'
          scannedTweet.tweet.style.backgroundColor = '#16181c'
          scannedTweet.tweet.style.pointerEvents = 'none'

          const notifier = document.createElement('span')
          notifier.innerHTML = 'This Post is from an account muted by <b>SlopMuter</b>.'
          notifier.style.fontFamily = 'TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
          notifier.style.color = '#71767b'
          scannedTweet.tweet.appendChild(notifier)
        } else {
          const nodeToRemove = scannedTweet.type === 'quote-tweet' ? scannedTweet.parentTweet.parentNode?.parentNode : scannedTweet.tweet.parentNode?.parentNode
          if (nodeToRemove && nodeToRemove.parentNode) {
            nodeToRemove.parentNode.removeChild(nodeToRemove)
          }
        }
      }
    }
  }
}

// Exports:
export default defineContentScript({
  matches: ['*://*.x.com/*'],
  main() {
    initialize().then(unifiedBlocklist => {
      console.log(unifiedBlocklist)
      _unifiedBlocklist = unifiedBlocklist

      let previousURL = window.location.href
      const URLObserver = new MutationObserver(() => {
        const currentURL = window.location.href
        if (currentURL !== previousURL) {
          if (currentURL.includes('/photo/')) {
            let photosModal: HTMLElement | undefined = undefined
            const modalSearchInterval = window.setInterval(() => {
              photosModal = document.querySelectorAll('[data-harvest-observe-id="Modal Thread"]')[0] as HTMLElement
              if (photosModal) {
                photosModal.addEventListener('scroll', muteSlop)
                clearInterval(modalSearchInterval)
              }
            }, 1000)
          }
          previousURL = currentURL
        }
      })
      
      URLObserver.observe(document, { subtree: true, childList: true })
      window.addEventListener('scroll', muteSlop)
    })
  },
})
