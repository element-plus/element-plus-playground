<script setup lang="ts">
import { Repl } from '@vue/repl'
import Header from '@/components/Header.vue'
import {
  USER_IMPORT_MAP,
  type UserOptions,
  useStore,
} from '@/composables/store'
import { IS_DEV } from './constants'
import type { BuiltInParserName } from 'prettier'
import type { SFCOptions } from '@vue/repl'
import type { Fn } from '@vueuse/core'
import type { ImportMap } from '@/utils/import-map'

let loading = $ref(true)

// enable experimental features
const sfcOptions: SFCOptions = {
  script: {
    reactivityTransform: true,
  },
}

const initialUserOptions: UserOptions = {}

const pr = new URLSearchParams(location.search).get('pr')
if (pr) {
  initialUserOptions.showHidden = true
  initialUserOptions.styleSource = `https://preview-${pr}-element-plus.surge.sh/bundle/index.css`
}

const store = useStore({
  serializedState: location.hash.slice(1),
  userOptions: initialUserOptions,
})

if (pr) {
  const map: ImportMap = {
    imports: {
      'element-plus': `https://preview-${pr}-element-plus.surge.sh/bundle/index.full.min.mjs`,
      'element-plus/': 'unsupported',
    },
  }
  store.state.files[USER_IMPORT_MAP].code = JSON.stringify(map, undefined, 2)
  const url = `${location.origin}${location.pathname}#${store.serialize()}`
  history.replaceState({}, '', url)
}

store.init().then(() => (loading = false))

// eslint-disable-next-line no-console
console.log('Store:', store)

const handleKeydown = (evt: KeyboardEvent) => {
  if ((evt.ctrlKey || evt.metaKey) && evt.code === 'KeyS') {
    evt.preventDefault()
    return
  }

  if ((evt.altKey || evt.ctrlKey) && evt.shiftKey && evt.code === 'KeyF') {
    evt.preventDefault()
    formatCode()
    return
  }
}

let loadedFormat = false
const formatCode = async () => {
  let close: Fn | undefined
  if (!loadedFormat) {
    ;({ close } = ElMessage.info({
      message: 'Loading Prettier...',
      duration: 0,
    }))
  }

  const [format, parserHtml, parserTypeScript, parserBabel, parserPostcss] =
    await Promise.all([
      import('prettier/standalone').then((r) => r.format),
      import('prettier/parser-html').then((m) => m.default),
      import('prettier/parser-typescript').then((m) => m.default),
      import('prettier/parser-babel').then((m) => m.default),
      import('prettier/parser-postcss').then((m) => m.default),
    ])
  loadedFormat = true
  close?.()

  const file = store.state.activeFile
  let parser: BuiltInParserName
  if (file.filename.endsWith('.vue')) {
    parser = 'vue'
  } else if (file.filename.endsWith('.js')) {
    parser = 'babel'
  } else if (file.filename.endsWith('.ts')) {
    parser = 'typescript'
  } else if (file.filename.endsWith('.json')) {
    parser = 'json'
  } else {
    return
  }
  file.code = format(file.code, {
    parser,
    plugins: [parserHtml, parserTypeScript, parserBabel, parserPostcss],
    semi: false,
    singleQuote: true,
  })
}

// persist state
watchEffect(() => history.replaceState({}, '', `#${store.serialize()}`))
</script>

<template>
  <div v-if="!loading" class="antialiased">
    <Header :store="store" />
    <Repl
      ref="repl"
      :store="store"
      show-compile-output
      auto-resize
      :sfc-options="sfcOptions"
      :clear-console="false"
      :show-import-map="store.userOptions.value.showHidden || IS_DEV"
      @keydown="handleKeydown"
    />
  </div>
  <template v-else>
    <div v-loading="{ text: 'Loading...' }" class="loading" />
  </template>
</template>

<style>
body {
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  margin: 0;
  --base: #444;
  --nav-height: 50px;
}

.vue-repl {
  height: calc(100vh - var(--nav-height));
}

.dark .vue-repl,
.vue-repl {
  --color-branding: #409eff !important;
}

button {
  border: none;
  outline: none;
  cursor: pointer;
  margin: 0;
  background-color: transparent;
}

.loading {
  height: 100vh;
}
</style>
