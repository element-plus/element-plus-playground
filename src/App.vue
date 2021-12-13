<script setup lang="ts">
import { Repl } from '@vue/repl'
import { ReplStore } from './store'
import Header from './components/Header.vue'
import type {
  SFCScriptCompileOptions,
  SFCAsyncStyleCompileOptions,
  SFCTemplateCompileOptions,
} from 'vue/compiler-sfc'

const loading = ref(true)

// enable experimental features
interface SFCOptions {
  script?: Omit<SFCScriptCompileOptions, 'id'>
  style?: SFCAsyncStyleCompileOptions
  template?: SFCTemplateCompileOptions
}
const sfcOptions: SFCOptions = {
  script: {
    reactivityTransform: true,
  },
}

const store = new ReplStore({
  serializedState: location.hash.slice(1),
})
store.init().then(() => (loading.value = false))

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
      @keydown.ctrl.s.prevent
      @keydown.meta.s.prevent
    />
  </div>
  <template v-else>
    <div v-loading="true" class="loading" element-loading-text="Loading..." />
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
