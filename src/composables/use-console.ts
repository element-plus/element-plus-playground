export type ConsoleLevel =
  | 'log'
  | 'info'
  | 'debug'
  | 'warn'
  | 'error'
  | 'dir'
  | 'table'
  | 'assert'
  | 'trace'
  | 'system-log'
  | 'system-warn'

export interface ConsoleLogPayload {
  level: ConsoleLevel
  args: unknown[]
}

export interface ConsoleGroupPayload {
  action: 'console_group' | 'console_group_end' | 'console_group_collapsed'
  label?: string
}

export type ConsolePayload = ConsoleLogPayload | ConsoleGroupPayload

const MAX_BUFFER = 1000

export function useConsole() {
  const logs = shallowRef<ConsolePayload[]>([])
  const buffer: ConsolePayload[] = []
  let rafId = 0

  function flush() {
    rafId = 0
    if (buffer.length > MAX_BUFFER) {
      buffer.splice(0, buffer.length - MAX_BUFFER)
    }
    logs.value = [...buffer]
  }

  function cancelPendingFlush() {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  function scheduleFlush() {
    if (!rafId) rafId = requestAnimationFrame(flush)
  }

  let lastLogPayload: ConsoleLogPayload | undefined

  const handler = (event: MessageEvent) => {
    const { data } = event
    if (!data || typeof data !== 'object') return

    if (data.action === 'console') {
      if (data.duplicate) {
        if (lastLogPayload) {
          buffer.push({
            level: lastLogPayload.level,
            args: lastLogPayload.args,
          })
          scheduleFlush()
        }
        return
      }

      if (data.level === 'clear') {
        buffer.length = 0
        cancelPendingFlush()
        logs.value = []
        lastLogPayload = undefined
        return
      }

      const payload: ConsoleLogPayload = { level: data.level, args: data.args }
      lastLogPayload = payload
      buffer.push(payload)
      scheduleFlush()
    } else if (
      data.action === 'console_group' ||
      data.action === 'console_group_end' ||
      data.action === 'console_group_collapsed'
    ) {
      buffer.push({
        action: data.action,
        label: data.label,
      })
      scheduleFlush()
    }
  }

  window.addEventListener('message', handler)

  const clearLogs = () => {
    buffer.length = 0
    cancelPendingFlush()
    logs.value = []
  }

  tryOnScopeDispose(() => {
    window.removeEventListener('message', handler)
    cancelPendingFlush()
  })

  return { logs, clearLogs }
}
