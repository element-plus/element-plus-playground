<script setup lang="ts">
import { ref } from 'vue'
import { User } from '@element-plus/icons-vue'

const msg = ref('Hello World!')
</script>

<template>
  <!-- Element Plus icons -->
  <el-icon><User /></el-icon>

  <h1>{{ msg }}</h1>
  <el-input v-model="msg" />
</template>
