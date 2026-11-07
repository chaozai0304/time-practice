import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
const appleSilicon = process.platform === 'darwin' && execSync('uname -m').toString().trim() === 'arm64'
const launchOptions = appleSilicon ? { executablePath: fileURLToPath(new URL('./scripts/chrome-arm64.sh', import.meta.url)) } : undefined
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, timeout: 120_000,
  workers: 1,
  expect: { timeout: 20_000 },
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'on-first-retry', screenshot: 'only-on-failure', launchOptions },
  webServer: { command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: false, timeout: 120_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 1000 } } },
    { name: 'phone', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1024, height: 768 }, hasTouch: true } },
  ],
})