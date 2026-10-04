import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import boundaries from 'eslint-plugin-boundaries'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Capas de docs/FRONTEND-STRUCTURE.md (secciones 02, 05 y 06):
//   app ──► features ──► shared / domain
// shared no conoce el negocio, domain no conoce a features, features no conoce a app,
// y un feature solo puede usar otro feature a través de su index.ts.
const layers = [
  { type: 'app', pattern: 'src/app' },
  { type: 'feature', pattern: 'src/features/*', capture: ['feature'] },
  { type: 'shared', pattern: 'src/shared' },
  { type: 'domain', pattern: 'src/domain' },
  { type: 'mocks', pattern: 'src/mocks' },
  { type: 'styles', pattern: 'src/styles' },
  { type: 'api-contract', pattern: 'src/api-contract' },
  { type: 'assets', pattern: 'src/assets' },
]

const to = (...types) => ({ to: { element: { types: { anyOf: types } } } })
const toFeaturePublicApi = { to: { element: { type: 'feature', fileInternalPath: 'index.ts' } } }

export default defineConfig([
  globalIgnores(['dist', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': layers,
      'import/resolver': {
        typescript: { project: './tsconfig.app.json' },
      },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            // Todo archivo puede importar archivos de su misma capa (o de su mismo feature).
            { allow: { dependency: { relationship: { to: 'internal' } } } },
            {
              from: { element: { type: 'app' } },
              allow: [to('feature', 'shared', 'domain', 'mocks', 'styles', 'assets')],
            },
            {
              from: { element: { type: 'feature' } },
              allow: [
                to('shared', 'domain', 'styles', 'assets', 'api-contract'),
                toFeaturePublicApi,
              ],
            },
            { from: { element: { type: 'shared' } }, allow: [to('styles', 'assets')] },
            { from: { element: { type: 'styles' } }, allow: [to('shared')] },
            { from: { element: { type: 'domain' } }, allow: [to('api-contract')] },
            {
              from: { element: { type: 'mocks' } },
              allow: [to('shared', 'domain', 'api-contract'), toFeaturePublicApi],
            },
          ],
        },
      ],
      // Sección 05: otro módulo usa un feature solo vía '@/features/<nombre>' (su index.ts).
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/**'],
              message:
                "Importá el feature desde su API pública ('@/features/<nombre>'), no desde sus carpetas internas.",
            },
          ],
        },
      ],
    },
  },
])
