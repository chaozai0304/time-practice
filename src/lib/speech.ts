import type { Question } from './model'
import { getQuestionType } from './model'
import { isAndroid, LearningGuard } from './native'

export interface SpeechAvailability { available: boolean; message: string }
let generation = 0
export const englishToRead = (q: Question) => q.subject === '英语' && getQuestionType(q) === 'fill' && q.answer.length <= 80 && /^[a-z]+(?:[ '-][a-z]+)*$/i.test(q.answer) ? q.answer : ''
export function localEnglishVoice(voices: SpeechSynthesisVoice[]) {
  const english = voices.filter(v => v.localService && /^en(?:[-_]|$)/i.test(v.lang))
  return english.find(v => /^en[-_]GB$/i.test(v.lang)) ?? english.find(v => /^en[-_]US$/i.test(v.lang)) ?? english[0]
}
function browserSpeech() { return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined' ? window.speechSynthesis : null }
async function voices() {
  const synth = browserSpeech(); if (!synth) return []
  const current = synth.getVoices(); if (current.length) return current
  return new Promise<SpeechSynthesisVoice[]>(resolve => {
    const done = () => { clearTimeout(timer); synth.removeEventListener('voiceschanged', done); resolve(synth.getVoices()) }
    const timer = setTimeout(done, 1500); synth.addEventListener('voiceschanged', done)
  })
}
export async function englishSpeechAvailability(): Promise<SpeechAvailability> {
  if (isAndroid) return LearningGuard.getSpeechStatus()
  const voice = localEnglishVoice(await voices())
  return { available: !!voice, message: voice ? '系统本地英语语音 · 不联网合成' : '没有可用的本地英语语音；可继续看中文写英文，不会自动下载语音。' }
}
export async function speakEnglish(text: string): Promise<SpeechAvailability> {
  if (text.length > 80 || !/^[a-z]+(?:[ '-][a-z]+)*$/i.test(text)) throw new Error('只朗读英语单词或短语')
  const request = ++generation
  if (isAndroid) return LearningGuard.speakEnglish({ text })
  const voice = localEnglishVoice(await voices()), synth = browserSpeech()
  if (request !== generation) return { available: false, message: '朗读已取消' }
  if (!voice || !synth) return { available: false, message: '本地英语语音不可用，请继续文字练习。' }
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text); utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = .8
  synth.speak(utterance)
  return { available: true, message: '已请求离线朗读；请听发音并填写英文。' }
}
export function stopEnglishSpeech() {
  generation++
  if (isAndroid) void LearningGuard.stopSpeech().catch(() => {})
  else browserSpeech()?.cancel()
}