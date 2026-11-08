import { describe, expect, it, vi } from 'vitest'
import { isNativeArmMac } from '../../scripts/browser-platform.mjs'

describe('电脑浏览器架构检测', () => {
  it('按硬件ARM标记检测，不被x64 Node/Rosetta进程误导', () => { expect(isNativeArmMac('darwin', () => '1\n')).toBe(true) })
  it('Intel Mac与查询失败正常回退', () => { expect(isNativeArmMac('darwin', () => '0\n')).toBe(false); expect(isNativeArmMac('darwin', () => { throw new Error('unavailable') })).toBe(false) })
  it('非macOS不调用sysctl也不使用ARM启动器', () => { const query = vi.fn(() => '1'); expect(isNativeArmMac('linux', query)).toBe(false); expect(isNativeArmMac('win32', query)).toBe(false); expect(query).not.toHaveBeenCalled() })
})