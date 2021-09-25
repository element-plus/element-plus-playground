export const genUnpkgLink = (
  pkg: string,
  version: string | undefined,
  path: string
) => {
  version = version ? `@${version}` : '';
  return `https://unpkg.com/${pkg}${version}${path}`;
};

export const genVueLink = (version: string) => {
  const compilerSfc = genUnpkgLink(
    '@vue/compiler-sfc',
    version,
    '/dist/compiler-sfc.esm-browser.js'
  );
  const runtimeDom = genUnpkgLink(
    '@vue/runtime-dom',
    version,
    '/dist/runtime-dom.esm-browser.js'
  );
  return {
    compilerSfc,
    runtimeDom,
  };
};

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
      'element-plus': {
        version: elementPlus,
        path: '/es',
      },
      '@vue/shared': {
        version: vue,
        path: '/dist/shared.esm-bundler.js',
      },
      'lodash/': {
        pkg: 'lodash-es',
        version: '4',
        path: '/',
      },
      '@popperjs/core': {
        version: '2',
        path: '/dist/esm',
      },
      'normalize-wheel': {
        pkg: 'normalize-wheel-es',
        version: '1.0',
        path: '/index.js',
      },
      'resize-observer-polyfill': {
        version: '1.5',
        path: '/dist/ResizeObserver.es.js',
      },
      dayjs: {
        version: '1',
        path: '/esm',
      },
      'dayjs/': {
        pkg: 'dayjs',
        version: '1',
        path: '/esm/',
      },
      mitt: {
        version: '3',
        path: '/dist/mitt.mjs',
      },
      'async-validator': {
        version: '3',
        path: '/dist-web/index.js',
      },
      '@vueuse/core': {
        version: '6.1',
        path: '/index.esm.js',
      },
      'vue-demi': {
        path: '/lib/v3/index.mjs',
      },
      '@vueuse/shared': {
        version: '6.1',
        path: '/index.esm.js',
      },
      'memoize-one': {
        path: '/dist/memoize-one.esm.js',
      },
    };

  return Object.fromEntries(
    Object.entries(deps).map(([key, dep]) => [
      key,
      genUnpkgLink(dep.pkg ?? key, dep.version, dep.path),
    ])
  );
};
