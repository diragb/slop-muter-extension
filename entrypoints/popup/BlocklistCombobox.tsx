// Packages:
import { useState } from 'react'
import { cn } from '@/lib/utils'

// Assets:
import { CheckIcon, SearchIcon } from 'lucide-react'

// Components:
import { ScrollArea } from '@/components/ui/scroll-area'

// Functions:
const BlocklistList = ({
  blocklists,
  selectedBlocklistIDs,
  deleteBlocklistID,
  addBlocklistID,
}: {
  blocklists: Array<{ id: string, name: string, description: string }>
  selectedBlocklistIDs: string[]
  deleteBlocklistID: (blocklistID: string) => void
  addBlocklistID: (blocklistID: string) => void
}) => {
  // State:
  const [search, setSearch] = useState('')

  // Constants:
  const filtered = blocklists.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.description.toLowerCase().includes(search.toLowerCase())
  )

  // Return:
  return (
    <div className='flex flex-col gap-2'>
      {/* Search input */}
      <div className='relative'>
        <SearchIcon className='absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400 pointer-events-none' />
        <input
          type='text'
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='Search blocklists...'
          className='w-full h-8 pl-8 pr-3 text-[13px] text-neutral-700 placeholder:text-neutral-400 bg-white border border-neutral-200 rounded-lg outline-none transition-colors focus:border-neutral-300 focus:ring-1 focus:ring-neutral-200'
        />
      </div>

      {/* Blocklist items */}
      <ScrollArea className='h-61'>
        <div className='flex flex-col gap-0.5'>
          {filtered.length === 0 && (
            <p className='py-3 text-center text-[13px] text-neutral-400'>No blocklists found.</p>
          )}
          {filtered.map(blocklist => {
            const isSelected = selectedBlocklistIDs.includes(blocklist.id)
            return (
              <button
                key={blocklist.id}
                type='button'
                onClick={() => {
                  if (isSelected) deleteBlocklistID(blocklist.id)
                  else addBlocklistID(blocklist.id)
                }}
                className='flex items-start gap-2.5 w-full px-2.5 py-2 text-left rounded-lg cursor-pointer transition-colors hover:bg-neutral-50'
              >
                <div className={cn(
                  'flex items-center justify-center size-4 mt-0.5 rounded border shrink-0 transition-colors',
                  isSelected
                    ? 'bg-neutral-950 border-neutral-950'
                    : 'bg-white border-neutral-300',
                )}>
                  {isSelected && <CheckIcon className='size-3 text-white' />}
                </div>
                <div className='flex flex-col gap-0.5 min-w-0'>
                  <span className='text-[13px] font-medium text-neutral-950 leading-tight'>
                    {blocklist.name}
                  </span>
                  <span className='text-[11px] leading-relaxed text-neutral-500'>
                    {blocklist.description}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

// Exports:
export default BlocklistList
