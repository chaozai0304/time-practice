import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Read-only publication checks; no network, staging, device access or mutations.
const root = fileURLToPath(new URL('../', import.meta.url))
const readme = readFileSync(path.join(root, 'README.md'), 'utf8')
const anchors = new Set([...readme.matchAll(/<a id="([^"]+)">/g)].map(match => match[1]))
for (const match of readme.matchAll(/^#{1,6}\s+(.+)$/gm)) {
  anchors.add(match[1].toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-'))
}
const missing = []
for (const match of readme.matchAll(/\]\(([^)]+)\)|(?:src|href)="([^"]+)"/g)) {
  const target = match[1] || match[2]
  if (/^[a-z][a-z\d+.-]*:/i.test(target)) continue
  if (target.startsWith('#')) {
    if (!anchors.has(decodeURIComponent(target.slice(1)))) missing.push(target)
  } else if (!existsSync(path.join(root, decodeURIComponent(target.split('#')[0])))) missing.push(target)
}
assert.deepEqual(missing, [], 'README contains missing local paths or anchors.')
assert.ok(anchors.has('zh-cn') && anchors.has('english'), 'Both language anchors must exist.')
const rootFiles = readdirSync(root)
assert.ok(rootFiles.includes('AGENTS.md') && rootFiles.includes('CLAUDE.md') && !rootFiles.includes('Agent.md'), 'Keep one canonical AGENTS policy and the Claude import, without the obsolete duplicate.')
const entry = readFileSync(path.join(root, 'AGENTS.md'), 'utf8')
assert.ok(entry.includes('## 11.') && entry.includes('## 12.') && entry.includes('禁止任何平板/手机操作'), 'Keep the consolidated safety, retrospective and completion requirements.')
assert.ok(/^@AGENTS\.md$/m.test(readFileSync(path.join(root, 'CLAUDE.md'), 'utf8')), 'Claude must import the canonical rules instead of copying them.')
for (const name of ['AGENTS.md', 'CLAUDE.md', 'docs/AI_LESSONS.md', 'docs/LEARNING_CONTENT.md']) {
  const text = readFileSync(path.join(root, name), 'utf8')
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1]
    if (!/^[a-z][a-z\d+.-]*:/i.test(target) && !target.startsWith('#')) {
      assert.ok(existsSync(path.resolve(root, path.dirname(name), target.split('#')[0])), `${name} has a missing reference: ${target}`)
    }
  }
}
const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
const lockfile = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
assert.equal(manifest.license, 'MIT')
assert.equal(lockfile.packages[''].license, 'MIT')
const license = readFileSync(path.join(root, 'LICENSE'), 'utf8')
assert.ok(license.startsWith('MIT License\n') && license.includes('Permission is hereby granted') && license.includes('THE SOFTWARE IS PROVIDED "AS IS"'), 'Keep the MIT grant and disclaimer intact.')
const images = readdirSync(path.join(root, 'docs/screenshots')).filter(name => name.endsWith('.png')).sort()
assert.equal(images.length, 18)
assert.ok(images.includes('10-game.png'), 'Keep the actual word-game screenshot.')
assert.ok(images.includes('11-course-editor.png'), 'Keep the full course metadata editor screenshot.')
for (const name of ['12-game-hub.png','13-escort.png','14-runner.png','15-tower.png','16-pickup-question.png','17-tablet-controls.png','18-tablet-portrait.png']) assert.ok(images.includes(name), `Keep the real game capture: ${name}`)
for (const name of images) {
  const bytes = readFileSync(path.join(root, 'docs/screenshots', name))
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20)
  assert.ok(width >= 300 && height >= 300)
  if (name === '03-settings.png') assert.ok(height > 1000, 'Settings screenshot must include the full save action.')
  console.log(`${name}: ${width} × ${height}, ${bytes.length} bytes`)
}
const files = new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(name => name && existsSync(path.join(root, name))))
const forbidden = [], suspected = []
const blockedPath = /(?:^|\/)(?:node_modules|build|dist|\.gradle|__pycache__|test-results|xcuserdata)(?:\/|$)|\.(?:apk|ipa|keystore|jks|pem|p12|pfx|mobileprovision|pyc)$|(?:^|\/)\.env(?:$|\.(?!example$))/
const credential = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16}/
for (const name of files) {
  if (blockedPath.test(name)) forbidden.push(name)
  if (!/\.(?:png|jpg|jpeg|woff2?|jar)$/.test(name) && credential.test(readFileSync(path.join(root, name), 'utf8'))) suspected.push(name)
}
assert.deepEqual(forbidden, [], 'Publication contains a cache, signing, environment or device artifact.')
assert.deepEqual(suspected, [], 'Review potential credentials before publishing (file names only).')
console.log(`Verified bilingual README, canonical rules, learning links, MIT metadata, 18 screenshots and ${files.size} publishable files; no blocked paths or common credential patterns.`)