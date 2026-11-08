import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { englishSpeechAvailability, englishToRead, localEnglishVoice, speakEnglish, stopEnglishSpeech } from '../../src/lib/speech'
import { validateQuestion } from '../../src/lib/questions'
vi.mock('../../src/lib/native', () => ({ isAndroid: false, LearningGuard: {} }))
const voice = (lang: string, localService = true) => ({ lang, localService, name: lang, voiceURI: lang, default: false }) as SpeechSynthesisVoice
const synth = { getVoices: vi.fn(() => [voice('en-US')]), cancel: vi.fn(), speak: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }
beforeEach(() => { vi.clearAllMocks(); synth.getVoices.mockReturnValue([voice('en-US')]); vi.stubGlobal('window', { speechSynthesis: synth }); vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; constructor(text: string) { this.text = text } }) })
afterEach(() => { stopEnglishSpeech(); vi.unstubAllGlobals(); vi.useRealTimers() })
describe('离线英语听写', () => {
  it('只读英语填空单词，不读选择题、中文或数字', () => { const q = validateQuestion({ grade: 3, subject: '英语', prompt: '苹果', options: [], answer: 'apple' }); expect(englishToRead(q)).toBe('apple'); expect(englishToRead({ ...q, subject: '数学' })).toBe(''); expect(englishToRead({ ...q, type: 'choice' })).toBe(''); expect(englishToRead({ ...q, answer: '123' })).toBe('') })
  it('只选择本地英语语音，优先英式，禁止远程/其他语言兜底', () => { const uk = voice('en-GB'); expect(localEnglishVoice([voice('fr-FR'), voice('en-US', false), uk])).toBe(uk); expect(localEnglishVoice([voice('en-US', false), voice('zh-CN')])).toBeUndefined() })
  it('请求英语朗读，不泄露答案到提示、不填写或计分，重听会取消前次', async () => { const result = await speakEnglish('apple'); expect(result.available).toBe(true); expect(result.message).not.toContain('apple'); expect(synth.speak.mock.calls[0][0]).toMatchObject({ text: 'apple', rate: .8, lang: 'en-US', voice: { localService: true } }); await speakEnglish('book'); expect(synth.cancel).toHaveBeenCalledTimes(2) })
  it('没有本地语音时明确降级，不尝试远程朗读', async () => { synth.getVoices.mockReturnValue([voice('en-US', false)]); expect((await englishSpeechAvailability()).available).toBe(false); expect((await speakEnglish('apple')).available).toBe(false); expect(synth.speak).not.toHaveBeenCalled() })
  it('后台/切题取消尚在等待的朗读，旧回调不会播放', async () => { vi.useFakeTimers(); synth.getVoices.mockReturnValue([]); const pending = speakEnglish('apple'); stopEnglishSpeech(); await vi.advanceTimersByTimeAsync(1500); expect((await pending).message).toContain('取消'); expect(synth.speak).not.toHaveBeenCalled(); expect(synth.removeEventListener).toHaveBeenCalled() })
  it('不支持语音的环境也可返回降级状态，拒绝非词汇内容', async () => { vi.stubGlobal('window', {}); expect((await englishSpeechAvailability()).available).toBe(false); await expect(speakEnglish('<script>')).rejects.toThrow('单词') })
})