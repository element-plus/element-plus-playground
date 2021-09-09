<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { useCssVar, useDark } from '@vueuse/core';
import { Repl } from '@vue/repl';

import { ReplStore } from './store';
import Header from './components/Header.vue';

const loading = ref(true);

const store = new ReplStore({
  serializedState: location.hash.slice(1),
  vueVersion: 'latest',
});
store.init().then(() => (loading.value = false));

// persist state
watchEffect(() => history.replaceState({}, '', store.serialize()));

useDark();
useCssVar('--vh').value = window.innerHeight + `px`;
</script>

<template>
  <template v-if="!loading">
    <Header :store="store" />
    <Repl ref="repl" :store="store" show-compile-output />
  </template>
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
  height: calc(var(--vh) - var(--nav-height));
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
