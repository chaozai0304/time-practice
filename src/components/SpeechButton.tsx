import { useEffect, useState } from 'react'
import type { Question } from '../lib/model'
import { englishSpeechAvailability, englishToRead, speakEnglish, stopEnglishSpeech } from '../lib/speech'
import type { SpeechAvailability } from '../lib/speech'

export function SpeechButton({ question, paused = false }: { question: Question; paused?: boolean }) {
  const [status, setStatus] = useState<SpeechAvailability>({ available: false, message: '正在检查本地英语语音…' }), [heard, setHeard] = useState(false), [busy, setBusy] = useState(false)
  const text = englishToRead(question)
  useEffect(() => {
    let live = true
    if (text) void englishSpeechAvailability().then(result => { if (live) setStatus(result) }).catch(() => { if (live) setStatus({ available: false, message: '本地英语语音不可用，文字练习不受影响。' }) })
    const hide = () => { if (document.hidden) stopEnglishSpeech() }
    document.addEventListener('visibilitychange', hide)
    return () => { live = false; document.removeEventListener('visibilitychange', hide); stopEnglishSpeech() }
  }, [text])
  useEffect(() => { if (paused) stopEnglishSpeech() }, [paused])
  if (!text) return null
  return <div className="speech-control">
    <button type="button" className="button secondary" disabled={paused || busy || !status.available} onClick={async () => {
      setBusy(true)
      try { const result = await speakEnglish(text); setStatus(result.message.includes('取消') ? { ...result, available: status.available } : result); if (result.available) setHeard(true) }
      catch { setStatus({ available: false, message: '朗读未能启动，请继续文字练习。' }) }
      finally { setBusy(false) }
    }}>{busy ? '准备发音…' : heard ? '重听英文（听写）' : '听英文（听写）'}</button>
    <p className="small muted" role="status">{status.message} 只读发音，不显示或自动填写答案。</p>
  </div>
}