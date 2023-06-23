import { File, type Store, type StoreState, compileFile } from '@vue/repl'
import { atou, utoa } from '@/utils/encode'
import { genCdnLink, genImportMap, genVueLink } from '@/utils/dependency'
import { type ImportMap, mergeImportMap } from '@/utils/import-map'
import { IS_DEV } from '@/constants'
import mainCode from '../template/main.vue?raw'
import welcomeCode from '../template/welcome.vue?raw'
import elementPlusCode from '../template/element-plus.js?raw'

export interface Initial {
  serializedState?: string
  versions?: Versions
  userOptions?: UserOptions
  pr?: string | null
}
export type VersionKey = 'vue' | 'elementPlus'
export type Versions = Record<VersionKey, string>
export interface UserOptions {
  styleSource?: string
  showHidden?: boolean
}
export type SerializeState = Record<string, string> & {
  _o?: UserOptions
}

const MAIN_FILE = 'src/PlaygroundMain.vue'
const APP_FILE = 'src/App.vue'
const ELEMENT_PLUS_FILE = 'src/element-plus.js'
const IMPORT_MAP = 'import-map.json'
export const USER_IMPORT_MAP = 'src/import_map.json'

export const useStore = (initial: Initial) => {
  const versions = reactive(
    initial.versions || { vue: 'latest', elementPlus: 'latest' }
  )

  const compiler = shallowRef<typeof import('vue/compiler-sfc')>()
  const [nightly, toggleNightly] = useToggle(false)
  const userOptions = ref<UserOptions>(initial.userOptions || {})
  const hideFile = computed(() => !IS_DEV && !userOptions.value.showHidden)

  const _files = initFiles(initial.serializedState || '')

  let activeFile = _files[APP_FILE]
  if (!activeFile) activeFile = Object.values(_files)[0]

  const state = reactive<StoreState>({
    mainFile: MAIN_FILE,
    files: _files,
    activeFile,
    errors: [],
    vueRuntimeURL: '',
    vueServerRendererURL: '',
    resetFlip: false,
  })

  const bultinImportMap = computed<ImportMap>(() =>
    genImportMap(versions, nightly.value)
  )
  const userImportMap = computed<ImportMap>(() => {
    const code = state.files[USER_IMPORT_MAP]?.code.trim()
    if (!code) return {}
    let map: ImportMap = {}
    try {
      map = JSON.parse(code)
    } catch (err) {
      console.error(err)
    }
    return map
  })
  const importMap = computed<ImportMap>(() =>
    mergeImportMap(bultinImportMap.value, userImportMap.value)
  )

  // eslint-disable-next-line no-console
  console.log('Files:', state.files, 'Options:', userOptions)

  const store: Store = reactive({
    init,
    state,
    compiler: compiler as any,
    setActive,
    addFile,
    deleteFile,
    getImportMap,
    initialShowOutput: false,
    initialOutputMode: 'preview',
    renameFile,
  })

  watch(
    importMap,
    (content) => {
      state.files[IMPORT_MAP] = new File(
        IMPORT_MAP,
        JSON.stringify(content, undefined, 2),
        hideFile.value
      )
    },
    { immediate: true, deep: true }
  )
  watch(
    () => versions.elementPlus,
    (version) => {
      const file = new File(
        ELEMENT_PLUS_FILE,
        generateElementPlusCode(version, userOptions.value.styleSource).trim(),
        hideFile.value
      )
      state.files[ELEMENT_PLUS_FILE] = file
      compileFile(store, file)
    },
    { immediate: true }
  )

  function generateElementPlusCode(version: string, styleSource?: string) {
    const style = styleSource
      ? styleSource.replace('#VERSION#', version)
      : genCdnLink(
          nightly ? '@element-plus/nightly' : 'element-plus',
          version,
          '/dist/index.css'
        )
    return elementPlusCode.replace('#STYLE#', style)
  }

  async function setVueVersion(version: string) {
    const { compilerSfc, runtimeDom } = genVueLink(version)

    compiler.value = await import(/* @vite-ignore */ compilerSfc)
    state.vueRuntimeURL = runtimeDom
    versions.vue = version

    // eslint-disable-next-line no-console
    console.info(`[@vue/repl] Now using Vue version: ${version}`)
  }

  async function init() {
    await setVueVersion(versions.vue)

    for (const file of Object.values(state.files)) {
      compileFile(store, file)
    }

    watchEffect(() => compileFile(store, state.activeFile))
  }

  function getFiles() {
    const exported: Record<string, string> = {}
    for (const file of Object.values(state.files)) {
      if (file.hidden) continue
      exported[file.filename] = file.code
    }
    return exported
  }

  function serialize() {
    const state: SerializeState = { ...getFiles() }
    state._o = userOptions.value
    return utoa(JSON.stringify(state))
  }
  function deserialize(text: string): SerializeState {
    const state = JSON.parse(atou(text))
    return state
  }

  function initFiles(serializedState: string) {
    const files: StoreState['files'] = {}
    if (serializedState) {
      const saved = deserialize(serializedState)
      for (let [filename, file] of Object.entries(saved)) {
        if (filename === '_o') continue
        if (!filename.startsWith('src/') && filename !== IMPORT_MAP) {
          filename = `src/${filename}`
        }
        files[filename] = new File(filename, file as string)
      }
      userOptions.value = saved._o || {}
    } else {
      files[APP_FILE] = new File(APP_FILE, welcomeCode)
    }
    files[MAIN_FILE] = new File(MAIN_FILE, mainCode, hideFile.value)
    if (!files[USER_IMPORT_MAP]) {
      files[USER_IMPORT_MAP] = new File(
        USER_IMPORT_MAP,
        JSON.stringify({ imports: {} }, undefined, 2)
      )
    }
    return files
  }

  function setActive(filename: string) {
    const file = state.files[filename]
    if (file.hidden) return
    state.activeFile = state.files[filename]
  }

  function addFile(fileOrFilename: string | File) {
    const file =
      typeof fileOrFilename === 'string'
        ? new File(fileOrFilename)
        : fileOrFilename
    state.files[file.filename] = file
    setActive(file.filename)
  }

  function renameFile(oldFilename: string, newFilename: string) {
    const file = state.files[oldFilename]

    if (!file) {
      state.errors = [`Could not rename "${oldFilename}", file not found`]
      return
    }

    if (!newFilename || oldFilename === newFilename) {
      state.errors = [`Cannot rename "${oldFilename}" to "${newFilename}"`]
      return
    }

    if (
      file.hidden ||
      [APP_FILE, MAIN_FILE, ELEMENT_PLUS_FILE, USER_IMPORT_MAP].includes(
        oldFilename
      )
    ) {
      state.errors = [`Cannot rename ${oldFilename}`]
      return
    }

    file.filename = newFilename

    const newFiles: Record<string, File> = {}

    // Preserve iteration order for files
    for (const name of Object.keys(_files)) {
      if (name === oldFilename) {
        newFiles[newFilename] = file
      } else {
        newFiles[name] = _files[name]
      }
    }

    state.files = newFiles
    compileFile(store, file)
  }

  async function deleteFile(filename: string) {
    if (
      [
        ELEMENT_PLUS_FILE,
        MAIN_FILE,
        APP_FILE,
        ELEMENT_PLUS_FILE,
        IMPORT_MAP,
        USER_IMPORT_MAP,
      ].includes(filename)
    ) {
      ElMessage.warning(
        'You cannot remove it, because Element Plus requires it.'
      )
      return
    }

    if (
      await ElMessageBox.confirm(
        `Are you sure you want to delete ${filename}?`,
        {
          title: 'Delete File',
          type: 'warning',
          center: true,
        }
      )
    ) {
      if (state.activeFile.filename === filename) {
        setActive(APP_FILE)
      }
      delete state.files[filename]
    }
  }

  function getImportMap() {
    return importMap.value
  }

  async function setVersion(key: VersionKey, version: string) {
    switch (key) {
      case 'elementPlus':
        setElementPlusVersion(version)
        break
      case 'vue':
        await setVueVersion(version)
        break
    }
  }

  function setElementPlusVersion(version: string) {
    versions.elementPlus = version
  }

  watch(
    () => state.files[IMPORT_MAP].code,
    () => {
      state.resetFlip = !state.resetFlip
    }
  )

  return {
    ...store,

    versions,
    nightly,
    userOptions,

    init,
    serialize,
    setVersion,
    toggleNightly,
    pr: initial.pr,
  }
}

export type ReplStore = ReturnType<typeof useStore>
