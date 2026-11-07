# 为什么使用 Capacitor

## 一套代码导出 Android 和 iOS

| 方案 | Android | iOS | 本项目适配 |
| --- | --- | --- | --- |
| React + Capacitor（已采用） | Gradle 生成 APK/AAB | Xcode 生成归档并签名导出 IPA | 复用现有 React 页面、Remotion Player 和 Three.js；需原生能力时用插件 |
| Flutter | APK/AAB | 签名 IPA | UI 需重写为 Dart；不能直接复用 Remotion React 场景 |
| React Native / Expo | 原生 Android 包 | 原生 iOS 包 | 可共享 TypeScript 逻辑，但 Web Remotion/ThreeCanvas 需 WebView 或另做原生渲染层 |

这里选择 **Capacitor 8**，不是将网页改后缀：项目中有真实的 `android/`、`ios/` 原生工程，安卓还实现了后台服务与答题浮层。

## 常用入口

- `npm run dev`：应用预览。
- `npm run motion:studio`：Remotion 时间轴，默认 `http://localhost:3001/LearningIsland`。
- `npm run icons:generate`：从 `public/sprout.svg` 生成安卓与 iOS 图标，须本机 Chrome。
- `npm run android:apk`：构建安卓调试安装包。
- `npm run ios:archive`：尝试生成无签名 Xcode 归档；它不是可安装 IPA。
- `npm run ios:open`：打开 Xcode，配置自己的 Team 和描述文件，再 Archive / Distribute 导出安装包。

安卓依赖默认直连；若某台机器需要代理，由使用者配置有效的构建代理。本机 `127.0.0.1:7890` 实测连接重置，因此未写入工程或全局设置。

## 不能被框架消除的限制

- **Apple 签名**：iOS 设备安装需要有效签名、描述文件及设备/分发授权。本机没有有效代码签名身份时，不能生成通用可安装 IPA。
- **Xcode 组件**：只有 Xcode 主程序或 SDK 路径不代表平台支持已完整安装；若提示 `iOS 26.5 is not installed`，须在 Xcode → Settings → Components 安装/修复对应组件。
- **iOS 跨 App 管控**：本版只在应用内答题。Family Controls / ManagedSettings / DeviceActivity 和 Screen Time 扩展开发及 Apple 授权是独立工作，换 Flutter/Expo 也不会自动获得这些能力。
- **安卓权限**：浮层、后台服务与厂商省电策略仍需家长授权，不能宣称无法绕过的系统锁屏。

## 3D 与省电

首页场景由 Remotion 4.0.540 + Three.js + React Three Fiber 驱动，只使用本地几何体，无远端贴图/模型。业务 UI 与 3D 包分开加载，减少动态效果时不加载 3D 场景。

### 答题锁定页：全屏宇宙背景

- 不是上方动画、下方白色题目卡片：宇宙铺满视口，题目容器完全透明，选项与确认按钮保留清晰边界。
- 背景包含程序化星云、旋转星系、巨型环形行星、大型轨道、远近星流和近景天体，不依赖在线贴图。
- 暂停按钮通过独立的前景层显示，位于题目内容之上、家长入口之下；测试检查真实触点命中，不使用强制点击跳过遮挡。
- 背景长边最多渲染 1080px，DOM 文字和按钮仍按设备分辨率清晰显示；答对切题不重启背景场景。
- 安卓原生浮层用本地 `guard-motion.html` 作为全屏背景，题目和密码仍由原生界面处理。动画 WebView 没有 JavaScript 原生桥、不接收答案/PIN、不访问外部网址。
- 动画失败或系统减少动态效果时退回同主题静态宇宙，不影响作答、家长退出或系统紧急能力。

### 通用动态与省电规则

- 小岛嫩芽按当天真实答对题数计算等级。
- 提供暂停按钮，视口外、后台、答题锁定和模态框打开时暂停。
- WebGL2 不支持或上下文丢失时回退为本地 SVG，不影响题库与答题。
- 过关纸屑动画不阻塞解锁，减少动态效果时不播放。
- 真机帧率、电量与系统浮层需要设备验收，浏览器测试不能代替。

正式商用前还需核对所用 Remotion 版本及团队规模对应的许可证要求。