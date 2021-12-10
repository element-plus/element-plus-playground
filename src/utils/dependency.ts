import { compare } from 'compare-versions'
import type { Versions } from 'src/store'
import type { Ref } from 'vue'

export const genUnpkgLink = (
  pkg: string,
  version: string | undefined,
  path: string
) => {
  version = version ? `@${version}` : ''
  return `https://unpkg.com/${pkg}${version}${path}`
}

export const genJsdelivrLink = (
  pkg: string,
  version: string | undefined,
  path: string
) => {
  version = version ? `@${version}` : ''
  return `https://cdn.jsdelivr.net/npm/${pkg}${version}${path}`
}

export const genVueLink = (version: string) => {
  const compilerSfc = genUnpkgLink(
    '@vue/compiler-sfc',
    version,
    '/dist/compiler-sfc.esm-browser.js'
  )
  const runtimeDom = genUnpkgLink(
    '@vue/runtime-dom',
    version,
    '/dist/runtime-dom.esm-browser.js'
  )
  return {
    compilerSfc,
    runtimeDom,
  }
}

export const genImportMap = ({ vue, elementPlus }: Partial<Versions> = {}) => {
  interface Dependency {
    pkg?: string
    version?: string
    path: string
    source?: 'unpkg' | 'jsdelivr'
  }
  const deps: Record<string, Dependency> = {
    vue: {
      pkg: '@vue/runtime-dom',
      version: vue,
      path: '/dist/runtime-dom.esm-browser.js',
      source: 'jsdelivr',
    },
    '@vue/shared': {
      version: vue,
      path: '/dist/shared.esm-bundler.js',
      source: 'jsdelivr',
    },
    'element-plus': {
      version: elementPlus,
      path: '/dist/index.full.mjs',
      source: 'jsdelivr',
    },
    '@element-plus/icons-vue': {
      path: '/es/index.js',
    },
  }

  return Object.fromEntries(
    Object.entries(deps).map(([key, dep]) => [
      key,
      (dep.source === 'unpkg' ? genUnpkgLink : genJsdelivrLink)(
        dep.pkg ?? key,
        dep.version,
        dep.path
      ),
    ])
  )
}

export const getVersions = (pkg: string) =>
  useFetch(`https://data.jsdelivr.com/v1/package/npm/${pkg}`, {
    initialData: [],
    afterFetch: (ctx) => ((ctx.data = ctx.data.versions), ctx),
  }).json<string[]>().data as Ref<string[]>

export const getSupportedVueVersions = () => {
  let versions = $(getVersions('vue'))
  return computed(() =>
    versions.filter((version) => compare(version, '3.2.0', '>='))
  )
}

export const getSupportedEpVersions = () => {
  let versions = $(getVersions('element-plus'))
  return computed(() =>
    versions.filter((version) => compare(version, '1.1.0-beta.18', '>='))
  )
}
