const { defineConfig } = require('eslint-define-config')

module.exports = defineConfig({
  extends: ['@sxzz/eslint-config-vue', '@sxzz/eslint-config-prettier'],
  rules: {
    'no-alert': 'off',
    'import/namespace': 'off',
    'import/default': 'off',
  },
})
