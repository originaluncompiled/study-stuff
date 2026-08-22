module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/app/**/_layout.tsx'],
  moduleNameMapper: {
    '^lucide-react-native$': '<rootDir>/src/test/lucide-mock.tsx',
  },
  setupFiles: [
    'react-native-gesture-handler/jestSetup.js',
    '<rootDir>/src/test/jest-setup.js',
  ],
};
