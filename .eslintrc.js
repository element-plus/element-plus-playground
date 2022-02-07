const { defineConfig } = require('eslint-define-config')

module.exports = defineConfig({
  extends: ['@sxzz/eslint-config-vue', '@sxzz/eslint-config-prettier'],
  rules: {
    'no-alert': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'prefer-const': 'off',
    'vue/no-setup-props-destructure': 'off',
  },
})
