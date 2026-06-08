/** @type {import('jest').Config} */
const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',

  // Spin up / tear down in-memory MongoDB around the full test suite
  globalSetup: '<rootDir>/tests/config/global-setup.js',
  globalTeardown: '<rootDir>/tests/config/global-teardown.js',

  // Per-file setup: Next.js mocks + browser API stubs
  setupFilesAfterEnv: [
    '<rootDir>/tests/config/jest-setup.js',
    '<rootDir>/tests/setup.ts',
  ],

  // Module name mapping for imports (correct property name)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^~/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
  },

  // Test match patterns
  testMatch: [
    '**/tests/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)',
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/cypress/',
  ],

  // Coverage settings
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/e2e/**',
    '!**/tests/config/**',
    '!jest.config.js',
    '!next.config.js',
    '!tailwind.config.ts',
    '!postcss.config.js',
  ],

  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Test environment setup
  testEnvironmentOptions: {
    customExportConditions: [''],
  },

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],

  // Verbose output
  verbose: true,

  // Max workers for parallel execution
  maxWorkers: '50%',

  // Transform configuration for TypeScript and JSX
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
    '^.+\\.(js|jsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }],
        ],
      },
    ],
  },

  // TypeScript and module extensions
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
}

module.exports = config
