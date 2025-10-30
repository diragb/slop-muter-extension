// Packages:
import returnable from '@/utils/returnable'
import xonsole from '@/utils/xonsole'

// Typescript:
import type { Returnable } from '@/types/helpers'

export interface IAdapter {
  fetchBlocklistsMapFromRemote: {
    payload: undefined
    result: Record<string, {
      name: string
      description: string
    }>
  }
  generateAndUpdateUnifiedBlocklist: {
    payload: undefined
    result: string[]
  }
  getBlocklistPreferences: {
    payload: undefined,
    result: Returnable<{
      value: string[]
      wasNull: 'yes' | 'no'
    }, {
      value: string[]
      wasNull: 'indeterminate'
    }>
  }
  setBlocklistPreferences: {
    payload: { blocklistIDs: string[] }
    result: undefined
  }
  getBlocklistHashes: {
    payload: { blocklistIDs: string[] }
    result: Record<string, string | null>
  }
  setBlocklistHash: {
    payload: {
      blocklistID: string
      blocklist: string[]
    }
    result: undefined
  }
  getBlocklist: {
    payload: { blocklistID: string }
    result: Returnable<{
      value: string[]
      wasNull: 'yes' | 'no'
    }, {
      value: string[]
      wasNull: 'indeterminate'
    }>
  }
  setBlocklist: {
    payload: {
      blocklistID: string
      blocklist: string[]
    }
    result: undefined
  }
  getBlocklistsMap: {
    payload: undefined
    result: Returnable<{
      value: string
      wasNull: 'yes' | 'no'
    }, {
      value: string
      wasNull: 'indeterminate'
    }>
  }
  setBlocklistsMap: {
    payload: {
      blocklistsMap: Record<string, { name: string, description: string }>
    }
    result: undefined
  }
  getUnifiedBlocklist: {
    payload: undefined
    result: Returnable<{
      value: string[]
      wasNull: 'yes' | 'no'
    }, {
      value: string[]
      wasNull: 'indeterminate'
    }>
  }
  setUnifiedBlocklist: {
    payload: {
      blocklist: string[]
    }
    result: undefined
  }
  refreshUnifiedBlocklist: {
    payload: undefined
    result: undefined
  }
  getScannedTweetCount: {
    payload: undefined
    result: Returnable<{
      value: number
      wasNull: 'yes' | 'no'
    }, {
      value: number
      wasNull: 'indeterminate'
    }>
  }
  incrementScannedTweetCount: {
    payload: {
      by: number
    }
    result: undefined
  }
  refreshScannedTweetCount: {
    payload: undefined
    result: undefined
  }
  getRemovedTweetCount: {
    payload: undefined
    result: Returnable<{
      value: number
      wasNull: 'yes' | 'no'
    }, {
      value: number
      wasNull: 'indeterminate'
    }>
  }
  incrementRemovedTweetCount: {
    payload: {
      by: number
    }
    result: undefined
  }
  refreshRemovedTweetCount: {
    payload: undefined
    result: undefined
  }
}

// Constants:
import { INTERNAL_MESSAGE_ACTIONS } from '@/constants/internal-messaging'

// Classes:
class Adapter {
  public async execute<T extends keyof typeof INTERNAL_MESSAGE_ACTIONS>(
    action: T,
    payload: IAdapter[T]['payload'],
  ): Promise<Returnable<IAdapter[T]['result'], Error>> {
    try {
      const result = await new Promise<IAdapter[T]['result']>((resolve, reject) => {
        browser.runtime.sendMessage({ type: action, payload }, (response: Returnable<IAdapter[T]['result'], string>) => {
          if (browser.runtime.lastError) {
            reject(new Error(browser.runtime.lastError.message))
          } else if (response && response.status) {
            resolve(response.payload)
          } else {
            reject(new Error(response.payload))
          }
        })
      })
  
      return returnable.success(result)
    } catch (error) {
      xonsole.error('Adapter.execute', error as Error, { action, payload })
      return returnable.fail(error as Error)
    }
  }
}

// Exports:
export default Adapter
