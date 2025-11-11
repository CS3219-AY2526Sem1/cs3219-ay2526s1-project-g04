import path from 'path';
import type { JestConfigWithTsJest } from 'ts-jest';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: JestConfigWithTsJest = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@shared/(.*)/src/(.*)$': path.resolve(
      __dirname,
      '../../shared/$1/dist/$2',
    ),
  },
  transformIgnorePatterns: ['/node_modules/'],
};

export default config;
