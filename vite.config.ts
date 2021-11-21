import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import pkg from './package.json'

export default defineConfig({
  define: {
    'import.meta.env.VERSION': JSON.stringify(pkg.version),
  },
  plugins: [
    vue(),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
})
