// Classes:
class xonsole {
  static error(caller: string, error: Error, payload: Record<string, any>, action = 'call') {
    const timestamp = new Date().toISOString()
    const actionStyle = 'color: #d946ef; font-style: italic;'
    const callerStyle = 'color: #4f46e5; font-weight: bold;'
    const payloadStyle = 'font-family: monospace, monospace;'

    console.group(`ERROR at ${caller}`)
    console.error(
      `🚨 [${timestamp}] Encountered an error while attempting to %c${action}%c %c${caller}%c with payload %c${JSON.stringify(payload)}%c:`,
      actionStyle,
      '',
      callerStyle,
      '',
      payloadStyle,
      '',
    )
    console.error(error)
    console.groupEnd()
  }

  static warn(caller: string, error: Error, payload: Record<string, any>, action = 'call') {
    const timestamp = new Date().toISOString()
    const actionStyle = 'color: #d946ef; font-style: italic;'
    const callerStyle = 'color: #4f46e5; font-weight: bold;'
    const payloadStyle = 'font-family: monospace, monospace;'

    console.group(`ERROR at ${caller}`)
    console.warn(
      `🚨 [${timestamp}] Encountered an error while attempting to %c${action}%c %c${caller}%c with payload %c${JSON.stringify(payload)}%c:`,
      actionStyle,
      '',
      callerStyle,
      '',
      payloadStyle,
      '',
    )
    console.warn(error)
    console.groupEnd()
  }
}

// Exports:
export default xonsole
