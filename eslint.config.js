import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'tools', 'node_modules', 'docs', 'ios', 'worker/.wrangler', 'worker/node_modules', 'worker/dist-bundle'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  {
    files: ['public/sw.js'],
    languageOptions: { globals: { self: 'readonly' } },
  },
  {
    files: ['worker/tools/*.mjs'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
)
