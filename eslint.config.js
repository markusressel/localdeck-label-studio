import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  { ignores: ['dist/**', 'coverage/**'] },
  js.configs.recommended,
  // Correctness rules only; formatting is left to the editor
  ...pluginVue.configs['flat/essential'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'vue/multi-word-component-names': 'off',
      // LabelEditor/LabelPreview edit the store's label objects in place on purpose;
      // keep new occurrences visible without failing the lint run
      'vue/no-mutating-props': 'warn'
    }
  },
  {
    files: ['*.config.js'],
    languageOptions: { globals: { ...globals.node } }
  }
]
