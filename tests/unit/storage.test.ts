import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Preferences } from '@capacitor/preferences'
import { initialData, loadData, saveData } from '../../src/lib/storage'
import { startSession } from '../../src/lib/session'
vi.mock('@capacitor/preferences', () => ({ Preferences: { get: vi.fn(), set: vi.fn() } }))
beforeEach(() => { vi.clearAllMocks(); vi.mocked(Preferences.set).mockResolvedValue() })
describe('本地存储和启动恢复', () => {
  it('首次使用提供题库但不设置默认密码', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null })
    const data = await loadData()
    expect(data.questions).toHaveLength(120); expect(data.credential).toBeNull()
    expect(data.session.active).toBe(false)
  })
  it('到期守护在加载时立即锁定，不给正常页面一帧可操作的窗口', async () => {
    const data = initialData()
    data.session = startSession(data.questions, data.settings, Date.now() - 3_600_000)
    vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(data) })
    expect((await loadData()).session.locked).toBe(true)
  })
  it('保留已答对进度，不因重启重新开始或放行', async () => {
    const data = initialData()
    data.session = { ...startSession(data.questions, data.settings, Date.now(), true), correct: 1, index: 1 }
    vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(data) })
    expect((await loadData()).session).toEqual(data.session)
  })
  it('损坏数据和丢失守护题目不会静默重置覆盖', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: '{broken' })
    await expect(loadData()).rejects.toThrow('停止自动覆盖')
    const data = initialData(); data.session = startSession(data.questions, data.settings, Date.now()); data.questions = []
    vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(data) })
    await expect(loadData()).rejects.toThrow('停止自动覆盖')
    expect(Preferences.set).not.toHaveBeenCalled()
  })
  it('并发保存按调用顺序执行，不被较旧写入覆盖', async () => {
    const data = initialData()
    await Promise.all([saveData(data), saveData({ ...data, settings: { ...data.settings, name: '新的昵称' } })])
    const calls = vi.mocked(Preferences.set).mock.calls
    expect(JSON.parse(calls.at(-1)![0].value).settings.name).toBe('新的昵称')
  })
})