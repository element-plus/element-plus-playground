<script setup lang="ts">
import { cdn } from '@/utils/dependency'
</script>

<template>
  <el-form>
    <el-form-item label="CDN">
      <el-select v-model="cdn" w-full>
        <el-option value="jsdelivr" label="jsDelivr" />
        <el-option value="jsdelivr-fastly" label="jsDelivr Fastly" />
        <el-option value="unpkg" label="unpkg" />
      </el-select>
    </el-form-item>
  </el-form>
</template>
