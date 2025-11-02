// Packages:
import { useState, useRef, useEffect } from 'react'
import Adapter from '@/utils/adapter'
import xonsole from '@/utils/xonsole'
import millify from 'millify'
import { cn } from '@/lib/utils'
import simplur from 'simplur'

// Assets:
import Icon from '../../assets/icon.png'
import { XIcon } from 'lucide-react'

// Constants:
import { INTERNAL_MESSAGE_ACTIONS } from '@/constants/internal-messaging'

// Components:
import { Badge } from '@/components/ui/badge'
import BlocklistCombobox from './BlocklistCombobox'
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
  <Badge variant='outline' title={description} className='text-xs bg-white cursor-pointer transition-all hover:bg-rose-300' onClick={deleteBlocklistPreference}>
    {name}
    <XIcon />
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
    <main className='flex justify-center flex-col gap-4 w-full p-2 font-[Inter] bg-zinc-50 text-zinc-950'>
      {
        isCurrentSessionUserBlocked && (
          <div className='relative flex flex-col w-[calc(100%+8px+8px)] -m-2 p-2 bg-rose-600 text-sm text-zinc-50'>
            <span className='text-lg font-semibold'>😱 Uh oh, we've blocked you.</span>
            <span className='text-xs font-medium'>Appeal now to restore your reach and engagement.</span>
          </div>
        )
      }
      <div className='relative'>
        <div className='relative z-10 w-[calc(100%+8px+8px)] h-28 -m-2 mb-5 bg-sky-400 bg-cover bg-center bg-no-repeat' style={{ backgroundImage: 'url(https://raw.githubusercontent.com/diragb/slop-muter-webapp/refs/heads/main/public/twitter-image.jpg)' }}>
          <div className='absolute left-2 -bottom-10'>
            <img src={Icon} className='size-20 bg-white rounded-full border-zinc-50 border-2' />
          </div>
        </div>
        <div className='absolute top-28 flex justify-end items-center w-full'>
          <Button size='sm' className='rounded-full w-20 cursor-pointer' asChild>
            <a href='https://x.com/intent/user?screen_name=slopmuter' target='_blank'>
              Follow
            </a>
          </Button>
        </div>
      </div>
      <div className='flex flex-col ml-1 mt-2'>
        <h1 className='font-bold text-lg'>SlopMuter</h1>
        <a href='https://x.com/slopmuter' target='_blank' className='w-fit text-zinc-700 transition-all hover:underline hover:text-zinc-800'>@slopmuter</a>
        <span className='mt-2 text-xs'>Browser extension that automatically blocks slop posts on your X/Twitter feed.</span>
        <div className='flex gap-3 mt-2 text-xs'>
          <div className='flex items-center justify-center gap-1' title={simplur`Scanned ${scannedTweetCount} twee[t|ts] so far`}>
            <span className='font-semibold'>
              {millify(scannedTweetCount)}
            </span>
            <span className='text-zinc-700'>
              Scanned
            </span>
          </div>
          <div className='flex items-center justify-center gap-1' title={simplur`Removed ${removedTweetCount} twee[t|ts] so far`}>
            <span className='font-semibold'>
              {millify(removedTweetCount)}
            </span>
            <span className='text-zinc-700'>
              Removed
            </span>
          </div>
          {
            (currentSessionUsername && currentSessionUsername.length > 0) && (
              <div className='flex items-center justify-center gap-1' title={isCurrentSessionUserBlocked ? 'Your account is on some of our blocklists' : 'Your account is not on any blocklist'}>
                <div className={cn('size-2.5 rounded-full transition-all', isCurrentSessionUserBlocked ? 'bg-rose-500' : 'bg-emerald-500')} />
                <span className='text-zinc-700'>
                  {currentSessionUsername}
                </span>
              </div>
            )
          }
        </div>
      </div>
      <div className='flex flex-col gap-2 px-1'>
        <h3 className='text-sm font-semibold'>Current Blocklists</h3>
        <div className='flex gap-1 flex-wrap'>
          {
            Object.entries(blocklists).length > 0 && blocklistPreferences.map(blocklistID => (
              <BlocklistBadge
                key={blocklistID}
                name={blocklists[blocklistID].name}
                description={blocklists[blocklistID].description}
                deleteBlocklistPreference={() => deleteBlocklistPreference(blocklistID)}
              />
            ))
          }
        </div>
        <BlocklistCombobox
          blocklists={blocklistsArray}
          selectedBlocklistIDs={blocklistPreferences}
          addBlocklistID={addBlocklistPreference}
          deleteBlocklistID={deleteBlocklistPreference}
        />
      </div>
      <div className='absolute bottom-0 flex justify-between items-center w-full -ml-2 py-1 px-2 text-zinc-50 text-xs bg-zinc-500'>
        <div className='flex justify-start items-center gap-1.5'>
          <a className='hover:underline hover:text-zinc-100' href='https://github.com/diragb/slop-muter-extension' target='_blank'>Contribute</a>
          {
            isCurrentSessionUserBlocked && (
              <>
                <span>•</span>
                <a className='hover:underline hover:text-zinc-100' href='https://x.com/intent/tweet?text=My%20dear%20followers,%20I%20am%20sorry%20for%20shitting%20up%20the%20X%20feed%20for%20everyone.%20Please%20accept%20this%20as%20my%20humble%20apology.%20Dear%20%40slopmuter,%20please%20remove%20me%20from%20the%20blocklist%28s%29%20I%20am%20on.%20Thank%20you.&related=slopmuter&hashtags=GuiltySlopPoster,SlopMuter' target='_blank'>Appeal</a>
              </>
            )
          }
        </div>
        <span>© 2025 SlopMuter</span>
      </div>
    </main>
  )
}

// Exports:
export default App
