import js from '@eslint/js';

export default [
  // Global ignores - separate object without other properties
  {
    ignores: ['dist/**', 'node_modules/**', 'build/**', 'coverage/**']
  },
  js.configs.recommended,
  {
    rules: {
      // Basic code quality rules
      'no-console': 'warn',
      'no-debugger': 'warn',
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      
      // Styling rules
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      
      // Best practices
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-duplicate-imports': 'error',
      
      // ES6+ specific rules
      'arrow-spacing': ['error', { 'before': true, 'after': true }],
      'no-duplicate-case': 'error',
      'no-empty': 'error',
      'no-ex-assign': 'error',
      'no-func-assign': 'error',
      'no-inner-declarations': 'error',
      'no-irregular-whitespace': 'error',
      'no-unreachable': 'error',
      'valid-typeof': 'error'
    },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLCanvasElement: 'readonly',
        HTMLSelectElement: 'readonly',
        DataTransfer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        requestAnimationFrame: 'readonly',
        fetch: 'readonly'
      }
    },
    files: ['**/*.js', '**/*.mjs']
  }
];
