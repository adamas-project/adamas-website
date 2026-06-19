import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'web-dist/**', 'node_modules/**', 'coverage/**', 'web/dist/**', '*.config.js', '*.config.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
  {
    // Standalone smoke script (plain ESM) and the browser client run outside the
    // Node typecheck; give them the right ambient globals.
    files: ['scripts/**/*.mjs', 'web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        fetch: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        document: 'readonly',
        window: 'readonly',
        prompt: 'readonly',
        alert: 'readonly',
        localStorage: 'readonly',
        RequestInit: 'readonly',
      },
    },
  },
);
