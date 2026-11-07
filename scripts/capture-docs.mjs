import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium, expect as baseExpect } from '@playwright/test'
import { preview } from 'vite'

// Isolated browser demonstration only. No ADB, native device access or real data.
const root = fileURLToPath(new URL('../', import.meta.url))
const output = path.join(root, 'docs/screenshots')
const expect = baseExpect.configure({ timeout: 60_000 })
const armMac = process.platform === 'darwin' && execFileSync('uname', ['-m']).toString().trim() === 'arm64'
const server = await preview({ root, preview: { host: '127.0.0.1', port: 4175, strictPort: true } })
let browser
try {
  await mkdir(output, { recursive: true })
  browser = await chromium.launch({ channel: 'chrome', ...(armMac ? { executablePath: path.join(root, 'scripts/chrome-arm64.sh') } : {}) })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' })
  const page = await context.newPage()
  page.setDefaultTimeout(60_000)
  const failures = [], external = []
  page.on('pageerror', error => failures.push(error.message))
  page.on('request', request => { if (!/^(http:\/\/127\.0\.0\.1:4175\/|data:|blob:)/.test(request.url())) external.push(request.url()) })
  const screenshot = async (name, locator = page) => {
    await page.evaluate(() => document.fonts.ready)
    await locator.screenshot({ path: path.join(output, name), animations: 'disabled', ...(locator === page ? { fullPage: name === '03-settings.png' } : {}) })
    console.log(`Captured ${name}`)
  }
  const dismissToast = async () => {
    await expect(page.locator('.toast')).not.toBeVisible()
  }
  const verify = async () => {
    const dialog = page.getByRole('dialog', { name: '家长验证' })
    await dialog.getByLabel('输入家长密码').fill('246810') // Synthetic fixture, never a default product PIN.
    await dialog.getByRole('button', { name: '验证并继续' }).click()
    await expect(dialog).not.toBeVisible({ timeout: 30_000 })
  }
  await page.goto('http://127.0.0.1:4175/')
  const setup = page.getByRole('dialog', { name: '先为成长，设一道保护' })
  await expect(setup).toBeVisible()
  await screenshot('01-welcome.png', setup)
  await setup.getByLabel('设置 6 位数字密码').fill('246810')
  await setup.getByLabel('再输入一次').fill('246810')
  await setup.getByRole('button', { name: '开启学伴时光' }).click()
  await expect(setup).not.toBeVisible({ timeout: 30_000 })
  await dismissToast()
  await expect(page.locator('.motion-island')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
  await expect(page.locator('.motion-island')).toHaveAttribute('data-motion', /^(3d|static)$/, { timeout: 30_000 })
  await screenshot('02-home.png')

  await page.getByRole('button', { name: '进入家长设置' }).click()
  await verify()
  await expect(page.getByRole('heading', { name: '把节奏交给家长' })).toBeVisible()
  await screenshot('03-settings.png')
  await page.locator('aside').getByRole('button', { name: '我的题库' }).click()
  await verify()
  await expect(page.getByLabel('搜索题目')).toBeVisible()
  await screenshot('04-library.png')
  page.on('filechooser', () => {})
  await page.getByRole('button', { name: '导入题库', exact: true }).click()
  await verify()
  await page.getByLabel('导入题库文件').setInputFiles(path.join(root, 'examples/questions.json'))
  const imported = page.getByRole('dialog', { name: '题库已准备好' })
  await expect(imported).toBeVisible()
  await screenshot('05-import.png', imported)
  await imported.getByRole('button', { name: '确认保存到本机' }).click()
  await expect(imported).not.toBeVisible()
  await dismissToast()

  await page.locator('aside').getByRole('button', { name: '成长首页' }).click()
  await page.getByRole('button', { name: '先练习一下' }).click()
  const quiz = page.getByRole('dialog', { name: '答题时间' })
  const portal = quiz.locator('.guard-portal')
  await expect(portal).toHaveAttribute('data-mode', /^(3d|static)$/, { timeout: 30_000 })
  if (await portal.getAttribute('data-mode') === '3d') {
    const canvas = await portal.locator('canvas').screenshot()
    if (canvas.byteLength <= 5000) throw new Error('The universe canvas did not contain a valid rendered frame.')
    await quiz.getByRole('button', { name: '暂停星门动画' }).click()
  }
  await expect(quiz.getByRole('button', { name: '家长退出' })).toBeVisible()
  await screenshot('06-quiz.png', quiz)
  // Add one real demonstration attempt so the records screenshot isn't fabricated.
  const options = quiz.locator('.answer-option')
  if (await options.count()) await options.first().click()
  else await quiz.getByLabel('你的答案').fill('60')
  await quiz.getByRole('button', { name: '确认答案' }).click()
  await quiz.getByRole('button', { name: '家长退出' }).click()
  const parent = page.getByRole('dialog', { name: '家长验证' })
  await expect(parent).toBeVisible()
  await screenshot('07-parent.png', parent)
  await verify()
  await dismissToast()
  await page.locator('aside').getByRole('button', { name: '学习足迹' }).click()
  await expect(page.locator('.record-item')).toHaveCount(1)
  await screenshot('08-records.png')
  await page.locator('aside').getByRole('button', { name: '成长首页' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await screenshot('09-mobile.png')
  if (failures.length || external.length) throw new Error(JSON.stringify({ failures, external }))
  console.log(`Verified 9 real browser screenshots in ${output}; no external requests or page errors.`)
  await context.close()
} finally {
  await browser?.close()
  await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()))
}