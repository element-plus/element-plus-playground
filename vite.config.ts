import fs from 'node:fs'
import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import replPkg from '@vue/repl/package.json' with { type: 'json' }
import Unocss from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import Mkcert from 'vite-plugin-mkcert'
import pkg from './package.json' with { type: 'json' }

const pathSrc = path.resolve(__dirname, 'src')

export default defineConfig({
  resolve: {
    alias: {
      '@': pathSrc,
    },
  },
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(pkg.version),
    'import.meta.env.REPL_VERSION': JSON.stringify(replPkg.version),
  },
  build: {
    rollupOptions: {
      external: ['typescript'],
    },
  },
  server: {
    host: true,
  },
  plugins: [
    {
      name: 'vue.worker',
      transform(code, id) {
        if (id.includes('vue.worker')) {
          return {
            code: patchVueWorker(code),
            map: null,
          }
        }
      },
      generateBundle(_, bundle) {
        for (const [fileName, file] of Object.entries(bundle)) {
          if (fileName.includes('vue.worker')) {
            // @ts-ignore
            file.source = patchVueWorker(file.source.toString())
            break
          }
        }
      },
    },
    vue({
      script: {
        defineModel: true,
        propsDestructure: true,
        fs: {
          fileExists: fs.existsSync,
          readFile: (file) => fs.readFileSync(file, 'utf-8'),
        },
      },
    }),
    AutoImport({
      dirs: [path.resolve(pathSrc, 'composables')],
      imports: ['vue', '@vueuse/core'],
      resolvers: [ElementPlusResolver()],
      dts: path.resolve(pathSrc, 'auto-imports.d.ts'),
    }),
    Components({
      dirs: [path.resolve(pathSrc, 'components')],
      resolvers: [ElementPlusResolver()],
      dts: path.resolve(pathSrc, 'components.d.ts'),
    }),
    Unocss(),
    Mkcert(),
    Inspect(),
  ],
  optimizeDeps: {
    exclude: ['@vue/repl'],
  },
})

function patchVueWorker(code: string) {
  return `${code}
    const pr = new URL(location.href).searchParams.get('pr')
    if (pr) {
      const _fetch = self.fetch
      self.fetch = (...args) => {
        if (typeof args[0] === 'string' && /https:\\/\\/cdn\\.jsdelivr\\.net\\/npm\\/element-plus(@[^/]+)?\\//.test(args[0])) {
          args[0] = args[0].replace(/https:\\/\\/cdn\\.jsdelivr\\.net\\/npm\\/element-plus(@[^/]+)?/, \`https://raw.esm.sh/pr/element-plus@\${pr}\`)
        }
        return _fetch(...args)
      }
    }`
}
