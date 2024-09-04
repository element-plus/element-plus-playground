import { createApp } from 'vue'
import App from '@/App.vue'
import '@unocss/reset/tailwind.css'
import '@vue/repl/style.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'uno.css'

// @ts-expect-error Custom window property
window.VUE_DEVTOOLS_CONFIG = {
  defaultSelectedAppId: 'repl',
}

createApp(App).mount('#app')
