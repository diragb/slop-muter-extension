// Packages:
import { useState, useRef } from 'react'
import Adapter from '@/utils/adapter'
import xonsole from '@/utils/xonsole'

// Assets:
import Icon from '../../assets/icon.png'
import { XIcon } from 'lucide-react'

// Components:
import { Badge } from '@/components/ui/badge'
import BlocklistCombobox from './BlocklistCombobox'

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
  <Badge variant='outline' title={description} className='text-xs cursor-pointer transition-all hover:bg-rose-200' onClick={deleteBlocklistPreference}>
    {name}
    <XIcon />
  </Badge>
)

const App = () => {
  // Ref:
  const adapter = useRef(new Adapter())
  
  // State:
  const [blocklistPreferences, setBlocklistPreferences] = useState<string[]>([])
  const [blocklists, setBlocklists] = useState<Record<string, { name: string, description: string }>>({})
  const [blocklistsArray, setBlocklistsArray] = useState<Array<{ id: string, name: string, description: string }>>([])

  // Functions:
  const loadBlocklistPreferences = async () => {
    try {
      const {
        status: getBlocklistPreferencesStatus,
        payload: getBlocklistPreferencesPayload,
      } = await adapter.current.execute('getBlocklistPreferences', undefined)
      if (!getBlocklistPreferencesStatus) throw getBlocklistPreferencesStatus
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
      if (!getBlocklistsMapStatus) throw getBlocklistsMapStatus
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
    } catch (error) {
      setBlocklistPreferences(_blocklistPreferences)
      xonsole.warn('addBlocklistPreference', error as Error, {})
    }
  }

  // Effects:
  useEffect(() => {
    loadBlocklistPreferences()
    loadBlocklistsMap()
  }, [])

  // Return:
  return (
    <main className='flex justify-center flex-col gap-4 w-full p-2 font-[Inter] bg-zinc-50 text-zinc-950'>
      <div className='flex justify-start items-center gap-2 w-full'>
        <img src={Icon} className='size-8' />
        <h1 className='font-bold text-3xl'>SlopMuter</h1>
      </div>
      <div className='flex flex-col gap-2'>
        <h3 className='text-base font-semibold'>Current Blocklists</h3>
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
    </main>
  )
}

// Exports:
export default App
