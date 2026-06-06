// ESLint flat config for the BusSync React project.
// Uses the new "flat config" format (eslint.config.js) introduced in ESLint v9.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // Never lint the production build output — it's generated code
  globalIgnores(['dist']),
  {
    // Apply these rules to every JavaScript and JSX source file
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,               // ESLint core recommended rules
      reactHooks.configs.flat.recommended,  // Enforces Rules of Hooks (no conditional hook calls)
      reactRefresh.configs.vite,            // Ensures components export correctly for Vite Fast Refresh
    ],
    languageOptions: {
      ecmaVersion: 2020,         // Allow modern JS syntax (optional chaining, nullish coalescing, etc.)
      globals: globals.browser,  // Inject browser globals: window, document, fetch, navigator, etc.
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true }, // Enable JSX parsing inside .jsx files
        sourceType: 'module',        // Treat every file as an ES module (import/export)
      },
    },
    rules: {
      // Report unused variables as errors, but ignore names that start with an
      // uppercase letter (React component names) or an underscore (intentional placeholders)
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])
