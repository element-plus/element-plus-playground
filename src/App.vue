<script setup lang="ts">
import { Repl } from '@vue/repl'
import { IS_DEV } from './constants'
import { genCdnLink } from './utils/dependency'

import type { UserOptions } from '@/composables/store'
import type { BuiltInParserName, format } from 'prettier'
import type { SFCOptions } from '@vue/repl'
import type { Fn } from '@vueuse/core'
import type { ImportMap } from '@/utils/import-map'
import type { default as parserHtml } from 'prettier/parser-html'
import type { default as parserTypescript } from 'prettier/parser-typescript'
import type { default as parserBabel } from 'prettier/parser-babel'
import type { default as parserPostcss } from 'prettier/parser-postcss'

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
  pr,
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
if (!store.pr && store.userOptions.value.styleSource) {
  store.pr = store.userOptions.value.styleSource.split('-', 2)[1]
}
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

let prettier:
  | [
      typeof format,
      typeof parserHtml,
      typeof parserTypescript,
      typeof parserBabel,
      typeof parserPostcss
    ]
  | undefined
const loadPrettier = async () => {
  const load = (path: string) =>
    import(/* @vite-ignore */ genCdnLink('prettier', '2', `/esm/${path}`))
  if (!prettier)
    prettier = await Promise.all([
      load('standalone.mjs').then((r) => r.default.format),
      load('parser-html.mjs').then((m) => m.default),
      load('parser-typescript.mjs').then((m) => m.default),
      load('parser-babel.mjs').then((m) => m.default),
      load('parser-postcss.mjs').then((m) => m.default),
    ])
  return prettier
}

const formatCode = async () => {
  let close: Fn | undefined
  if (!prettier) {
    ;({ close } = ElMessage.info({
      message: 'Loading Prettier...',
      duration: 0,
    }))
  }

  const [format, parserHtml, parserTypeScript, parserBabel, parserPostcss] =
    await loadPrettier()
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
  <div v-if="!loading" antialiased>
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
  height: calc(100vh - var(--nav-height));
}

.dark .vue-repl,
.vue-repl {
  --color-branding: var(--el-color-primary) !important;
}
</style>
