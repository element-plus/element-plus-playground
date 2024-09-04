<script setup lang="ts">
import { ElementPlus } from '@element-plus/icons-vue'
import { version as epVersion } from 'element-plus'
import { ref, version as vueVersion } from 'vue'

const msg = ref('Hello World!')
</script>

<template>
  <h1>{{ msg }}</h1>
  <el-input v-model="msg" />

  <p>
    <el-icon color="var(--el-color-primary)"><ElementPlus /></el-icon>
    Element Plus {{ epVersion }} + Vue {{ vueVersion }}
  </p>
</template>
