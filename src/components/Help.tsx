import { Dialog } from './Dialog'
export function Help({ onClose }: { onClose: () => void }) {
  return <Dialog title="学伴时光使用指南" onClose={onClose} wide><div className="help-steps">
    <p><strong>01 · 准备题目</strong>选择孩子的年级与学科，使用示例题、手动添加，或导入 CSV / JSON。文件不会上传至服务器。</p>
    <p><strong>02 · 设定节奏</strong>设置 1–120 分钟间隔、每轮答对 1–20 道题。答错重做，不限尝试次数，达到目标才恢复正常页面。</p>
    <p><strong>03 · 开启守护</strong>安卓需要浮层权限和后台运行权限。计时按经过的时间计算，包含屏幕关闭时间；系统锁屏期间不覆盖锁屏，解锁后再答题。</p>
    <p><strong>04 · 家长退出</strong>点「家长停止守护」或答题页「家长退出」并输入密码，可立即结束守护。退出到系统桌面不代表已停止安卓守护。</p>
    <div className="notice"><strong>重要的系统边界</strong><br />安卓浮层并非系统锁屏，通知栏、强制停止、卸载、重启和系统安全页面可能绕过；本版重启后需重新开启守护。iOS 仅应用内计时，不能拦截其他 App；可配合「设置 → 辅助功能 → 引导式访问」。真正 iOS 跨应用管控需要 Apple 批准 Family Controls 权限并开发 Screen Time 扩展，本版未包含。</div>
    <p className="small muted">所有数据存于本机，卸载可能清空。建议定期从题库和学习记录页面导出备份。密码不可找回，示例题不是完整教材。原生应用支持安卓 8+、iOS/iPadOS 15+。</p>
  </div></Dialog>
}