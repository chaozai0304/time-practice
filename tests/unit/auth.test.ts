import { describe, expect, it } from 'vitest'
import { createCredential, verifyPin } from '../../src/lib/auth'
describe('家长密码', () => {
  it('保存加盐派生值，不保存明文，验证正确与错误密码', async () => {
    const credential = await createCredential('246810')
    expect(credential.hash).toHaveLength(64); expect(credential.salt).toHaveLength(32)
    expect(credential.hash).not.toContain('246810')
    expect(await verifyPin('246810', credential)).toBe(true)
    expect(await verifyPin('000000', credential)).toBe(false)
    expect(await verifyPin('24681', credential)).toBe(false)
  })
  it('相同密码每次产生不同随机盐', async () => {
    const a = await createCredential('246810'), b = await createCredential('246810')
    expect(a.salt).not.toBe(b.salt); expect(a.hash).not.toBe(b.hash)
  })
  it('拒绝非 6 位数字密码', async () => { await expect(createCredential('abc123')).rejects.toThrow('6 位'); await expect(createCredential('12345')).rejects.toThrow() })
})