// Packages:
import Adapter from '@/utils/adapter'
import xonsole from '@/utils/xonsole'
import returnable from '@/utils/returnable'

// Typescript:
import type { Returnable } from '@/types/helpers'

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
import { INTERNAL_MESSAGE_ACTIONS } from '@/constants/internal-messaging'
const adapter = new Adapter()

// Variables:
let _unifiedBlocklist = new Set<string>()

// Functions:


const initialize = async (): Promise<Returnable<Set<string>, Error>> => {
  try {
    const {
      status: generateAndUpdateUnifiedBlocklistStatus,
      payload: generateAndUpdateUnifiedBlocklistPayload,
    } = await adapter.execute('generateAndUpdateUnifiedBlocklist', undefined)
    if (!generateAndUpdateUnifiedBlocklistStatus) throw generateAndUpdateUnifiedBlocklistPayload

    const {
      status: getBlocklistsMapStatus,
      payload: getBlocklistsMapPayload,
    } = await adapter.execute('getBlocklistsMap', undefined)
    if (!getBlocklistsMapStatus) throw getBlocklistsMapStatus
    const { payload: { wasNull: wasBlocklistsMapNull } } = getBlocklistsMapPayload
    if (wasBlocklistsMapNull === 'yes') {
      const {
        status: fetchBlocklistsMapFromRemoteStatus,
        payload: fetchBlocklistsMapFromRemotePayload,
      } = await adapter.execute('fetchBlocklistsMapFromRemote', undefined)
      if (!fetchBlocklistsMapFromRemoteStatus) throw fetchBlocklistsMapFromRemotePayload
      const {
        status: setBlocklistsMapStatus,
        payload: setBlocklistsMapPayload,
      } = await adapter.execute('setBlocklistsMap', { blocklistsMap: fetchBlocklistsMapFromRemotePayload })
      if (!setBlocklistsMapStatus) throw setBlocklistsMapPayload
    }

    return returnable.success(new Set(generateAndUpdateUnifiedBlocklistPayload))
  } catch (error) {
    xonsole.error('initialize', error as Error, {})
    return returnable.fail(error as Error)
  }
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

const refreshUnifiedBlocklist = async () => {
  try {
    const {
      status: generateAndUpdateUnifiedBlocklistStatus,
      payload: generateAndUpdateUnifiedBlocklistPayload,
    } = await adapter.execute('generateAndUpdateUnifiedBlocklist', undefined)
    if (!generateAndUpdateUnifiedBlocklistStatus) throw generateAndUpdateUnifiedBlocklistPayload

    _unifiedBlocklist = new Set(generateAndUpdateUnifiedBlocklistPayload)
  } catch (error) {
    xonsole.error('refreshUnifiedBlocklist', error as Error, {})
  }
}

// Exports:
export default defineContentScript({
  matches: ['*://*.x.com/*'],
  main() {
    initialize().then(({ status: initializeStatus, payload: initializePayload }) => {
      if (!initializeStatus) throw initializePayload
      _unifiedBlocklist = initializePayload

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

      browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.type) {
          case INTERNAL_MESSAGE_ACTIONS.refreshUnifiedBlocklist:
            refreshUnifiedBlocklist().then(sendResponse)
            return true
        }
      })
    })
  },
})
