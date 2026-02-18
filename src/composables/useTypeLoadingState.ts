type Status = 'initializing' | 'loading' | 'ready'

export function useTypeLoadingState() {
  const status = ref<Status | null>('initializing')
  let idleTimer: ReturnType<typeof setTimeout> | undefined
  let hideTimer: ReturnType<typeof setTimeout> | undefined

  const bc = new BroadcastChannel('vue-repl-dts')
  bc.onmessage = (e: MessageEvent<{ pending: number }>) => {
    if (e.data.pending > 0) {
      status.value = 'loading'
      clearTimeout(idleTimer)
      clearTimeout(hideTimer)
    } else {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        status.value = 'ready'
        hideTimer = setTimeout(() => (status.value = null), 3000)
      }, 2000)
    }
  }

  tryOnScopeDispose(() => {
    bc.close()
    clearTimeout(idleTimer)
    clearTimeout(hideTimer)
  })

  return status
}
