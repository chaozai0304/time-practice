import { Capacitor, registerPlugin } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { Attempt, Credential, Question, Settings } from './model'

export interface GuardStatus {
  active: boolean
  locked: boolean
  deadline: number
  correct: number
  overlayGranted: boolean
  running: boolean
  error: string
  attempts: Attempt[]
  overlayVisible: boolean
  overlayWidth: number
  overlayHeight: number
  parentVisible: boolean
  quizActivityVisible: boolean
  mainForeground: boolean
  displayState: string
  lastQuizRequestAt: number
  lastQuizActivityAt: number
  lastQuizActivitySource: string
  appVersion: string
  lastHeartbeatAt: number
  lastOverlayAt: number
  batteryUnrestricted: boolean
  notificationsAllowed: boolean
  device: string
  diagnostics: { at: number; event: string; detail: string }[]
}
interface LearningGuardPlugin {
  getStatus(): Promise<GuardStatus>
  requestOverlay(): Promise<void>
  openBackgroundSettings(options: { screen: 'app' | 'battery' }): Promise<void>
  resumeService(): Promise<void>
  start(options: { questions: Question[]; settings: Settings; credential: Credential }): Promise<void>
  stop(options: { pin: string }): Promise<void>
  verifyParent(options: { pin: string; credential: Credential }): Promise<{ valid: boolean }>
}
export const LearningGuard = registerPlugin<LearningGuardPlugin>('LearningGuard')
export const isAndroid = Capacitor.getPlatform() === 'android'
export const isNative = Capacitor.isNativePlatform()
export async function exportFile(filename: string, content: string, mime = 'application/json') {
  if (isNative) {
    const file = await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title: filename, url: file.uri, dialogTitle: '导出到文件或分享' })
  } else {
    const url = URL.createObjectURL(new Blob([content], { type: mime }))
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}