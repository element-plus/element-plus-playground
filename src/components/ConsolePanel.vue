<script setup lang="ts">
import LunaConsole from 'luna-console'
import 'luna-object-viewer/luna-object-viewer.css'
import 'luna-data-grid/luna-data-grid.css'
import 'luna-console/luna-console.css'

import type {
  ConsoleGroupPayload,
  ConsolePayload,
} from '@/composables/use-console'

const HEADER_HEIGHT = 30
const MIN_HEIGHT = 100
const MAX_HEIGHT = 600

const props = defineProps<{
  logs: ConsolePayload[]
  height: number
}>()

const emit = defineEmits<{
  (e: 'update:height', value: number): void
  (e: 'clear'): void
}>()

const dark = useDark()

const collapsed = ref(false)
const containerRef = ref<HTMLElement>()
const panelRef = ref<HTMLElement>()

let startY = 0
let startHeight = 0
let lunaConsole: LunaConsole | undefined
let processedCount = 0
let heightBeforeCollapse = props.height

const clampedHeight = computed(() =>
  Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, props.height)),
)

const panelHeight = computed(() =>
  collapsed.value ? HEADER_HEIGHT : clampedHeight.value,
)

watch(dark, (isDark) => {
  lunaConsole?.setOption('theme', isDark ? 'dark' : 'light')
})

watch(
  () => props.logs,
  (newLogs) => {
    if (!lunaConsole) return

    if (newLogs.length < processedCount) {
      lunaConsole.clear(true)
      processedCount = 0
    }

    for (let i = processedCount; i < newLogs.length; i++) {
      const payload = newLogs[i]

      if (isGroupPayload(payload)) {
        switch (payload.action) {
          case 'console_group':
            lunaConsole.group(payload.label ?? 'console.group')
            break
          case 'console_group_collapsed':
            lunaConsole.groupCollapsed(payload.label ?? 'console.group')
            break
          case 'console_group_end':
            lunaConsole.groupEnd()
            break
        }
      } else {
        const { level, args } = payload
        switch (level) {
          case 'log':
          case 'info':
          case 'error':
          case 'table':
            lunaConsole[level](...args)
            break
          case 'debug':
            lunaConsole.debug(...args)
            break
          case 'warn':
          case 'system-warn':
            lunaConsole.warn(...args)
            break
          case 'dir':
            lunaConsole.dir(args[0])
            break
          case 'system-log':
            lunaConsole.log(...args)
            break
          case 'assert':
            lunaConsole.error('Assertion failed:', ...args)
            break
          case 'trace':
            lunaConsole.log(...args)
            break
          default:
            lunaConsole.log(...args)
        }
      }
    }

    processedCount = newLogs.length
  },
)

function isGroupPayload(p: ConsolePayload): p is ConsoleGroupPayload {
  return 'action' in p
}

function toggleCollapsed() {
  if (collapsed.value) {
    collapsed.value = false
    emit('update:height', Math.max(MIN_HEIGHT, heightBeforeCollapse))
  } else {
    heightBeforeCollapse = clampedHeight.value
    collapsed.value = true
  }
}

function clearConsole() {
  lunaConsole?.clear(true)
  processedCount = 0
  emit('clear')
}

function onDragStart(e: PointerEvent) {
  e.preventDefault()
  startY = e.clientY
  startHeight = collapsed.value ? HEADER_HEIGHT : clampedHeight.value
  document.body.classList.add('console-resizing')
  document.addEventListener('pointermove', onDragMove)
  document.addEventListener('pointerup', onDragEnd)
  document.addEventListener('pointercancel', onDragEnd)
}

function onDragMove(e: PointerEvent) {
  if (!panelRef.value) return
  const rawH = startHeight + startY - e.clientY

  if (rawH < MIN_HEIGHT) {
    collapsed.value = true
    panelRef.value.style.height = `${HEADER_HEIGHT}px`
  } else {
    collapsed.value = false
    panelRef.value.style.height = `${Math.min(MAX_HEIGHT, rawH)}px`
  }
}

function onDragEnd() {
  document.body.classList.remove('console-resizing')
  if (panelRef.value && !collapsed.value) {
    const h = Number.parseInt(panelRef.value.style.height, 10)
    heightBeforeCollapse = h
    emit('update:height', h)
  }
  document.removeEventListener('pointermove', onDragMove)
  document.removeEventListener('pointerup', onDragEnd)
  document.removeEventListener('pointercancel', onDragEnd)
}

onMounted(() => {
  if (!containerRef.value) return
  lunaConsole = new LunaConsole(containerRef.value, {
    theme: dark.value ? 'dark' : 'light',
    maxNum: 10_000,
    asyncRender: true,
    accessGetter: true,
    unenumerable: true,
    lazyEvaluation: true,
  })

  if (clampedHeight.value !== props.height) {
    emit('update:height', clampedHeight.value)
  }
})

onBeforeUnmount(() => {
  lunaConsole?.destroy()
  document.removeEventListener('pointermove', onDragMove)
  document.removeEventListener('pointerup', onDragEnd)
  document.removeEventListener('pointercancel', onDragEnd)
})
</script>

<template>
  <div
    ref="panelRef"
    class="console-panel"
    :style="{ height: `${panelHeight}px` }"
  >
    <div class="console-header" @pointerdown="onDragStart">
      <span class="console-title">Console</span>
      <div class="console-actions">
        <el-button
          v-show="!collapsed"
          text
          type="info"
          size="small"
          @click.stop="clearConsole"
        >
          Clear console
        </el-button>
        <button
          class="console-toggle-btn"
          :title="collapsed ? 'Expand console' : 'Collapse console'"
          @click.stop="toggleCollapsed"
        >
          <div
            :class="
              collapsed ? 'i-ri-arrow-up-s-line' : 'i-ri-arrow-down-s-line'
            "
          />
        </button>
      </div>
    </div>
    <div v-show="!collapsed" ref="containerRef" class="console-output" />
  </div>
</template>

<style lang="scss">
.console-panel {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--border);
  background-color: var(--bg);
  overflow: hidden;
}

.console-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 8px;
  border-bottom: 1px solid var(--border);
  cursor: ns-resize;
  user-select: none;
  touch-action: none;
  flex-shrink: 0;
}

.console-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-light);
}

.console-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.console-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-light);
  cursor: pointer;
  font-size: 16px;

  &:hover {
    background-color: var(--border);
  }
}

.console-output {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.luna-console-theme-dark {
  background-color: var(--bg);
}

body.console-resizing {
  cursor: ns-resize;
  user-select: none;
}

body.console-resizing iframe {
  pointer-events: none;
}
</style>
