import { execFileSync } from 'node:child_process'

// uname executed by an x64 Node process can report the Rosetta process architecture.
// Query hardware support instead; never change the user's global Node/Chrome setup.
export function isNativeArmMac(platform = process.platform, query = () => execFileSync('/usr/sbin/sysctl', ['-n', 'hw.optional.arm64'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })) {
  if (platform !== 'darwin') return false
  try { return query().trim() === '1' } catch { return false }
}