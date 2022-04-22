import { getCurrentInstance } from 'vue'
import ElementPlus from 'element-plus'

let installed = false
await loadStyle()

export function setupElementPlus() {
  if (installed) return
  const instance = getCurrentInstance()
  instance.appContext.app.use(ElementPlus)
  installed = true
}

export function loadStyle() {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '#STYLE#'
    link.addEventListener('load', resolve)
    link.addEventListener('error', reject)
    document.body.append(link)
  })
}
