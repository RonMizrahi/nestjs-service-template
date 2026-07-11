// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Shared base: JS recommended + TS type-checked + the template's two custom rules.
 * Consumers add their own `ignores` and `languageOptions.parserOptions` (tsconfigRootDir).
 */
export const base = [
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];

/** Node / NestJS variant — type-checked against the consumer's tsconfig via projectService. */
export const node = [...base];
