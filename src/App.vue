<script setup lang="ts">
import { Repl } from '@vue/repl'
import { ReplStore } from './store'
import Header from './components/Header.vue'
import type { BuiltInParserName } from 'prettier'
import type { SFCOptions } from '@vue/repl'
import type { Fn } from '@vueuse/core'

const loading = ref(true)

// enable experimental features
const sfcOptions: SFCOptions = {
  script: {
    reactivityTransform: true,
  },
}

const store = new ReplStore({
  serializedState: location.hash.slice(1),
})
store.init().then(() => (loading.value = false))

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

  const [format, parserHtml, parserTypeScript, parserBabel] = await Promise.all(
    [
      import('prettier/standalone').then((r) => r.format),
      import('prettier/parser-html').then((m) => m.default),
      import('prettier/parser-typescript').then((m) => m.default),
      import('prettier/parser-babel').then((m) => m.default),
    ]
  )
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
    plugins: [parserHtml, parserTypeScript, parserBabel],
    semi: false,
    singleQuote: true,
  })
}

useDark()

// persist state
watchEffect(() => history.replaceState({}, '', store.serialize()))
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
