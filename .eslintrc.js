module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },
  env: {
    'react-native/react-native': true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended', // Must be last to override other configs
  ],
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-native',
    'import',
    'prettier',
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      },
    },
    'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
  },
  rules: {
    // Prettier integration
    'prettier/prettier': ['error', {}, { usePrettierrc: true }],

    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/ban-ts-comment': [
      'warn',
      {
        'ts-expect-error': 'allow-with-description',
        'ts-ignore': 'allow-with-description',
        'ts-nocheck': 'allow-with-description',
      },
    ],

    // React specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/prop-types': 'off', // Using TypeScript for prop types
    'react/display-name': 'off',
    'react/jsx-uses-react': 'off',
    'react/jsx-uses-vars': 'error',
    'react/no-unescaped-entities': 'warn',
    'react/jsx-key': ['error', { checkFragmentShorthand: true }],

    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // React Native specific rules
    'react-native/no-unused-styles': 'warn',
    'react-native/split-platform-components': 'warn',
    'react-native/no-inline-styles': 'off', // Allow inline styles for flexibility
    'react-native/no-color-literals': 'off', // Allow color literals for quick prototyping
    'react-native/no-raw-text': 'off', // Allow raw text outside Text component for flexibility
    'react-native/sort-styles': 'off', // Don't enforce style sorting

    // Import rules
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling'],
          'index',
          'object',
          'type',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-unresolved': 'error',
    'import/no-duplicates': 'error',
    'import/newline-after-import': 'warn',
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',

    // General code quality rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
    'no-alert': 'warn',
    'prefer-const': 'warn',
    'no-var': 'error',
    'object-shorthand': 'warn',
    'prefer-template': 'warn',
    'prefer-arrow-callback': 'warn',
    'no-duplicate-imports': 'error',
    'no-unused-expressions': 'off',
    '@typescript-eslint/no-unused-expressions': [
      'warn',
      {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
      },
    ],
  },
  overrides: [
    {
      // Configuration for test files
      files: ['**/__tests__/**/*', '**/*.test.ts', '**/*.test.tsx'],
      env: {
        jest: true,
      },
    },
    {
      // Relax some rules for configuration files
      files: ['*.config.js', '*.config.ts', 'babel.config.js', 'metro.config.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-commonjs': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    '.expo/',
    '.expo-shared/',
    'dist/',
    'build/',
    'coverage/',
    '*.config.js',
    '*.config.ts',
    '.eslintrc.js',
  ],
};
