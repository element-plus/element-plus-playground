import { reactive, watchEffect } from 'vue'
import { File, compileFile } from '@vue/repl'
import { genImportMap, genUnpkgLink, genVueLink } from './utils/dependency'
import { atou, utoa } from './utils/encode'
import { mergeImportMap } from './utils/import-map'
import type { OutputModes, SFCOptions, Store, StoreState } from '@vue/repl'
import type { ImportMap } from './utils/import-map'

export type VersionKey = 'vue' | 'elementPlus'
export type Versions = Record<VersionKey, string>
export type SerializeState = Record<string, string>

const defaultMainFile = 'PlaygroundMain.vue'
const defaultAppFile = 'App.vue'
const ELEMENT_PLUS_FILE = 'element-plus.js'
const mainCode = `
<script setup>
import App from './App.vue'
import { setupElementPlus } from './${ELEMENT_PLUS_FILE}'
setupElementPlus()
</script>

<template>
  <App />
</template>`.trim()
const welcomeCode = `
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
`.trim()
const ElementPlusCode = (version: string) => `
import { getCurrentInstance } from 'vue'
import ElementPlus from 'element-plus'

let installed = false
await loadStyle()

export function setupElementPlus() {
  if(installed) return
  const instance = getCurrentInstance()
  instance.appContext.app.use(ElementPlus)
  installed = true
}

export function loadStyle() {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
  	link.rel = 'stylesheet'
  	link.href = '${genUnpkgLink('element-plus', version, '/dist/index.css')}'
    link.onload = resolve
    link.onerror = reject
  	document.body.appendChild(link)
  })
}
`
const IMPORT_MAP = 'import-map.json'
const USER_IMPORT_MAP = 'imports.json'

export const isHidden = !import.meta.env.DEV

export class ReplStore implements Store {
  state: StoreState
  compiler!: typeof import('vue/compiler-sfc')
  options?: SFCOptions
  versions: Versions
  initialShowOutput = false
  initialOutputMode: OutputModes = 'preview'
  nightly = ref(false)

  private pendingCompiler: Promise<typeof import('vue/compiler-sfc')> | null =
    null

  bultinImportMap = computed<ImportMap>(() =>
    genImportMap(
      { vue: this.versions.vue, elementPlus: this.versions.elementPlus },
      this.nightly.value
    )
  )
  userImportMap = computed<ImportMap>(() => {
    const code = this.state.files[USER_IMPORT_MAP]?.code.trim()
    if (!code) return {}
    let map: ImportMap = {}
    try {
      map = JSON.parse(code)
    } catch (err) {
      console.error(err)
    }
    return map
  })
  importMap = computed<ImportMap>(() =>
    mergeImportMap(this.bultinImportMap.value, this.userImportMap.value)
  )

  constructor({
    serializedState = '',
    versions = { vue: 'latest', elementPlus: 'latest' },
  }: {
    serializedState?: string
    versions?: Versions
  }) {
    this.versions = reactive(versions)

    const files = this.initFiles(serializedState)
    this.state = reactive({
      mainFile: defaultMainFile,
      files,
      activeFile: files[defaultAppFile],
      errors: [],
      vueRuntimeURL: '',
    })

    watch(
      this.importMap,
      (content) => {
        this.state.files[IMPORT_MAP] = new File(
          IMPORT_MAP,
          JSON.stringify(content, undefined, 2),
          isHidden
        )
      },
      { immediate: true, deep: true }
    )
    watch(
      () => this.versions.elementPlus,
      (version) => {
        const file = new File(
          ELEMENT_PLUS_FILE,
          ElementPlusCode(version).trim(),
          isHidden
        )
        this.state.files[ELEMENT_PLUS_FILE] = file
        compileFile(this, file)
      },
      { immediate: true }
    )
  }

  private initFiles(serializedState: string) {
    const files: StoreState['files'] = {}
    if (serializedState) {
      const saved = this.deserialize(serializedState)
      for (const [filename, file] of Object.entries(saved)) {
        files[filename] = new File(filename, file)
      }
    } else {
      files[defaultAppFile] = new File(defaultAppFile, welcomeCode)
    }
    files[defaultMainFile] = new File(defaultMainFile, mainCode, isHidden)
    if (!files[USER_IMPORT_MAP]) {
      files[USER_IMPORT_MAP] = new File(USER_IMPORT_MAP, '')
    }
    return files
  }

  async init() {
    await this.setVueVersion(this.versions.vue)

    for (const file of Object.values(this.state.files)) {
      compileFile(this, file)
    }

    watchEffect(() => compileFile(this, this.state.activeFile))
  }

  setActive(filename: string) {
    const file = this.state.files[filename]
    if (file.hidden) return
    this.state.activeFile = this.state.files[filename]
  }

  addFile(fileOrFilename: string | File) {
    const file =
      typeof fileOrFilename === 'string'
        ? new File(fileOrFilename)
        : fileOrFilename
    this.state.files[file.filename] = file
    this.setActive(file.filename)
  }

  deleteFile(filename: string) {
    if (filename === ELEMENT_PLUS_FILE) {
      ElMessage.warning(
        'You cannot remove it, because Element Plus requires it.'
      )
      return
    }
    if (confirm(`Are you sure you want to delete ${filename}?`)) {
      if (this.state.activeFile.filename === filename) {
        this.setActive(defaultAppFile)
      }
      delete this.state.files[filename]
    }
  }

  getImportMap() {
    return this.importMap.value
  }

  serialize() {
    const state: SerializeState = Object.fromEntries(
      Object.entries(this.getFiles()).filter(
        ([filename]) => filename !== IMPORT_MAP
      )
    )
    return utoa(JSON.stringify(state))
  }

  private deserialize(text: string): SerializeState {
    const state = JSON.parse(atou(text))
    return state
  }

  private getFiles() {
    const exported: Record<string, string> = {}
    for (const file of Object.values(this.state.files)) {
      if (file.hidden) continue
      exported[file.filename] = file.code
    }
    return exported
  }

  async setVersion(key: VersionKey, version: string) {
    switch (key) {
      case 'elementPlus':
        this.setElementPlusVersion(version)
        break
      case 'vue':
        await this.setVueVersion(version)
        break
    }
  }

  setElementPlusVersion(version: string) {
    this.versions.elementPlus = version
  }

  setNightly(nightly: boolean) {
    this.nightly.value = nightly
  }

  async setVueVersion(version: string) {
    const { compilerSfc, runtimeDom } = genVueLink(version)

    this.pendingCompiler = import(/* @vite-ignore */ compilerSfc)
    this.compiler = await this.pendingCompiler
    this.pendingCompiler = null
    this.state.vueRuntimeURL = runtimeDom
    this.versions.vue = version

    // eslint-disable-next-line no-console
    console.info(`[@vue/repl] Now using Vue version: ${version}`)
  }
}
