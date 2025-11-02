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
const port = browser.runtime.connect({ name: 'content-script' })

// Variables:
let _unifiedBlocklist = new Set<string>(), _currentSessionUsername = ''

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
    const _tweet = tweet as HTMLElement

    try {
      const socialContextNode = tweet.children[0].children[0].children[0] as HTMLElement
      // const tweetContentNode = tweet.children[0].children[0].children[1].children[1] as HTMLElement
      // const tweetHeaderNode = tweetContentNode.children[0] as HTMLElement
      // const isReplyingTo = (tweetContentNode.children[1] as HTMLElement).innerText.includes('Replying to')
      // const tweetBodyNode = tweetContentNode.children[1 + (isReplyingTo ? 1 : 0)] as HTMLElement
      // const hasRepostedContent = (tweetContentNode.children[2 + (isReplyingTo ? 1 : 0)] as HTMLElement).getElementsByTagName('button').length === 0
      // const tweetRepostNode = hasRepostedContent ? tweetContentNode.children[2 + (isReplyingTo ? 1 : 0)] as HTMLElement : null
      // const tweetActionsNode = tweetContentNode.children[3 + (isReplyingTo ? 1 : 0) + (hasRepostedContent ? 0 : -1)] as HTMLElement

      const isReposted = (socialContextNode.innerText ?? '').length > 0
      let parentUsername = '', username = '', type: ScannedTweet['type'] = 'tweet'
      let parentTweet: HTMLElement | null = null

      const child = tweet?.querySelectorAll('[tabindex="0"]')[0] as HTMLElement | null, childBounds = child ? child.getBoundingClientRect() : null
      const MAX_BADGE_SIZE_IN_PIXELS = 20
      const hasBadge = childBounds === null ? false : childBounds.width === childBounds.height && childBounds.width < MAX_BADGE_SIZE_IN_PIXELS

      if (isReposted) type = 'repost'
      const isQuoteTweet = tweet?.querySelectorAll('[data-testid="Tweet-User-Avatar"]').length > 1

      if (isQuoteTweet) {
        parentUsername = tweet?.querySelectorAll('[data-testid="User-Name"]')[0]?.children[1].getElementsByTagName('a')[0].innerText?.slice(1)
        parentTweet = tweet as HTMLElement

        const childrenWithTabIndex0 = tweet?.querySelectorAll('[tabindex="0"]')
        for (let scanIndex = hasBadge ? 1 : 0; scanIndex < childrenWithTabIndex0.length; scanIndex++) {
          const tweetCandidate = childrenWithTabIndex0[scanIndex] as HTMLElement
          if (
            tweetCandidate.innerText.length > 0 &&
            tweetCandidate.parentElement?.dataset.testid !== 'videoComponent' &&
            tweetCandidate.role !== 'slider' && tweetCandidate.role === 'link' &&
            (tweetCandidate.previousSibling as HTMLElement | null)?.dataset.testid !== 'icon-verified'
          ) {
            tweet = tweetCandidate
            break
          }
        }

        username = (tweet?.querySelectorAll('[data-testid="User-Name"]')[0]?.querySelectorAll('[tabindex="-1"]')[0] as HTMLElement).innerText?.slice(1)
        type = 'quote-tweet'
      } else {
        username = tweet?.querySelectorAll('[data-testid="User-Name"]')[0]?.children[1].getElementsByTagName('a')[0].innerText?.slice(1)
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

      _tweet.setAttribute('data-slop-scan-status', 'scanned')
    } catch (error) {
      xonsole.warn('scanTweets', error as Error, { _tweet })
      _tweet.setAttribute('data-slop-scan-status', 'failed')
      if (import.meta.env.WXT_ENVIRONMENT === 'local') _tweet.style.background = 'red'
    } finally {
      _tweet.setAttribute('data-testid', 'scanned-tweet')
    }
  }
  
  return result
}

const muteSlop = async () => {
  try {
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
          if (import.meta.env.WXT_ENVIRONMENT === 'local') console.log(`Removed ${scannedTweet.username}'s tweet.`)
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
          adapter.execute('incrementRemovedTweetCount', { by: 1 }).then(({ status, payload }) => {
            if (!status) xonsole.warn('muteSlop.incrementRemovedTweetCount', payload, { by: 1 })
            try {
              port.postMessage({ type: INTERNAL_MESSAGE_ACTIONS.refreshRemovedTweetCount })
            } catch {}
          })
        }
      }
      adapter.execute('incrementScannedTweetCount', { by: scannedTweets.length }).then(({ status, payload }) => {
        if (!status) xonsole.warn('muteSlop.incrementScannedTweetCount', payload, { by: scannedTweets.length })
        try {
          port.postMessage({ type: INTERNAL_MESSAGE_ACTIONS.refreshScannedTweetCount })
        } catch {}
      })
    }
  } catch (error) {
    xonsole.error('muteSlop', error as Error, {})
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
    if (_currentSessionUsername) refreshIsCurrentSessionUserBlocked({ isBlocked: _unifiedBlocklist.has(_currentSessionUsername) })
  } catch (error) {
    xonsole.error('refreshUnifiedBlocklist', error as Error, {})
  }
}

const setAndRefreshCurrentSessionUsername = async ({ username }: { username: string }) => {
  try {
    adapter.execute('setCurrentSessionUsername', { username }).then(({ status, payload }) => {
      if (!status) xonsole.warn('setCurrentSessionUsername', payload, { username })
      try {
        port.postMessage({ type: INTERNAL_MESSAGE_ACTIONS.refreshCurrentSessionUsername })
      } catch {}
    })
  } catch {}
}

const refreshIsCurrentSessionUserBlocked = async ({ isBlocked }: { isBlocked: boolean }) => {
  try {
    adapter.execute('setIsCurrentSessionUserBlocked', { isBlocked }).then(({ status, payload }) => {
      if (!status) xonsole.warn('setIsCurrentSessionUserBlocked', payload, { isBlocked })
      try {
        port.postMessage({ type: INTERNAL_MESSAGE_ACTIONS.refreshCurrentSessionUsername })
      } catch {}
    })
  } catch {}
}

// Exports:
export default defineContentScript({
  matches: ['*://*.x.com/*'],
  main() {
    initialize().then(({ status: initializeStatus, payload: initializePayload }) => {
      if (!initializeStatus) throw initializePayload
      _unifiedBlocklist = initializePayload

      let previousURL = window.location.href, isUsernameObserverRegistered = false

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

      const usernameObserver = new MutationObserver(() => {
        const currentUsername = (document.querySelectorAll('[data-testid="SideNav_AccountSwitcher_Button"]')[0]?.querySelectorAll('[tabindex="-1"]')[0] as HTMLElement | null)?.innerText.slice(1)
        if (currentUsername && currentUsername !== _currentSessionUsername) {
          _currentSessionUsername = currentUsername
          setAndRefreshCurrentSessionUsername({ username: currentUsername })
          refreshIsCurrentSessionUserBlocked({ isBlocked: _unifiedBlocklist.has(_currentSessionUsername) })
        }
      })

      const registerUsernameObserver = () => {
        if (!isUsernameObserverRegistered) {
          const usernameNode = document.querySelectorAll('[data-testid="SideNav_AccountSwitcher_Button"]')[0]?.querySelectorAll('[tabindex="-1"]')[0]
          if (usernameNode) {
            usernameObserver.observe(usernameNode, { subtree: true, childList: true })
            const currentUsername = (usernameNode as HTMLElement)?.innerText.slice(1)
            if (currentUsername && currentUsername !== _currentSessionUsername) {
              _currentSessionUsername = currentUsername
              setAndRefreshCurrentSessionUsername({ username: currentUsername })
              refreshIsCurrentSessionUserBlocked({ isBlocked: _unifiedBlocklist.has(_currentSessionUsername) })
            }
            isUsernameObserverRegistered = true
          }
        }
      }
      
      URLObserver.observe(document, { subtree: true, childList: true })
      
      window.addEventListener('scroll', muteSlop)
      window.addEventListener('scroll', registerUsernameObserver)

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
