// Packages:
import returnable from '@/utils/returnable'
import xonsole from '@/utils/xonsole'

// Typescript:
import type { Returnable } from '@/types/helpers'

export interface IAdapter {
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
    result: Map<string, string | null>
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
