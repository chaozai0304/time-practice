import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Preferences } from '@capacitor/preferences'
import { initialData, loadData, saveData } from '../../src/lib/storage'
import { startSession } from '../../src/lib/session'
import { validateQuestion } from '../../src/lib/questions'
import { createCredential, verifyPin } from '../../src/lib/auth'
vi.mock('@capacitor/preferences', () => ({ Preferences: { get: vi.fn(), set: vi.fn() } }))
beforeEach(() => { vi.clearAllMocks(); vi.mocked(Preferences.set).mockResolvedValue() })
describe('本地存储和启动恢复', () => {
  it('新游戏难度持久化不修改旧学习规则、密码或题库', async () => { const data = initialData(); data.gameSettings = { spawnIntervalSeconds: 1.5, fallSpeed: 4 }; vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(data) }); const restored = await loadData(); expect(restored.gameSettings).toEqual(data.gameSettings); expect(restored.settings).toEqual(data.settings); expect(restored.questions).toEqual(data.questions); expect(restored.credential).toEqual(data.credential) })
  it('真实非空1.3结构恢复保留密码/规则/记录/截止时间，课程字段只补未标注', async () => {
    const old = initialData(); old.questions = old.questions.filter(q => q.grade === 3 && q.subject === '数学').slice(0, 2).map(q => { const { semester: _semester, lesson: _lesson, lessonTitle: _title, ...rest } = q; return rest })
    old.settings = { ...old.settings, name: '恢复演示', intervalMinutes: 27, requiredCorrect: 6 }; old.credential = await createCredential('246810')
    old.attempts = [{ id: 'fixture-attempt', questionId: old.questions[0].id, prompt: old.questions[0].prompt, subject: '数学', answer: 'bad', correct: false, at: Date.now() }]
    old.session = { ...startSession(old.questions, old.settings, Date.now(), true), correct: 1, index: 1 }
    vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(old) }); const loaded = await loadData()
    expect(loaded.settings).toEqual(old.settings); expect(loaded.credential).toEqual(old.credential); expect(await verifyPin('246810', loaded.credential!)).toBe(true); expect(loaded.attempts).toEqual(old.attempts); expect(loaded.session).toEqual(old.session)
    expect(loaded.questions).toHaveLength(2); expect(loaded.questions.map(q => q.id)).toEqual(old.questions.map(q => q.id)); expect(loaded.questions.every(q => q.semester === 'unspecified' && q.lesson === null)).toBe(true)
    await saveData(loaded); expect(vi.mocked(Preferences.set).mock.calls.at(-1)![0].key).toBe('sprout.data.v1')
  })
  it('首次使用提供题库但不设置默认密码', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null })
    const data = await loadData()
    expect(data.questions).toEqual(initialData().questions); expect(data.contentRevision).toBe(2); expect(data.credential).toBeNull()
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
  it('非空旧数据升级保留题 ID、停用状态、密码、真实错题及已锁定进度，且只补一次', async () => {
    const data = initialData(); delete data.contentRevision
    const q = validateQuestion({ ...data.questions[0], id: 'parent-question', enabled: false, prompt: '家长自编题' })
    data.questions = [q]; data.credential = { salt: 'fixture', hash: 'fixture', iterations: 120000 }
    data.attempts = [{ id: 'real-fixture', questionId: q.id, prompt: q.prompt, subject: q.subject, answer: 'bad', correct: false, at: Date.now() }]
    data.session = { active: true, locked: true, correct: 1, index: 1, queue: [q.id], deadline: Date.now() - 1000, practice: false }
    vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(data) })
    const migrated = await loadData()
    expect(migrated.questions[0]).toEqual(q); expect(migrated.credential).toEqual(data.credential); expect(migrated.attempts).toEqual(data.attempts); expect(migrated.session).toEqual(data.session)
    expect(migrated.questions.length).toBeGreaterThan(1000)
    migrated.questions = [q] // Parent intentionally removed new questions after the upgrade.
    vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(migrated) })
    expect((await loadData()).questions).toEqual([q])
  })
  it('已满的旧题库升级不超容量、不覆盖现有内容', async () => {
    const data = initialData(); delete data.contentRevision
    data.questions = Array.from({ length: 5000 }, (_, i) => ({ ...data.questions[0], id: `parent-${i}`, prompt: `家长题 ${i}` }))
    vi.mocked(Preferences.get).mockResolvedValue({ value: JSON.stringify(data) })
    const migrated = await loadData(); expect(migrated.questions).toEqual(data.questions); expect(migrated.contentRevision).toBe(2)
  })
})