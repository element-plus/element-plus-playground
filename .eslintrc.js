/* eslint-disable @typescript-eslint/no-var-requires */
const { defineConfig } = require('eslint-define-config')

module.exports = defineConfig({
  extends: ['@sxzz/eslint-config-vue', '@sxzz/eslint-config-prettier'],
  rules: {
    'no-alert': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'vue/no-setup-props-destructure': 'off',
  },
})
