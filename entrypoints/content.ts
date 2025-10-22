import { get, KEYS } from "@/utils/localStorage"

// Typescript:
type Pair<T, U> = [T, U]

// Constants:
const DEFAULT_BLOCKLIST_PREFERENCES: string[] = []
const mutedUsernames = new Set('ChillamChilli')

// Functions:
const setDefaultBlocklistPreferences = () => {
  try {
    localStorage.setItem('slop-blocker-preferences', JSON.stringify(DEFAULT_BLOCKLIST_PREFERENCES))
  } catch (error) {
    console.error('Error setting default slop-blocker-preferences to localStorage:', error)
  }
}

const getBlocklistPreferences = () => {
  return get<string[]>(
    KEYS.blocklistPreferences,
    DEFAULT_BLOCKLIST_PREFERENCES,
    setDefaultBlocklistPreferences,
    preferences => {
      const parsedPreferences = JSON.parse(preferences)
      if (typeof parsedPreferences === 'object' && Array.isArray(parsedPreferences)) {
        return parsedPreferences as string[]
      } else {
        return null
      }
    }
  )
}

const fetchBlocklistFromRemote = async (blocklistID: string) => {
  // const response = await fetch(`https://slop-blocker.diragb.dev/blocklists/${blocklistID}`)
  // const blocklist = (await response.text()).split(',')
  // return blocklist
  return ['ChillamChilli', 'elonmusk']
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

const initialize = async () => {
  const blocklistPreferences = getBlocklistPreferences()
  const blocklistPromises: Promise<string[]>[] = []
  for (const blocklistPreference of blocklistPreferences) {
    blocklistPromises.push(fetchBlocklistFromRemote(blocklistPreference))
  }

  const allBlocklists = await Promise.all(blocklistPromises)
  const mutedUsernames = new Set(allBlocklists.flat())
}

const main = () => {
  const scannedTweetTuples = scanTweets()
  if (scannedTweetTuples.length > 0) {

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
