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
const images = readdirSync(path.join(root, 'docs/screenshots')).filter(name => name.endsWith('.png')).sort()
assert.equal(images.length, 9)
for (const name of images) {
  const bytes = readFileSync(path.join(root, 'docs/screenshots', name))
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20)
  assert.ok(width >= 300 && height >= 300)
  if (name === '03-settings.png') assert.ok(height > 1000, 'Settings screenshot must include the full save action.')
  console.log(`${name}: ${width} × ${height}, ${bytes.length} bytes`)
}
const files = new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean))
const forbidden = [], suspected = []
const blockedPath = /(?:^|\/)(?:node_modules|build|dist|\.gradle|__pycache__|test-results|xcuserdata)(?:\/|$)|\.(?:apk|ipa|keystore|jks|pem|p12|pfx|mobileprovision|pyc)$|(?:^|\/)\.env(?:$|\.(?!example$))/
const credential = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16}/
for (const name of files) {
  if (blockedPath.test(name)) forbidden.push(name)
  if (!/\.(?:png|jpg|jpeg|woff2?|jar)$/.test(name) && credential.test(readFileSync(path.join(root, name), 'utf8'))) suspected.push(name)
}
assert.deepEqual(forbidden, [], 'Publication contains a cache, signing, environment or device artifact.')
assert.deepEqual(suspected, [], 'Review potential credentials before publishing (file names only).')
console.log(`Verified bilingual README links, 9 screenshots and ${files.size} publishable files; no blocked paths or common credential patterns.`)