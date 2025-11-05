import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        extraFileExtensions: ['.svelte']
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: tsparser
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'no-unused-vars': 'warn',
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
];
