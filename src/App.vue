<!-- eslint-disable no-useless-escape -->
<script setup lang="ts">
import { Repl } from '@vue/repl'
import Monaco from '@vue/repl/monaco-editor'
import { useStore } from './composables/store'

const loading = ref(true)
const replRef = ref<InstanceType<typeof Repl>>()

const AUTO_SAVE_KEY = 'auto-save-state'
function getAutoSaveState() {
  return JSON.parse(localStorage.getItem(AUTO_SAVE_KEY) || 'true')
}
function setAutoSaveState(value: boolean) {
  localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(value))
}

const autoSave = ref(getAutoSaveState())

const previewOptions = {
  headHTML: `
    <script src="https://cdn.jsdelivr.net/npm/@unocss/runtime"><\/script>
    <script>
      window.__unocss = {
        rules: [],
        presets: [],
      }
    <\/script>
  `,
}

const dark = useDark()

const theme = new URLSearchParams(location.search).get('theme')
if (theme === 'dark') {
  dark.value = true
}

const store = useStore({
  serializedState: location.hash.slice(1),
  initialized: () => {
    loading.value = false
  },
})

// eslint-disable-next-line no-console
console.log('Store:', store)

const handleKeydown = (evt: KeyboardEvent) => {
  if ((evt.ctrlKey || evt.metaKey) && evt.code === 'KeyS') {
    evt.preventDefault()
    return
  }
}

// persist state
watchEffect(() =>
  history.replaceState(
    {},
    '',
    `${location.origin}${location.pathname}#${store.serialize()}`,
  ),
)

const refreshPreview = () => {
  replRef.value?.reload()
}

watch(autoSave, setAutoSaveState)
</script>

<template>
  <div v-if="!loading" antialiased>
    <Header :store="store" @refresh="refreshPreview" />
    <Repl
      v-model="autoSave"
      ref="replRef"
      :theme="dark ? 'dark' : 'light'"
      :preview-theme="true"
      :store="store"
      :editor="Monaco"
      :preview-options="previewOptions"
      :clear-console="false"
      @keydown="handleKeydown"
    />
  </div>
  <template v-else>
    <div v-loading="{ text: 'Loading...' }" h-100vh />
  </template>
</template>

<style>
body {
  --at-apply: m-none text-13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  --base: #444;
  --nav-height: 50px;
}

.vue-repl {
  height: calc(100vh - var(--nav-height)) !important;
}

.dark .vue-repl,
.vue-repl {
  --color-branding: var(--el-color-primary) !important;
}

.dark body {
  background-color: #1a1a1a;
}
</style>
