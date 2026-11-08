import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { questionExamples } from '../../src/lib/templates'
async function setup(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/')
  const dialog = page.getByRole('dialog', { name: '先为成长，设一道保护' })
  await dialog.getByLabel('设置 6 位数字密码').fill('246810'); await dialog.getByLabel('再输入一次').fill('246810'); await dialog.getByRole('button', { name: '开启学伴时光' }).click(); await expect(dialog).not.toBeVisible()
}
async function parent(page: Page) { const dialog = page.getByRole('dialog', { name: '家长验证' }); await dialog.getByLabel('输入家长密码').fill('246810'); await dialog.getByRole('button', { name: '验证并继续' }).click(); await expect(dialog).not.toBeVisible() }
test('家长手动添加判断题、停用/启用、学段筛选与模板导入', async ({ page }) => {
  test.setTimeout(240000)
  await setup(page); await page.getByRole('button', { name: '管理题库' }).click(); await parent(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: '添加题目', exact: true }).click(); await parent(page)
  const editor = page.getByRole('dialog', { name: '添加一道新题' }); await editor.getByLabel('年级', { exact: true }).selectOption('8'); await editor.getByLabel('学科', { exact: true }).selectOption('物理'); await editor.getByLabel('题型', { exact: true }).selectOption('boolean')
  expect(await editor.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true)
  await editor.getByLabel('题目', { exact: true }).fill('测试判断题：速度等于路程乘时间。'); await editor.getByLabel('正确答案', { exact: true }).selectOption('错误'); await editor.getByLabel('单元/主题').fill('测试运动'); await editor.getByRole('button', { name: '保存到本地题库' }).click(); await expect(editor).not.toBeVisible()
  await page.getByLabel('题库年级').selectOption('8'); await page.getByLabel('题库学科').selectOption('物理'); await page.getByLabel('搜索题目').fill('测试判断题'); await expect(page.locator('.question-list-item')).toHaveCount(1)
  const toggle = page.getByRole('switch'); await toggle.click(); await parent(page); await expect(toggle).toHaveAttribute('aria-checked','false')
  await page.getByLabel('题目启用状态').selectOption('启用'); await expect(page.locator('.question-list-item')).toHaveCount(0)
  await page.getByLabel('题目启用状态').selectOption('停用'); await page.getByRole('button', { name: '启用当前筛选' }).click(); await parent(page); await expect(page.locator('.question-list-item')).toHaveCount(0)
  page.on('filechooser', () => {}); await page.getByRole('button', { name: '导入题库', exact: true }).click(); await parent(page)
  await page.getByLabel('导入题库文件').setInputFiles({ name: 'types.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(questionExamples)) }); await expect(page.getByRole('dialog', { name: '题库已准备好' })).toContainText('7 道题'); await page.getByRole('button', { name: '确认保存到本机' }).click()
  await page.getByLabel('题库年级').selectOption('10'); await page.getByLabel('题库学科').selectOption('化学'); await page.getByLabel('搜索题目').fill('水的化学式为 CO2'); await expect(page.locator('.question-list-item')).toHaveCount(1); await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','false')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
test('词表导入生成英选中/中写英，游戏正确才释放能量并持久化真实记录', async ({ page }, info) => {
  test.setTimeout(240000)
  await setup(page); await page.getByRole('button', { name: '管理题库' }).click(); await parent(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByLabel('题库学科').selectOption('英语'); await page.getByRole('button', { name: '停用当前筛选' }).click(); await parent(page)
  page.on('filechooser', () => {}); await page.getByRole('button', { name: '导入英语词表', exact: true }).click(); await parent(page)
  await page.getByLabel('导入英语词表文件').setInputFiles({ name: 'words.csv', mimeType: 'text/csv', buffer: Buffer.from('english,chinese,grade,unit\nrocket,测试火箭,3,星际单元') }); await expect(page.getByRole('dialog', { name: '题库已准备好' })).toContainText('2 道题'); await page.getByRole('button', { name: '确认保存到本机' }).click()
  await page.getByLabel('搜索题目').fill('测试火箭'); await expect(page.locator('.question-list-item')).toHaveCount(1)
  await page.getByLabel('搜索题目').fill('rocket'); await expect(page.locator('.question-list-item')).toHaveCount(1)
  const nav = info.project.name === 'phone' ? page.locator('.mobile-nav') : page.locator('aside'); await nav.getByRole('button', { name: '成长首页' }).click(); await page.getByRole('button', { name: '进入单词星际跑酷' }).click()
  await expect(page.locator('.runner-question h3')).toHaveText('测试火箭'); await page.getByLabel('游戏英文答案').fill('wrong'); await page.getByRole('button', { name: '发射单词能量' }).click(); await expect(page.getByTestId('game-score')).toHaveText('0'); await expect(page.locator('.runner-pulse')).toHaveCount(0)
  await page.getByRole('button', { name: '暂停游戏' }).click(); await expect(page.getByLabel('游戏英文答案')).toBeDisabled(); await page.getByRole('button', { name: '继续游戏' }).click(); await page.getByRole('button', { name: '拼写提示' }).click(); await expect(page.locator('.runner-question')).toContainText('首字母：r')
  await page.getByLabel('游戏英文答案').fill(' ROCKET '); await page.getByRole('button', { name: '发射单词能量' }).click(); await expect(page.getByTestId('game-score')).toHaveText('1'); await expect(page.locator('.runner-pulse')).toHaveCount(1)
  for (let i = 1; i < 10; i++) { await page.getByLabel('游戏英文答案').fill('rocket'); await page.getByRole('button', { name: '发射单词能量' }).click(); await expect(page.getByTestId('game-score')).toHaveText(String(i + 1)) }
  await expect(page.getByRole('heading', { name: /探索完成/ })).toBeVisible(); await page.screenshot({ path: `test-results/game-${info.project.name}.png`, fullPage: true }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.reload(); await nav.getByRole('button', { name: '学习足迹' }).click(); await expect(page.locator('.record-item')).toHaveCount(11); await expect(page.locator('.record-result.retry')).toHaveCount(1)
})
test('高中设置按学段显示科目，切换小学自动去除高中专属科目', async ({ page }) => {
  await setup(page); await page.getByRole('button', { name: '进入家长设置' }).click(); await parent(page)
  await page.getByLabel('学习年级').selectOption('10'); await expect(page.getByRole('button', { name: '思想政治', exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: '通用技术', exact: true })).toBeVisible(); await page.getByRole('button', { name: '思想政治', exact: true }).click()
  await page.getByLabel('学习年级').selectOption('3'); await expect(page.getByRole('button', { name: '思想政治', exact: true })).toHaveCount(0); await page.getByRole('button', { name: '保存学习规则' }).click(); await parent(page); await expect(page.getByRole('status')).toContainText('学习规则已保存')
})
test('选择、填空、判断逐一作答：每种错答留题，正确才前进', async ({ page }) => {
  await setup(page)
  // Isolated fixture only: keep the user-created synthetic PIN, never alter real data.
  const fixtures = [
    { id: 'fixture-choice', grade: 3, subject: '数学', type: 'choice', prompt: '测试选择：2 + 2 = ？', options: ['3','4'], answer: '4', explanation: 'fixture' },
    { id: 'fixture-fill', grade: 3, subject: '数学', type: 'fill', prompt: '测试填空：一小时多少分钟？', options: [], answer: '60', explanation: 'fixture' },
    { id: 'fixture-boolean', grade: 3, subject: '数学', type: 'boolean', prompt: '测试判断：1 米等于 10 厘米。', options: ['正确','错误'], answer: '错误', explanation: 'fixture' },
  ]
  await page.evaluate(questions => { const key = 'CapacitorStorage.sprout.data.v1'; const data = JSON.parse(localStorage.getItem(key)!); data.questions = questions; data.settings.requiredCorrect = 3; localStorage.setItem(key, JSON.stringify(data)) }, fixtures)
  await page.reload(); await page.getByRole('button', { name: '先练习一下' }).click()
  const quiz = page.getByRole('dialog', { name: '答题时间' }), seen = new Set<string>()
  for (let i = 0; i < 3; i++) {
    const prompt = await quiz.locator('h2').innerText(), q = fixtures.find(q => q.prompt === prompt)!; seen.add(q.type)
    if (q.type === 'fill') await quiz.getByLabel('你的答案').fill('bad')
    else { const wrong = q.options.find(option => option !== q.answer)!; await quiz.locator('.answer-option').filter({ hasText: new RegExp(`${wrong}$`) }).click() }
    await quiz.getByRole('button', { name: '确认答案' }).click(); await expect(quiz.locator('h2')).toHaveText(prompt); await expect(quiz.getByRole('alert')).toContainText('差一点点')
    if (q.type === 'fill') await quiz.getByLabel('你的答案').fill('６０')
    else await quiz.locator('.answer-option').filter({ hasText: new RegExp(`${q.answer}$`) }).click()
    await quiz.getByRole('button', { name: '确认答案' }).click()
    if (i < 2) await expect(quiz.locator('h2')).not.toHaveText(prompt)
  }
  expect(seen).toEqual(new Set(['choice','fill','boolean'])); await expect(quiz).not.toBeVisible()
})