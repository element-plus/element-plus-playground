import { reactive, watchEffect } from 'vue'
import { compileFile, File } from '@vue/repl'
import { genImportMap, genUnpkgLink, genVueLink } from './utils/dependency'
import { utoa, atou } from './utils/encode'
import type { Store, SFCOptions, StoreState, OutputModes } from '@vue/repl'

export type VersionKey = 'vue' | 'elementPlus'
export type Versions = Record<VersionKey, string>

const defaultMainFile = 'App.vue'
const ELEMENT_PLUS_FILE = 'element-plus.js'

const welcomeCode = `
<script setup lang="ts">
import { ref } from 'vue'
import { setupElementPlus } from './${ELEMENT_PLUS_FILE}';
import { User } from '@element-plus/icons-vue'

// setup for element plus, don't remove.
setupElementPlus();

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

await loadStyle()

export function setupElementPlus() {
  const instance = getCurrentInstance()
  instance.appContext.app.use(ElementPlus)
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

export class ReplStore implements Store {
  state: StoreState
  compiler!: typeof import('vue/compiler-sfc')
  options?: SFCOptions
  versions: Versions
  initialShowOutput = false
  initialOutputMode: OutputModes = 'preview'

  private pendingCompiler: Promise<typeof import('vue/compiler-sfc')> | null =
    null

  constructor({
    serializedState = '',
    versions = { vue: 'latest', elementPlus: 'latest' },
  }: {
    serializedState?: string
    versions?: Versions
  }) {
    let files: StoreState['files'] = {}
    if (serializedState) {
      const saved = JSON.parse(atou(serializedState))
      for (const filename of Object.keys(saved)) {
        files[filename] = new File(filename, saved[filename])
      }
    } else {
      files = {
        [defaultMainFile]: new File(defaultMainFile, welcomeCode),
      }
    }

    let mainFile = defaultMainFile
    if (!files[mainFile]) {
      mainFile = Object.keys(files)[0]
    }
    this.state = reactive({
      mainFile,
      files,
      activeFile: files[mainFile],
      errors: [],
      vueRuntimeURL: '',
    })
    this.versions = versions

    this.initImportMap()
  }

  async init() {
    await this.setVueVersion(this.versions.vue)
    this.state.files[ELEMENT_PLUS_FILE] = new File(
      ELEMENT_PLUS_FILE,
      ElementPlusCode('latest').trim(),
      true
    )

    watchEffect(() => compileFile(this, this.state.activeFile))

    for (const file of Object.keys(this.state.files)) {
      if (file !== defaultMainFile) {
        compileFile(this, this.state.files[file])
      }
    }
  }

  setActive(filename: string) {
    this.state.activeFile = this.state.files[filename]
  }

  addFile(fileOrFilename: string | File) {
    const file =
      typeof fileOrFilename === 'string'
        ? new File(fileOrFilename)
        : fileOrFilename
    this.state.files[file.filename] = file
    if (!file.hidden) this.setActive(file.filename)
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
        this.state.activeFile = this.state.files[this.state.mainFile]
      }
      delete this.state.files[filename]
    }
  }

  /**
   * remove default deps
   */
  private simplifyImportMaps() {
    const importMap = this.getImportMap()
    const depImportMap = genImportMap({})
    const depKeys = Object.keys(depImportMap)

    importMap.imports = Object.fromEntries(
      Object.entries(importMap.imports).filter(
        ([key]) => !depKeys.includes(key)
      )
    )
    return JSON.stringify(importMap)
  }

  serialize() {
    const data = JSON.stringify(
      Object.fromEntries(
        Object.entries(this.getFiles())
          .filter(([file]) => file !== ELEMENT_PLUS_FILE)
          .map(([file, content]) => {
            if (file === 'import-map.json') {
              try {
                const importMap = this.simplifyImportMaps()
                return [file, importMap]
              } catch {}
            }
            return [file, content]
          })
      )
    )

    return `#${utoa(data)}`
  }

  getFiles() {
    const exported: Record<string, string> = {}
    for (const filename of Object.keys(this.state.files)) {
      exported[filename] = this.state.files[filename].code
    }
    return exported
  }

  async setFiles(newFiles: Record<string, string>, mainFile = defaultMainFile) {
    const files: Record<string, File> = {}
    if (mainFile === defaultMainFile && !newFiles[mainFile]) {
      files[mainFile] = new File(mainFile, welcomeCode)
    }
    for (const [filename, file] of Object.entries(newFiles)) {
      files[filename] = new File(filename, file)
    }
    for (const file of Object.values(files)) {
      await compileFile(this, file)
    }
    this.state.mainFile = mainFile
    this.state.files = files
    this.initImportMap()
    this.setActive(mainFile)
  }

  private initImportMap() {
    if (!this.state.files['import-map.json']) {
      this.state.files['import-map.json'] = new File(
        'import-map.json',
        JSON.stringify({ imports: {} }, null, 2)
      )
    }
  }

  getImportMap() {
    try {
      return JSON.parse(this.state.files['import-map.json'].code)
    } catch (e) {
      this.state.errors = [
        `Syntax error in import-map.json: ${(e as Error).message}`,
      ]
      return {}
    }
  }

  setImportMap(map: {
    imports: Record<string, string>
    scopes?: Record<string, Record<string, string>>
  }) {
    this.state.files['import-map.json']!.code = JSON.stringify(map, null, 2)
  }

  private addDeps() {
    const importMap = this.getImportMap()
    importMap.imports = {
      ...importMap.imports,
      ...genImportMap({
        vue: this.versions.vue,
        elementPlus: this.versions.elementPlus,
      }),
    }
    this.setImportMap(importMap)
  }

  async setVersion(key: VersionKey, version: string) {
    switch (key) {
      case 'elementPlus':
        await this.setElementPlusVersion(version)
        break
      case 'vue':
        await this.setVueVersion(version)
        break
    }
  }

  async setElementPlusVersion(version: string) {
    this.versions.elementPlus = version
    this.addDeps()
  }

  async setVueVersion(version: string) {
    const { compilerSfc, runtimeDom } = genVueLink(version)

    this.pendingCompiler = import(/* @vite-ignore */ compilerSfc)
    this.compiler = await this.pendingCompiler
    this.pendingCompiler = null
    this.state.vueRuntimeURL = runtimeDom
    this.versions.vue = version

    this.addDeps()

    // eslint-disable-next-line no-console
    console.info(`[@vue/repl] Now using Vue version: ${version}`)
  }
}
