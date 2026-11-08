import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { chromium, expect as baseExpect } from '@playwright/test'
import { preview } from 'vite'
import { isNativeArmMac } from './browser-platform.mjs'

// Bounded, isolated computer-browser profiling. No devices or real user data.
const root = fileURLToPath(new URL('../', import.meta.url))
const expect = baseExpect.configure({ timeout: 20000 })
assert.ok(existsSync(path.join(root, 'dist/index.html')), 'Run npm run build before profiling.')
const armMac = isNativeArmMac()
const samples = []
const measure = async (name, operation) => {
  const started = performance.now(), result = await operation(), ms = performance.now() - started
  samples.push({ name, ms: Math.round(ms) }); console.log(`${name}: ${Math.round(ms)} ms`)
  return result
}
console.log(`Runtime platform: ${process.platform}; Node architecture: ${process.arch}; native ARM Chrome wrapper: ${armMac}`)
const server = await preview({ root, preview: { host: '127.0.0.1', port: 4177, strictPort: true } })
let browser
try {
  browser = await measure('browser.launch', () => chromium.launch({ channel: 'chrome', ...(armMac ? { executablePath: path.join(root, 'scripts/chrome-arm64.sh') } : {}) }))
  for (let round = 1; round <= 2; round++) {
    const label = `round${round}`, context = await measure(`${label}.context`, () => browser.newContext({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' }))
    try {
      const page = await context.newPage(); page.setDefaultTimeout(30000)
      await page.addInitScript(() => {
        window.__profileLongTasks = []
        new PerformanceObserver(list => { window.__profileLongTasks.push(...list.getEntries().map(entry => Math.round(entry.duration))) }).observe({ type: 'longtask', buffered: true })
      })
      const errors = []; page.on('pageerror', error => errors.push(error.message))
      await measure(`${label}.goto`, () => page.goto('http://127.0.0.1:4177/'))
      const setup = page.getByRole('dialog', { name: '先为成长，设一道保护' })
      await measure(`${label}.ready`, () => expect(setup).toBeVisible())
      await measure(`${label}.fill-pin`, () => setup.getByLabel('设置 6 位数字密码').fill('246810'))
      await measure(`${label}.fill-confirm`, () => setup.getByLabel('再输入一次').fill('246810'))
      await measure(`${label}.setup-click`, () => setup.getByRole('button', { name: '开启学伴时光' }).click())
      await measure(`${label}.setup-complete`, () => expect(setup).not.toBeVisible())
      await measure(`${label}.home-ready`, () => expect(page.getByRole('heading', { name: '你好，小小探索家' })).toBeVisible())
      const pbkdf2Ms = await page.evaluate(async () => {
        const start = performance.now(), key = await crypto.subtle.importKey('raw', new TextEncoder().encode('fixture-benchmark'), 'PBKDF2', false, ['deriveBits'])
        await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new Uint8Array(16), iterations: 120000, hash: 'SHA-256' }, key, 256)
        return Math.round(performance.now() - start)
      })
      console.log(`${label}.PBKDF2-120000: ${pbkdf2Ms} ms`)
      await measure(`${label}.screenshot`, () => page.screenshot({ fullPage: true }))
      await measure(`${label}.open-parent`, () => page.getByRole('button', { name: '进入家长设置' }).click())
      const parent = page.getByRole('dialog', { name: '家长验证' })
      await measure(`${label}.parent-fill`, () => parent.getByLabel('输入家长密码').fill('246810'))
      await measure(`${label}.parent-click`, () => parent.getByRole('button', { name: '验证并继续' }).click())
      await measure(`${label}.parent-complete`, () => expect(parent).not.toBeVisible())
      await measure(`${label}.settings-ready`, () => expect(page.getByRole('heading', { name: '把节奏交给家长' })).toBeVisible())
      const details = await page.evaluate(() => ({ longTasksMs: window.__profileLongTasks, resources: performance.getEntriesByType('resource').filter(entry => /\.(?:js|css)$/.test(new URL(entry.name).pathname)).map(entry => ({ file: new URL(entry.name).pathname.split('/').at(-1), ms: Math.round(entry.duration) })) }))
      console.log(`${label}.browser-details: ${JSON.stringify(details)}`)
      assert.deepEqual(errors, [], 'Profiling observed browser errors.')
    } finally { await context.close() }
  }
  console.log(`Measured browser actions total: ${samples.reduce((sum, row) => sum + row.ms, 0)} ms; no device operations.`)
} finally {
  await browser?.close()
  await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()))
}