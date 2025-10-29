// Packages:
import { useState } from 'react'
import { cn } from '@/lib/utils'

// Assets:
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'

// Components:
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

// Functions:
const BlocklistCombobox = ({
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
  const [open, setOpen] = useState(false)

  // Return:
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='w-full justify-between cursor-pointer'
        >
          <span className='text-[13px]'>Add blocklist filters</span>
          <ChevronsUpDownIcon className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[300px] p-0 font-[Inter]'>
        <Command>
          <CommandInput className='text-[13px]' placeholder='Search blocklists...' />
          <CommandList>
            <CommandEmpty className='text-[13px] p-2'>No blocklists found.</CommandEmpty>
            <CommandGroup className='py-0'>
              <ScrollArea className='h-48'>
                {blocklists.map(blocklist => (
                  <CommandItem
                    key={blocklist.id}
                    value={blocklist.id}
                    onSelect={currentValue => {
                      if (selectedBlocklistIDs.includes(currentValue)) deleteBlocklistID(currentValue)
                      else addBlocklistID(currentValue)
                    }}
                    className='flex items-start flex-col gap-1 my-1 cursor-pointer transition-all'
                  >
                    <div className='flex items-center gap-1.5'>
                      <span className='text-[13px] font-semibold'>
                        {blocklist.name}
                      </span>
                      <CheckIcon
                        className={cn(
                          'size-4',
                          selectedBlocklistIDs.includes(blocklist.id) ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </div>
                    <div className='text-xs text-[11px]'>
                      {blocklist.description}
                    </div>
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Exports:
export default BlocklistCombobox
