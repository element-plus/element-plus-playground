<script setup lang="ts">
import { ref, version as vueVersion } from 'vue'
import { version as EpVersion } from 'element-plus'
import { ElementPlus } from '@element-plus/icons-vue'

const msg = ref('Hello World!')
</script>

<template>
  <h1>{{ msg }}</h1>
  <el-input v-model="msg" />

  <p>
    <el-icon color="var(--el-color-primary)"><ElementPlus /></el-icon>
    Element Plus {{ EpVersion }} + Vue {{ vueVersion }}
  </p>
</template>
