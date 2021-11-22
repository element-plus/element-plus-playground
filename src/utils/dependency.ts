export const genUnpkgLink = (
  pkg: string,
  version: string | undefined,
  path: string
) => {
  version = version ? `@${version}` : ''
  return `https://unpkg.com/${pkg}${version}${path}`
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

export const genImportMap = ({
  vue,
  elementPlus,
}: Partial<Record<'vue' | 'elementPlus', string>> = {}) => {
  const deps: Record<string, { pkg?: string; version?: string; path: string }> =
    {
      vue: {
        pkg: '@vue/runtime-dom',
        version: vue,
        path: '/dist/runtime-dom.esm-browser.js',
      },
      '@vue/shared': {
        version: vue,
        path: '/dist/shared.esm-bundler.js',
      },
      'element-plus': {
        version: elementPlus,
        path: '/dist/index.full.mjs',
      },
      '@element-plus/icons': {
        path: '/es/index.js',
      },
    }

  return Object.fromEntries(
    Object.entries(deps).map(([key, dep]) => [
      key,
      genUnpkgLink(dep.pkg ?? key, dep.version, dep.path),
    ])
  )
}
