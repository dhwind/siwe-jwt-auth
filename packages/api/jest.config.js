module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  testEnvironment: 'node',
  preset: 'ts-jest',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          resolvePackageJsonExports: false,
        },
      },
    ],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coveragePathIgnorePatterns: [
    'node_modules',
    'test-config',
    'interfaces',
    'jestGlobalMocks.ts',
    '\\.module\\.ts',
    '\\.dto\\.ts',
    '<rootDir>/config',
    '<rootDir>/main.ts',
    '\\.mock\\.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules./',
    '<rootDir>/(coverage|dist|lib|tmp)./',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../src/$1',
    '^generated/prisma$': '<rootDir>/../generated/prisma',
    '^src$': '<rootDir>/src',
    '^src/(.+)$': '<rootDir>/src/$1',
  },
};
