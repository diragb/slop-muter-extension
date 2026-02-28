// Packages:
import { useState, useRef, useEffect } from 'react'
import Adapter from '@/utils/adapter'
import xonsole from '@/utils/xonsole'
import millify from 'millify'
import { cn } from '@/lib/utils'
import simplur from 'simplur'

// Assets:
import Icon from '../../assets/icon.png'
import { XIcon, EyeOffIcon, ScanSearchIcon, AlertTriangleIcon } from 'lucide-react'

// Constants:
import { INTERNAL_MESSAGE_ACTIONS } from '@/constants/internal-messaging'

// Components:
import { Badge } from '@/components/ui/badge'
import BlocklistList from './BlocklistCombobox'
import { Button } from '@/components/ui/button'

// Functions:
const BlocklistBadge = ({
  name,
  description,
  deleteBlocklistPreference,
}: {
  name: string
  description: string
  deleteBlocklistPreference: () => void
}) => (
  <Badge
    variant='outline'
    title={description}
    className='text-xs bg-white border-neutral-200 text-neutral-700 cursor-pointer transition-all hover:bg-red-50 hover:border-red-200 hover:text-red-600'
    onClick={deleteBlocklistPreference}
  >
    {name}
    <XIcon className='size-3' />
  </Badge>
)

const App = () => {
  // Ref:
  const adapter = useRef(new Adapter())
  
  // State:
  const [currentSessionUsername, setCurrentSessionUsername] = useState<string | null>(null)
  const [isCurrentSessionUserBlocked, setIsCurrentSessionUserBlocked] = useState(false)
  const [blocklistPreferences, setBlocklistPreferences] = useState<string[]>([])
  const [blocklists, setBlocklists] = useState<Record<string, { name: string, description: string }>>({})
  const [blocklistsArray, setBlocklistsArray] = useState<Array<{ id: string, name: string, description: string }>>([])
  const [scannedTweetCount, setScannedTweetCount] = useState(0)
  const [removedTweetCount, setRemovedTweetCount] = useState(0)

  // Functions:
  const loadBlocklistPreferences = async () => {
    try {
      const {
        status: getBlocklistPreferencesStatus,
        payload: getBlocklistPreferencesPayload,
      } = await adapter.current.execute('getBlocklistPreferences', undefined)
      if (!getBlocklistPreferencesStatus) throw getBlocklistPreferencesPayload
      const { payload: { value } } = getBlocklistPreferencesPayload
      if (value) {
        setBlocklistPreferences(value)
      }
    } catch (error) {
      xonsole.warn('loadBlocklistPreferences', error as Error, {})
    }
  }

  const loadBlocklistsMap = async () => {
    try {
      const {
        status: getBlocklistsMapStatus,
        payload: getBlocklistsMapPayload,
      } = await adapter.current.execute('getBlocklistsMap', undefined)
      if (!getBlocklistsMapStatus) throw getBlocklistsMapPayload
      const { payload: { value } } = getBlocklistsMapPayload
      if (value) {
        const blocklistsMap = JSON.parse(value) as Record<string, { name: string, description: string }>
        setBlocklists(blocklistsMap)
        setBlocklistsArray(
          Object.entries(blocklistsMap).map(([id, { name, description }]) => ({
            id,
            name,
            description,
          }))
        )
      }
    } catch (error) {
      xonsole.warn('loadBlocklistsMap', error as Error, {})
    }
  }

  const deleteBlocklistPreference = async (blocklistID: string) => {
    const _blocklistPreferences = [...blocklistPreferences]
    try {
      const newBlocklistPreferences = _blocklistPreferences.filter(_blocklistID => _blocklistID !== blocklistID)
      setBlocklistPreferences(newBlocklistPreferences)
      const {
        status: setBlocklistPreferencesStatus,
        payload: setBlocklistPreferencesPayload,
      } = await adapter.current.execute('setBlocklistPreferences', { blocklistIDs: newBlocklistPreferences })
      if (!setBlocklistPreferencesStatus) throw setBlocklistPreferencesPayload

      const [ tab ] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error('No active tab found')

      await browser.tabs.sendMessage(tab.id, { type: INTERNAL_MESSAGE_ACTIONS.refreshUnifiedBlocklist })
    } catch (error) {
      setBlocklistPreferences(_blocklistPreferences)
      xonsole.warn('deleteBlocklistPreference', error as Error, {})
    }
  }

  const addBlocklistPreference = async (blocklistID: string) => {
    const _blocklistPreferences = [...blocklistPreferences]
    try {
      const newBlocklistPreferences = _blocklistPreferences.includes(blocklistID)
        ? _blocklistPreferences
        : [..._blocklistPreferences, blocklistID]
      setBlocklistPreferences(newBlocklistPreferences)
      const {
        status: setBlocklistPreferencesStatus,
        payload: setBlocklistPreferencesPayload,
      } = await adapter.current.execute('setBlocklistPreferences', { blocklistIDs: newBlocklistPreferences })
      if (!setBlocklistPreferencesStatus) throw setBlocklistPreferencesPayload

      const [ tab ] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) throw new Error('No active tab found')

      await browser.tabs.sendMessage(tab.id, { type: INTERNAL_MESSAGE_ACTIONS.refreshUnifiedBlocklist })
    } catch (error) {
      setBlocklistPreferences(_blocklistPreferences)
      xonsole.warn('addBlocklistPreference', error as Error, {})
    }
  }

  const refreshScannedTweetCount = async () => {
    try {
      const {
        status: getScannedTweetCountStatus,
        payload: getScannedTweetCountPayload,
      } = await adapter.current.execute('getScannedTweetCount', undefined)
      if (!getScannedTweetCountStatus) throw getScannedTweetCountPayload
      const { payload: { value } } = getScannedTweetCountPayload
      setScannedTweetCount(value)
    } catch (error) {
      xonsole.warn('refreshScannedTweetCount', error as Error, {})
    }
  }

  const refreshRemovedTweetCount = async () => {
    try {
      const {
        status: getRemovedTweetCountStatus,
        payload: getRemovedTweetCountPayload,
      } = await adapter.current.execute('getRemovedTweetCount', undefined)
      if (!getRemovedTweetCountStatus) throw getRemovedTweetCountPayload
      const { payload: { value } } = getRemovedTweetCountPayload
      setRemovedTweetCount(value)
    } catch (error) {
      xonsole.warn('refreshRemovedTweetCount', error as Error, {})
    }
  }

  const refreshCurrentSessionUsername = async () => {
    try {
      const {
        status: getCurrentSessionUsernameStatus,
        payload: getCurrentSessionUsernamePayload,
      } = await adapter.current.execute('getCurrentSessionUsername', undefined)
      if (!getCurrentSessionUsernameStatus) throw getCurrentSessionUsernamePayload
      const { payload: { value } } = getCurrentSessionUsernamePayload
      setCurrentSessionUsername(value)
    } catch (error) {
      xonsole.warn('refreshCurrentSessionUsername', error as Error, {})
    }
  }

  const refreshIsCurrentSessionUserBlocked = async () => {
    try {
      const {
        status: getIsCurrentSessionUserBlockedStatus,
        payload: getIsCurrentSessionUserBlockedPayload,
      } = await adapter.current.execute('getIsCurrentSessionUserBlocked', undefined)
      if (!getIsCurrentSessionUserBlockedStatus) throw getIsCurrentSessionUserBlockedPayload
      const { payload: { value } } = getIsCurrentSessionUserBlockedPayload
      setIsCurrentSessionUserBlocked(value)
    } catch (error) {
      xonsole.warn('refreshIsCurrentSessionUserBlocked', error as Error, {})
    }
  }

  // Effects:
  useEffect(() => {
    loadBlocklistPreferences()
    loadBlocklistsMap()
    refreshScannedTweetCount()
    refreshRemovedTweetCount()
    refreshCurrentSessionUsername()
    refreshIsCurrentSessionUserBlocked()

    const messageListener = (
      request: any,
      _port: Browser.runtime.Port,
    ) => {
      switch (request.type) {
        case INTERNAL_MESSAGE_ACTIONS.refreshScannedTweetCount:
          refreshScannedTweetCount()
          break
        case INTERNAL_MESSAGE_ACTIONS.refreshRemovedTweetCount:
          refreshRemovedTweetCount()
          break
        case INTERNAL_MESSAGE_ACTIONS.refreshCurrentSessionUsername:
          refreshCurrentSessionUsername()
          break
        case INTERNAL_MESSAGE_ACTIONS.refreshIsCurrentSessionUserBlocked:
          refreshIsCurrentSessionUserBlocked()
          break
      }
    }

    const port = browser.runtime.connect({ name: 'popup' })
    port.onMessage.addListener(messageListener)

    return () => {
      port.onMessage.removeListener(messageListener)
    }
  }, [])

  // Return:
  return (
    <main className='relative flex flex-col w-full min-h-full font-[Inter] bg-white text-neutral-950'>
      {/* Warning banner for blocked users */}
      {
        isCurrentSessionUserBlocked && (
          <div className='flex flex-col w-full px-4 py-3 bg-red-50 border-b border-red-100'>
            <div className='flex items-center gap-2'>
              <AlertTriangleIcon className='size-4 text-red-500 shrink-0' />
              <span className='text-sm font-semibold text-red-700'>You're on a blocklist</span>
            </div>
            <span className='mt-0.5 ml-6 text-xs leading-relaxed text-red-500'>
              Appeal now to restore your reach and engagement.
            </span>
          </div>
        )
      }

      {/* Header */}
      <div className='flex items-center gap-3 px-4 pt-5 pb-3'>
        <div className='flex items-center justify-center size-11 rounded-xl bg-neutral-950 shadow-sm'>
          <img src={Icon} className='size-8 rounded-lg' />
        </div>
        <div className='flex flex-col flex-1'>
          <div className='flex items-center justify-between'>
            <h1 className='text-base font-bold tracking-tight text-neutral-950'>SlopMuter</h1>
            <Button
              size='sm'
              className='rounded-full h-7 px-4 text-xs font-semibold bg-neutral-950 text-white shadow-md hover:bg-neutral-800 cursor-pointer'
              asChild
            >
              <a href='https://x.com/intent/user?screen_name=slopmuter' target='_blank'>
                Follow
              </a>
            </Button>
          </div>
          <a
            href='https://x.com/slopmuter'
            target='_blank'
            className='w-fit text-xs text-neutral-400 transition-colors hover:text-neutral-600 hover:underline'
          >
            @slopmuter
          </a>
        </div>
      </div>

      {/* Tagline */}
      <p className='px-4 text-sm leading-relaxed text-neutral-500'>
        Mute the slop. <span className='font-medium text-green-500'>Keep the signal.</span>
      </p>

      {/* Stats */}
      <div className='flex items-center gap-4 px-4 mt-3'>
        <div className='flex items-center gap-1.5' title={simplur`Scanned ${scannedTweetCount} twee[t|ts] so far`}>
          <ScanSearchIcon className='size-3.5 text-neutral-400' />
          <span className='text-xs font-semibold text-neutral-950'>
            {millify(scannedTweetCount)}
          </span>
          <span className='text-xs text-neutral-500'>
            Scanned
          </span>
        </div>
        <div className='flex items-center gap-1.5' title={simplur`Removed ${removedTweetCount} twee[t|ts] so far`}>
          <EyeOffIcon className='size-3.5 text-neutral-400' />
          <span className='text-xs font-semibold text-neutral-950'>
            {millify(removedTweetCount)}
          </span>
          <span className='text-xs text-neutral-500'>
            Removed
          </span>
        </div>
        {
          (currentSessionUsername && currentSessionUsername.length > 0) && (
            <div
              className='flex items-center gap-1.5'
              title={isCurrentSessionUserBlocked ? 'Your account is on some of our blocklists' : 'Your account is not on any blocklist'}
            >
              <div className={cn(
                'size-2 rounded-full transition-all',
                isCurrentSessionUserBlocked ? 'bg-red-500' : 'bg-green-500'
              )} />
              <span className='text-xs text-neutral-500'>
                {currentSessionUsername}
              </span>
            </div>
          )
        }
      </div>

      {/* Blocklists */}
      <div className='flex flex-col gap-2.5 mx-4 mt-4'>
        {blocklistPreferences.length > 0 && (
          <span className='text-[11px] text-neutral-400'>
            {blocklistPreferences.length} blocklist{blocklistPreferences.length === 1 ? '' : 's'} active
          </span>
        )}
        <BlocklistList
          blocklists={blocklistsArray}
          selectedBlocklistIDs={blocklistPreferences}
          addBlocklistID={addBlocklistPreference}
          deleteBlocklistID={deleteBlocklistPreference}
        />
      </div>

      {/* Footer */}
      <footer className='flex justify-between items-center mt-auto pt-4 px-4 py-2.5 border-t border-neutral-100 text-[11px] text-neutral-400'>
        <div className='flex items-center gap-3'>
          <a
            className='transition-colors hover:text-neutral-600'
            href='https://slopmuter.com'
            target='_blank'
          >
            Learn More
          </a>
          {
            isCurrentSessionUserBlocked && (
              <>
                <span>·</span>
                <a
                  className='text-red-400 transition-colors hover:text-red-500'
                  href='https://x.com/intent/tweet?text=My%20dear%20followers,%20I%20am%20sorry%20for%20shitting%20up%20the%20X%20feed%20for%20everyone.%20Please%20accept%20this%20as%20my%20humble%20apology.%20Dear%20%40slopmuter,%20please%20remove%20me%20from%20the%20blocklist%28s%29%20I%20am%20on.%20Thank%20you.&related=slopmuter&hashtags=GuiltySlopPoster,SlopMuter'
                  target='_blank'
                >
                  Appeal
                </a>
              </>
            )
          }
        </div>
        <span>&copy; {new Date().getFullYear()} SlopMuter</span>
      </footer>
    </main>
  )
}

// Exports:
export default App
