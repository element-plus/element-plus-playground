import transformerDirective from '@unocss/transformer-directives'
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetWind3,
} from 'unocss'

export default defineConfig({
  presets: [presetWind3(), presetAttributify(), presetIcons()],
  transformers: [transformerDirective()],
  shortcuts: {
    'color-primary': 'color-[var(--el-color-primary)]',
  },
})
