module.exports = {
  env: {
    es2021: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
  ],
  overrides: [
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    generators: true,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: [
      'tsconfig.eslint.json',
    ],
  },
  plugins: [
    '@typescript-eslint',
  ],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.ts'],
      },
    },
  },
  ignorePatterns: [
    '*.d.ts',
    '*.js',
  ],
  overrides: [
    {
      files: [
        '**/*.ts',
      ],
      rules: {
        'complexity': ["error", 5],
        '@typescript-eslint/no-explicit-any': 'error',
        'max-len': ["warn", 140 ],
        'no-restricted-syntax': [
          'off',
          {
            'selector': 'ForOfStatement'
          }
        ]
      },
    },
  ],
}
