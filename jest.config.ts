import type { Config } from 'jest';

const esModules = [
  '@angular',
  'tslib',
  'jest-preset-angular',
  '@angular/platform-browser-dynamic',
].join('|');

const config: Config = {
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      stringifyContentPathRegex: '\\.(html|css|scss|svg)$',
      useESM: true,
    },
  },
  transform: {
    '^.+\\.(ts|html|mjs)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'mjs', 'js', 'html', 'json'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^rxjs$': '<rootDir>/node_modules/rxjs/dist/cjs/index.js',
    '^rxjs/operators$': '<rootDir>/node_modules/rxjs/dist/cjs/operators/index.js',
    '^rxjs/(.*)$': '<rootDir>/node_modules/rxjs/dist/cjs/$1',
  },
  transformIgnorePatterns: [`node_modules/(?!(${esModules})/)`],
  collectCoverage: true,
  coverageReporters: ['lcov', 'text', 'clover'],
  coverageDirectory: 'coverage',
  reporters: [
    'default',
    [
      'jest-sonar',
      {
        outputDirectory: 'reports',
        outputName: 'test-report.xml',
        reportedFilePath: 'relative',
      },
    ],
  ],
};

export default config;
