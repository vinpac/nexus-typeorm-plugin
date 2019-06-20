module.exports = {
  roots: [
    './src',   // https://github.com/facebook/jest/issues/1395#issuecomment-419490847
    './__tests__',
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  testRegex: '__tests__/(.*/)?test-.*\\.ts$',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  moduleNameMapper: {
    '@/(.*)$': '<rootDir>/src/$1'
  },
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/lib/'],
  globals: {
    'ts-jest': {
      tsConfig: './tsconfig.test.json'
    }
  }
}
