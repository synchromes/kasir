import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output=path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  testDir:path.resolve(output,'../../e2e'),
  testMatch:['walkthrough.spec.ts','antislop-002.spec.ts'],
  timeout:60000,
  expect:{timeout:15000},
  workers:1,
  reporter:[['json',{outputFile:path.join(output,'regression-results.json')}]],
  outputDir:path.join(output,'regression-artifacts'),
  use:{baseURL:'http://localhost:3000',channel:'msedge',trace:'retain-on-failure'},
  projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['Pixel 7']}}],
});
