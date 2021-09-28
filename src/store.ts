import { reactive, watchEffect } from 'vue'
import { compileFile, MAIN_FILE } from './transform'
import { genImportMap, genUnpkgLink, genVueLink } from './utils/dependency'
import { utoa, atou } from './utils/encode'

const ELEMENT_PLUS_FILE = 'element-plus.js'

const welcomeCode = `
<script setup>
import { ref } from 'vue'
import { setupElementPlus } from './${ELEMENT_PLUS_FILE}';
import { ElInput } from 'element-plus'

setupElementPlus();
const msg = ref('Hello World!')
</script>

<template>
  <h1>{{ msg }}</h1>
  <el-input v-model="msg" />
</template>
`.trim()

const ElementPlusCode = (version: string) => `
// ⛔️ ⛔️ ⛔️
// DO NOT MODIFY THIS FILE! THIS FILE WILL BE RESTORED WHEN SHARING.
// 不要修改此文件！该文件在共享时被还原。
// このファイルは変更しないでください。このファイルは、共有時に復元されます。
// NE MODIFIEZ PAS CE FICHIER !

import { getCurrentInstance } from 'vue'
import ElementPlus from 'element-plus'

export function setupElementPlus() {
  const instance = getCurrentInstance()
  instance.appContext.app.use(ElementPlus)
  loadStyle();
}

export function loadStyle() {
  const link = document.createElement('link')
	link.rel = 'stylesheet'
	link.href = '${genUnpkgLink('element-plus', version, '/dist/index.css')}'
	document.body.appendChild(link)
}
`

export class File {
  filename: string
  code: string
  compiled = {
    js: '',
    css: '',
    ssr: '',
  }

  constructor(filename: string, code = '') {
    this.filename = filename
    this.code = code
  }
}

export interface StoreState {
  files: Record<string, File>
  activeFilename: string
  errors: (string | Error)[]
  vueRuntimeURL: string
}

export class ReplStore {
  state: StoreState
  compiler: unknown
  pendingCompiler: Promise<any> | null = null
  vueVersion: string
  elementPlusVersion: string

  constructor({
    serializedState = '',
    vueVersion = 'latest',
    elementPlusVersion = 'latest',
  }: {
    serializedState?: string
    vueVersion?: string
    elementPlusVersion?: string
  }) {
    let files: StoreState['files'] = {}
    if (serializedState) {
      const saved = JSON.parse(atou(serializedState))
      for (const filename in saved) {
        files[filename] = new File(filename, saved[filename])
      }
    } else {
      files = {
        'App.vue': new File(MAIN_FILE, welcomeCode),
      }
    }

    this.state = reactive({
      files,
      activeFilename: MAIN_FILE,
      errors: [],
      vueRuntimeURL: '',
    })
    this.vueVersion = vueVersion
    this.elementPlusVersion = elementPlusVersion

    this.initImportMap()
  }

  async init() {
    await this.setVueVersion(this.vueVersion)
    this.state.files[ELEMENT_PLUS_FILE] = new File(
      ELEMENT_PLUS_FILE,
      ElementPlusCode('latest').trim()
    )

    for (const file in this.state.files) {
      if (file !== MAIN_FILE) {
        compileFile(this, this.state.files[file])
      }
    }

    watchEffect(() => compileFile(this, this.activeFile))
  }

  get activeFile() {
    return this.state.files[this.state.activeFilename]
  }

  setActive(filename: string) {
    this.state.activeFilename = filename
  }

  addFile(filename: string) {
    this.state.files[filename] = new File(filename)
    this.setActive(filename)
  }

  deleteFile(filename: string) {
    if (confirm(`Are you sure you want to delete ${filename}?`)) {
      if (this.state.activeFilename === filename) {
        this.state.activeFilename = MAIN_FILE
      }
      delete this.state.files[filename]
    }
  }

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
    for (const filename in this.state.files) {
      exported[filename] = this.state.files[filename].code
    }
    return exported
  }

  setFiles(newFiles: Record<string, string>) {
    const files: Record<string, File> = {}
    for (const filename in newFiles) {
      files[filename] = new File(filename, newFiles[filename])
    }
    this.state.files = files
    this.initImportMap()
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
        vue: this.vueVersion,
        elementPlus: this.elementPlusVersion,
      }),
    }
    this.setImportMap(importMap)
  }

  async setElementPlusVersion(version: string) {
    this.elementPlusVersion = version
    this.addDeps()
  }

  async setVueVersion(version: string) {
    const { compilerSfc, runtimeDom } = genVueLink(version)

    this.pendingCompiler = import(/* @vite-ignore */ compilerSfc)
    this.compiler = await this.pendingCompiler
    this.pendingCompiler = null
    this.state.vueRuntimeURL = runtimeDom
    this.vueVersion = version

    this.addDeps()

    console.info(`[@vue/repl] Now using Vue version: ${version}`)
  }
}
