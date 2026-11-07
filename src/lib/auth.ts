import type { Credential } from './model'
export const PIN_ITERATIONS = 120_000
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
async function derive(pin: string, salt: string, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bytes = Uint8Array.from(salt.match(/.{2}/g) ?? [], h => parseInt(h, 16))
  return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: bytes, iterations, hash: 'SHA-256' }, key, 256)))
}
export async function createCredential(pin: string): Promise<Credential> {
  if (!/^\d{6}$/.test(pin)) throw new Error('请设置 6 位数字家长密码')
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  return { salt, hash: await derive(pin, salt, PIN_ITERATIONS), iterations: PIN_ITERATIONS }
}
export async function verifyPin(pin: string, credential: Credential) {
  if (!/^\d{6}$/.test(pin)) return false
  const value = await derive(pin, credential.salt, credential.iterations)
  let diff = value.length ^ credential.hash.length
  for (let i = 0; i < value.length; i++) diff |= value.charCodeAt(i) ^ (credential.hash.charCodeAt(i) || 0)
  return diff === 0
}