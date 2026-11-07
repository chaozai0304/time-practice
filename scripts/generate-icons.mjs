import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const launcher = resolve(root, 'scripts/chrome-arm64.sh')
const browser = await chromium.launch(process.platform === 'darwin' && process.arch === 'x64' && existsSync(launcher) ? { executablePath: launcher } : { channel: 'chrome' })
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 })
  await page.goto(new URL('../public/sprout.svg', import.meta.url).href)
  for (const [density, size] of [['mdpi',48],['hdpi',72],['xhdpi',96],['xxhdpi',144],['xxxhdpi',192]]) {
    await page.setViewportSize({ width: size, height: size })
    for (const name of ['ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground']) {
      await page.screenshot({ path: resolve(root, `android/app/src/main/res/mipmap-${density}/${name}.png`), scale: 'css' })
    }
  }
  await page.setViewportSize({ width: 1024, height: 1024 })
  await page.screenshot({ path: resolve(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), scale: 'css' })
  console.log('Android and iOS icons generated from public/sprout.svg')
} finally { await browser.close() }