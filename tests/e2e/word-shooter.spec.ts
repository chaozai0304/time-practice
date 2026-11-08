import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
const words = ['apple','book','cat','sun'].map((answer, i) => ({ id: `shooter-${i}`, grade: 3, subject: '英语', type: 'fill', prompt: `看中文写英语：${['苹果','书','猫','太阳'][i]}`, options: [], answer, enabled: true }))
async function setup(page: Page, fast = false) {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/')
  const dialog = page.getByRole('dialog', { name: '先为成长，设一道保护' }); await dialog.getByLabel('设置 6 位数字密码').fill('246810'); await dialog.getByLabel('再输入一次').fill('246810'); await dialog.getByRole('button', { name: '开启学伴时光' }).click(); await expect(dialog).not.toBeVisible()
  await page.evaluate(({ words, fast }) => { const key = 'CapacitorStorage.sprout.data.v1', data = JSON.parse(localStorage.getItem(key)!); data.questions = words; if (fast) data.gameSettings = { spawnIntervalSeconds: 1, fallSpeed: 1 }; localStorage.setItem(key, JSON.stringify(data)) }, { words, fast })
  await page.reload(); await page.getByRole('button', { name: '进入单词星际跑酷' }).click(); await expect(page.getByTestId('game-chinese').first()).toBeVisible()
  await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 200))
}
test('全屏中文目标正常锁定，错误不发射，正确子弹飞行后才命中', async ({ page }, info) => {
  await setup(page)
  const game = page.getByRole('dialog', { name: '单词星际跑酷', exact: true }), target = page.locator('.game-target').first()
  const bounds = await game.boundingBox(), viewport = page.viewportSize()!; expect(bounds!.x).toBe(0); expect(bounds!.y).toBe(0); expect(bounds!.width).toBe(viewport.width); expect(bounds!.height).toBe(viewport.height)
  const targetId = await target.getAttribute('data-target-id'), questionId = await target.getAttribute('data-question-id'), word = words.find(q => q.id === questionId)!.answer
  expect(await target.evaluate(node => { const rect = node.getBoundingClientRect(); return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)) })).toBe(true)
  await target.click(); await page.getByLabel('游戏英文答案').fill('wrong'); await page.getByRole('button', { name: '发射子弹' }).click(); await expect(page.getByTestId('game-bullet')).toHaveCount(0); await expect(page.getByTestId('game-score')).toHaveText('0')
  await page.getByLabel('游戏英文答案').fill(word); await page.getByLabel('游戏英文答案').press('Enter'); await expect(page.getByTestId('game-bullet')).toHaveCount(1); await expect(page.getByTestId('game-score')).toHaveText('0'); const before = await page.getByTestId('game-bullet').getAttribute('transform')
  await page.clock.runFor(250); await expect(page.getByTestId('game-bullet')).not.toHaveAttribute('transform', before!); await page.screenshot({ path: `test-results/shooter-flight-${info.project.name}.png` })
  await page.clock.runFor(1200); await expect(page.getByTestId('game-score')).toHaveText('1'); await expect(page.locator(`[data-target-id="${targetId}"]`)).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('CapacitorStorage.sprout.data.v1')!).attempts.length)).toBe(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
test('中文频率与下落速度真实生效，暂停冻结草稿/目标，设置重进保留', async ({ page }) => {
  await setup(page)
  const target = page.locator('.game-target').first(), originalY = Number(await target.getAttribute('data-y'))
  await page.getByRole('button', { name: '调整难度' }).click(); const settings = page.getByRole('dialog', { name: '调整游戏难度' })
  await settings.getByLabel('中文出现间隔', { exact: true }).focus(); await settings.getByLabel('中文出现间隔', { exact: true }).press('Home')
  await settings.getByLabel('目标下落速度', { exact: true }).focus(); await settings.getByLabel('目标下落速度', { exact: true }).press('End')
  await settings.getByRole('button', { name: '保存并返回游戏' }).click(); await page.clock.runFor(2400); await expect(page.locator('.game-target')).toHaveCount(3); expect(Number(await target.getAttribute('data-y'))).toBeGreaterThan(originalY + 12)
  await page.getByLabel('游戏英文答案').fill('draft'); await page.getByRole('button', { name: '暂停游戏' }).click(); const frozen = await page.locator('.game-target').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-y'))); await page.clock.runFor(5000)
  expect(await page.locator('.game-target').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-y')))).toEqual(frozen); await expect(page.getByLabel('游戏英文答案')).toHaveValue('draft'); await expect(page.getByLabel('游戏英文答案')).toBeDisabled()
  await page.getByRole('button', { name: '返回首页', exact: true }).click(); await page.reload(); await page.getByRole('button', { name: '进入单词星际跑酷' }).click(); await page.getByRole('button', { name: '调整难度' }).click(); await expect(page.getByLabel('中文出现间隔', { exact: true })).toHaveValue('1'); await expect(page.getByLabel('目标下落速度', { exact: true })).toHaveValue('8')
})