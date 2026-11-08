# 学伴时光 · Time Practice

**玩一会，学一点。 / Play a little. Learn a little.**

本地优先的亲子学习应用：家长管理题库和学习节奏，孩子通过答题完成一次小小探索。

A local-first learning companion: parents manage questions and learning intervals, while children practice in a playful, responsive interface.

[简体中文](#zh-cn) · [English](#english) · [构建与交付 / Build status](docs/DELIVERY.md) · [反馈 / Issues](https://github.com/chaozai0304/time-practice/issues)

**React · TypeScript · Capacitor 8 · Remotion · Three.js · Android / iOS / Web**

![学伴时光桌面首页 / Desktop home screen](docs/screenshots/02-home.png)

> **重要 / Important:** 当前是普通守护与兼容诊断版本，不是不可绕过的家长控制系统。Android 系统或厂商可隐藏浮层、强停服务；iOS/Web 仅支持应用内答题。Device Owner 强管控和 Apple Screen Time 扩展尚未实现。Installing the APK does not grant system-level device management.

<a id="zh-cn"></a>
## 简体中文

### 目录

- [项目介绍与功能](#项目介绍与功能)
- [平台支持与限制](#平台支持与限制)
- [快速启动](#快速启动)
- [使用指南与截图](#使用指南与截图)
- [题库文件格式](#题库文件格式)
- [构建安装包](#构建安装包)
- [开发与验证](#开发与验证)
- [数据安全与常见问题](#数据安全与常见问题)
- [参与贡献与许可](#参与贡献与许可)

### 项目介绍与功能

学伴时光希望帮助家庭建立“玩耍—学习—继续探索”的节奏。所有题目、设置和记录保存在本机，不需要账号、服务器或 API Key。**文档提供中英文，当前应用界面主要为中文。**

- **本地题库**：小学、初中、高中共 12 年级，按学段显示科目；内置 1303 道原创基础练习，支持选择/填空/判断、手动增改删、CSV/JSON 导入、预览、校验、去重与备份。不是北京完整教材题库。
- **课程归属与批量管理**：新增、导入和在线编辑均支持年级、科目、上下册、第几课及课题；按这些字段筛选，支持跨页全选、逐题勾选、批量启用/停用/删除。删除有数量确认，保留学习记录。
- **智能复习**：新题与高错率题加权优先，近期题降权，按轮无重复排序。
- **英语双向词汇**：三年级 254 个分类基础词/短语，生成 508 道“看英语选中文”“看中文写英语”题；可导入实际教材词表并导出基础词库。教材版本未确认，**不能声明涵盖北京某版上下册全部单词**。
- **英语听写**：拼写题和单词游戏可点“听英文（听写）/重听”，使用系统本地英语语音；不显示或自动填答案、不计分。缺少本地语音时明确提示，不自动下载、联网合成或申请麦克风。
- **全屏单词射击**：中文目标直接出现在星空场景中并下落；输入对应英文、按 Enter/点“发射子弹”，正确才发射真实追踪弹，命中才消除计分。可调中文出现间隔和下落速度，支持暂停/听写/提示，10 次命中后休息；错误作答记入学习足迹，漏词不伪造作答记录。
- **学习规则**：间隔 1–120 分钟，每轮累计答对 1–20 道；答错留在当前题，应用内没有跳过或自动超时放行按钮。
- **独立练习**：先体验答题，不启动跨应用守护。支持选择题、填空题、判断题，加权题序与随机选择题选项；判断题固定正确/错误，规范化全角数字、空格与英文大小写。
- **家长验证**：自行设置 6 位密码，无默认密码；随机盐和 PBKDF2-HMAC-SHA256（120,000 次），不保存明文。连续输错 5 次暂停验证 30 秒。
- **成长足迹**：真实答题统计、连续学习天数、每周图表和最近 10,000 次答题记录；支持导出。
- **自适应视觉**：软 3D 学习小岛、全屏宇宙答题背景、透明题目层、清晰按钮和过关纸屑。Remotion + Three.js 动画支持暂停、减少动态效果、后台停播及静态降级。
- **Android 1.5**：包含重做的全屏中文射击与难度保存，保留课程标注、离线听写、三题型、计时守护、家长数字键盘及诊断。不是系统级防退出版本。

### 平台支持与限制

| 平台 | 支持内容 | 不能保证的能力 |
| --- | --- | --- |
| Android 8+ / API 26+ | 原生前台计时、经授权的跨应用浮层、普通原生答题页、本地管理 | 无法阻止系统强停、卸载、重启或厂商清理；后台显示依赖系统许可与策略 |
| iOS / iPadOS 15+ | iPhone/iPad 原生工程、应用内答题、本地题库和记录 | 尚无 Family Controls / ManagedSettings / DeviceActivity 扩展，不能拦截其他 App |
| Web | 桌面、手机、平板浏览器中的题库、规则、练习和应用内计时 | 网页不能遮挡其他应用；后台计时可能受浏览器限制 |

计时包含息屏时间，不是“实际游戏使用时长”的统计。Android 使用单调时钟；Web/iOS 保存截止时间并在回到前台时校验。浏览器刷新不会重新获得完整玩耍时间。

已读取到荣耀 Android 14 真机的系统管家 **force-stop** 记录：进程和服务被结束，普通权限不能阻止。不能把“窗口已挂载”“回到 App 后弹题”或“虚拟测试通过”当作可靠后台拦截。详见 [荣耀权限、复测与诊断指南](docs/ANDROID_HONOR.md)。

### 快速启动

需要 **Node.js 22.12+** 和 npm；首次安装依赖需联网，运行时不需要服务器或密钥。

```bash
git clone https://github.com/chaozai0304/time-practice.git
cd time-practice
npm ci
npm run dev
```

在电脑浏览器打开开发服务显示的本地地址，默认 `http://127.0.0.1:5173/`。使用响应式预览可以查看手机和平板布局；这不是原生设备拦截演示。

### 使用指南与截图

**截图说明**：以下图片均由电脑上的真实网页界面生成，使用隔离的演示数据，不来自平板或孩子的实际记录。它们展示操作位置和布局，不证明 Android 后台拦截。动画会根据设备能力显示 3D 或静态回退。

#### 1. 家长设置密码

首次打开会出现保护设置页。输入两次相同的 **6 位数字密码**，点击“开启学伴时光”，进入首页。密码由你自己设置，截图和测试中的演示数据不是默认密码。请妥善保管，当前没有云端找回功能。

<img src="docs/screenshots/01-welcome.png" width="480" alt="首次设置页：两次输入家长密码后进入应用" />

#### 2. 调整学习规则

首页点击右上角家长头像或“家长设置”，先验证密码。设置昵称、年级、学科、答题间隔和过关题数，点击“保存学习规则”并再次验证。**守护运行中须先停止，才能修改规则、题库和密码。**

![家长设置：年级、学科、时间间隔和过关目标](docs/screenshots/03-settings.png)

#### 3. 准备或导入题库

进入“我的题库”并验证密码。可以点“添加题目”手动填写；也可先下载模板，按格式编辑 CSV/JSON，再点“导入题库”、验证密码并选择文件。

![本地题库：下载模板、导入、添加、筛选与导出入口](docs/screenshots/04-library.png)

应用先校验并显示预览，确认题目数量与内容后点击“确认保存到本机”。不会上传到服务器，也不会覆盖原题；重复题会跳过。

<img src="docs/screenshots/05-import.png" width="560" alt="导入预览：查看校验后的题目，再确认保存到本机" />

模板：[三题型 CSV](examples/questions.csv) · [JSON](examples/questions.json) · [英语词表 CSV](examples/vocabulary.csv) · [词表 JSON](examples/vocabulary.json)。题型、学段、开关和教材校对详见 [学习内容说明](docs/LEARNING_CONTENT.md)。导出文件包含正确答案，请由家长保管。

使用年级/科目/题型/单元/册次/课次/启用状态筛选；关键词也可检索课题与来源。可操作全部筛选结果，或勾选任意题批量启停/删除，分页每页 50 道。“全选筛选结果”包含其他页；批量删除需验证密码、核对清单并输入数量确认，取消不删除。编辑可改变内容和完整课程归属，保留原 ID/历史。游戏使用当前年级启用英语拼写题；练习/守护还受所选科目限制。

<img src="docs/screenshots/11-course-editor.png" width="560" alt="真实网页课程编辑器：年级、科目、上下册、第几课、课题、内容及保存按钮" />

图片中课次来自隔离导入模板，只演示格式，不代表北京教材归属已校对。英语拼写题可点“听英文（听写）”，听后填写答案；缺本地英语语音时提示，仍可看中文作答。

#### 4. 练习或开启守护

- **“先练习一下”**：马上开始一次应用内练习，不启动后台跨应用守护，适合首次体验。
- **“开启学习守护”**：按规则开始计时。Android 需家长授权浮层、通知并允许后台活动；Web/iOS 只在应用内答题。
- 首次测试建议设为 **1 分钟**，家长陪同检查。Android 切换其他 App 后应自动出现题目，**返回学伴或手动点通知后才出现，不算后台验收通过**。

到期或练习时，选择一个选项、判断正确/错误，或在填空框填写答案，点击“确认答案”。答错继续当前题；累计答对目标题数后，练习结束，普通守护按最新记录重排下一轮。宇宙背景可暂停，不影响答题。

![答题界面：题目、选项、进度、确认答案与家长退出](docs/screenshots/06-quiz.png)

#### 5. 家长停止守护

首页点击“家长停止守护”，或答题页点“家长退出”，验证正确密码后停止。取消验证会返回答题，不会停止守护。

<img src="docs/screenshots/07-parent.png" width="480" alt="网页家长验证：输入自己设置的密码，验证后停止守护" />

上图是 **网页验证页**；Android 1.2 使用独立原生页面与页面内数字键盘，避免唤起系统输入法，本图不展示该原生页面。停止守护不等于强杀进程，iOS 不提供应用自行强退能力。

#### 6. 查看记录与备份

进入“学习足迹”查看实际尝试和正确率；点击“导出记录”并验证密码进行备份。题库备份则在“我的题库 → 导出”。截图中的一条记录来自采集过程中实际完成的一次演示作答。

![学习足迹：演示作答记录与导出入口](docs/screenshots/08-records.png)

#### 手机布局

相同功能会适配窄屏，底部导航提供首页、题库、足迹与家长设置入口。截图为浏览器 `390 × 844` 视口，并非手机系统截图。

<img src="docs/screenshots/09-mobile.png" width="300" alt="手机宽度浏览器预览：学习首页与底部导航" />

#### 单词游戏

首页点击“进入单词星际跑酷”：中文目标从场景上方向下移动 → 点中文可锁定（也可填写任意场上词） → 输入英文 → Enter/“发射子弹” → 正确拼写生成追踪弹 → 弹道飞行 → 命中消除并计分。答错不发射，也不显示答案；“拼写提示”只给首字母和字符数，听写仍使用本地英语语音。

“调整难度”暂停场景，可调 **中文出现间隔 1–12 秒**（越小越频繁）、**下落速度 1–8**（越大越快），自动保存本机；同时最多 3 个不同英文目标。暂停保留中文、子弹与输入草稿，后台或守护接管也暂停。漏词计入游戏漏词数，不伪造输入/错误记录；题库不足时循环，命中 10 个后提醒休息。游戏不能解除守护。

![全屏单词射击：场内中文目标、真实飞行子弹、命中进度、输入框与难度入口](docs/screenshots/10-game.png)

### 题库文件格式

| 字段 | 要求 |
| --- | --- |
| `grade` | 1–12，或年级标签；7–9=初中、10–12=高中 |
| `subject` | 当前学段的精确科目名称，详见 [学习内容](docs/LEARNING_CONTENT.md) |
| `type` | `choice` / `fill` / `boolean`（或中文题型）；缺省兼容旧选项推断 |
| `prompt` | 题干，1–1000 字符 |
| `options` | JSON 字符串数组；CSV 用 `\|` 分隔；填空/判断可留空，判断自动固定选项 |
| `answer` | 选择题填完整选项文字，**不是 A/B/C/D**；填空填准确答案；判断填正确/错误或 true/false |
| `explanation` | 可选解析，家长在题库中查看；答错时不直接展示 |
| `enabled` | 可选 true/false，省略默认启用；停用题不会出现 |
| `unit` / `source` / `word` | 可选单元、教材来源和对应英语单词 |
| `semester` | `upper`/上册、`lower`/下册、`unspecified`/未标注；旧文件缺省未标注 |
| `lesson` / `lessonTitle` | 第几课（整数 1–300 或留空）、可选课题名称；模板课号只是示例，不代表官方教材进度 |

单文件最多 **5 MB**，每批 **1–2000 道**，本地最多 **5000 道**。一条无效会拒绝整批并提示题号；按年级、学科、题型、题干、选项和答案去重。独立词表每批 1–1000 词，每词生成两题。填空按规范化后的文字精确匹配，不支持多个等价答案或复杂表达式求值。当前不支持照片 OCR、PDF/Word 自动识题。升级只追加一次基础题，不覆盖原 ID、密码、历史或计时进度；家长之后删除的新题不会反复补回。

### 构建安装包

#### Android APK

准备 **Java 21、Android SDK Platform 36、匹配 Build Tools** 和更新的系统 WebView。本人确认 SDK 许可后，配置 `ANDROID_HOME`，或在不提交的 `android/local.properties` 中设置 `sdk.dir`。

```bash
npm run android:apk
```

脚本先构建并同步资源，再运行原生单测与 `assembleDebug`。成功产物：`android/app/build/outputs/apk/debug/app-debug.apk`。调试包可测试安装，不是商店正式发布包。更新同签名版本建议**覆盖安装，不要先卸载**。

**已有最新包时手动覆盖更新**：不必为安装再次跑全量测试。平板允许该电脑的 USB 调试后，从项目根目录由你自行运行：

```bash
"$HOME/Library/Android/sdk/platform-tools/adb" install -r artifacts/android/sprout-android-1.5-debug.apk
```

`-r` 表示覆盖安装、通常保留数据。先由家长停止守护并备份，不卸载/清数据；多设备用 `-s <设备序列号>` 指定目标。若报签名不一致或降级，先核对包，不用卸载/强制降级绕过。更新后确认版本与配置，再恢复守护。本段只是用户手动步骤，不授权 AI 自动枚举、安装或设置设备。

仓库不提交 APK、IPA、构建缓存或签名材料。也可在 [GitHub Actions](https://github.com/chaozai0304/time-practice/actions) 的 **Android 构建成功后**下载 `sprout-android-debug-apk` 产物；这里不承诺工作流已成功或存在已发布安装包。

默认 Gradle 缓存为 `build/gradle-home/`，不改用户全局初始化脚本；已有 `GRADLE_USER_HOME` 时遵循该配置。正式发布需自有 release 签名、真机验收及商店审核；`specialUse` 前台服务需申报，不保证审核通过。

#### iOS / iPadOS

准备 **macOS、Xcode 26+、iOS 平台组件**，工程为 `ios/App/App.xcodeproj`，使用 Swift Package Manager。执行 `npm run sync` 和 `npm run ios:open`，在 Xcode 选择自己的 Team 并配置签名，然后真机 Run 或 Archive / Distribute。

`npm run ios:check` 是无签名编译检查；`npm run ios:archive` 尝试生成待签名归档。**两者不等于可安装 IPA**，没有证书、描述文件和分发条件不能生成通用安装包。本机历史构建受平台组件与签名阻塞，状态见 [交付记录](docs/DELIVERY.md) 和 [Xcode 配置指南](docs/IOS_SETUP.md)。

### 开发与验证

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 本地网页开发 |
| `npm run build` | TypeScript 校验与生产构建，输出 `dist/` |
| `npm test` | 状态机、导入、存储和密码单测 |
| `npm run lint` | 代码规范检查 |
| `npm run test:e2e` | 桌面 / 手机 / 平板浏览器流程测试 |
| `npm run test:e2e:profile` | 本机隔离浏览器逐步计时：启动、页面、PBKDF2、交互与截图，不访问设备 |
| `npm run docs:screenshots` | 隔离浏览器演示，重建 `docs/screenshots/` 图片；需要 Google Chrome |
| `npm run docs:verify` | 只读检查 README/AI 规则链接、语言锚点、MIT 元数据、截图和 Git 发布文件的常见敏感模式 |
| `npm run sync` | 构建并同步 Android/iOS 资源，不安装到设备 |
| `npm run android:open` / `npm run ios:open` | 打开原生 IDE 工程 |
| `npm run motion:studio` | Remotion 时间轴，默认端口 3001 |
| `npm run icons:generate` | 生成 Android/iOS 图标 |

浏览器测试需 Google Chrome，使用生产预览并串行覆盖 `1440 × 1000`、`390 × 844`、`1024 × 768`。Apple Silicon 可通过 `scripts/chrome-arm64.sh` 使用原生 ARM Chrome；复制源码丢失权限时运行 `chmod +x scripts/chrome-arm64.sh`。截图脚本使用电脑本地端口 4175，结束后关闭预览，不使用 ADB 或真实设备数据。

ARM 硬件检测统一使用 `scripts/browser-platform.mjs` 的 `sysctl hw.optional.arm64`，避免 x64 Node/Rosetta 内 `uname` 的进程架构误判。本机保持单 worker，54项全量从约33.7分钟降至1.5分钟，不保证所有电脑相同耗时。开发时可按 `--project=tablet` 和 `--grep` 选择相关用例；交付仍跑全量，不增加超时/强制点击/删断言掩盖失败。计时入口在本地4177运行两轮隔离流程并清理服务。

不要重复运行 `cap add`，否则可能覆盖自定义原生代码。应用无需 API Key 或运行时环境变量，不需要 `.env`。

**代码导航**：`src/lib/` 为题库、会话、密码和存储逻辑；`src/components/` 为交互界面；`src/motion/` 为动画；`android/app/src/main/java/com/sprout/timepractice/` 为原生服务、答题页面、桥接与密码验证；`tests/` 为网页测试。

### 数据安全与常见问题

- **重新安装影响配置吗？** 同包名、同签名的新版覆盖更新通常保留题库、密码、记录和学习规则；本版继续使用原存储键，不重置旧配置。先卸载、清除应用数据或浏览器存储会删除这些内容。建议家长先导出题库与记录；不同签名通常不能覆盖，不能为绕过签名问题要求卸载。更新会终止旧进程，之后检查守护状态/系统权限，必要时由家长恢复服务；保留数据不等于服务一定连续运行。
- **离线与隐私**：题库、昵称、答题记录、密码派生值仅在本机；无账号、服务器、广告、埋点或外部字体，不统计其他 App 内容或使用记录。Android 关闭自动备份；iOS 数据可能随用户设备备份保存。
- **忘记密码怎么办？** 没有云端找回或后门。卸载、清除数据或浏览器存储会删除本地内容，建议定期导出题库和记录，不能靠反复重装修复系统强停。
- **后台不弹题怎么办？** 检查后台活动、电池限制、通知和浮层权限，并导出运行诊断；窗口挂载并不证明系统让它可见。荣耀上滑清理已出现系统级强停，普通 APK 无法保证恢复或防退出。
- **Device Owner 是否已经支持？** 尚未实现。仅安装 APK 或开启普通设备管理员不等于系统级强管控；未来启用需另行开发、明确授权、检查设备条件和验收。
- **iOS 能拦截其他 App 吗？** 当前不能。引导式访问可以由家长自行配置用于应用内场景；跨应用能力需另行开发 Apple Screen Time 扩展并取得授权。
- **测试通过是否代表真机可用？** 不代表。网页/JVM 回归不证明厂商后台策略、实际输入法或系统窗口合成行为。发布前须在目标设备验证，并保留紧急功能和系统安全能力。

更多：[平台与签名边界](docs/CROSS_PLATFORM.md) · [荣耀诊断](docs/ANDROID_HONOR.md) · [构建与验证记录](docs/DELIVERY.md) · [设计规范](design-system/sprout/MASTER.md)。

### 参与贡献与许可

欢迎通过 [Issues](https://github.com/chaozai0304/time-practice/issues) 提交问题或通过 Pull Request 改进。请附应用版本、系统版本、复现步骤及**脱敏**截图/诊断；不要上传密码、密码哈希、密钥或孩子的真实题库和学习记录。提交前运行单测、Lint 和构建，涉及交互时补充浏览器测试。

本应用主体采用 [MIT License](LICENSE)。第三方依赖和附带工具仍遵循各自许可证；`ui-styling` 保留其 [Apache 2.0 许可证](.github/prompts/ui-styling/LICENSE.txt)，Remotion 等依赖的使用条件不因本项目采用 MIT 而改变。

**AI 开发要求**：完整规则只保存在 [AGENTS.md](AGENTS.md)，[CLAUDE.md](CLAUDE.md) 通过原生导入引用它，不复制正文；开始任务前实际读取并查阅 [历史教训](docs/AI_LESSONS.md)。规则保留设备/委派授权、证据分级、数据保护、测试、截图、产物与发布检查，以及遇错主动复盘。

<a id="english"></a>
## English

### Overview

**Time Practice (学伴时光)** is a local-first parent–child learning companion built with React, TypeScript and Capacitor 8. Parents configure learning intervals and maintain an offline question library. Children answer questions in a playful interface featuring Remotion and Three.js animations.

No account, backend or API key is required at runtime. **The documentation is bilingual; the application UI is currently primarily in Chinese.** This is a regular guard/compatibility-diagnostics build, **not a tamper-proof parental-control system**.

### Features and platform support

- Grades 1–12 (primary/junior/senior), stage-specific subjects and 1303 original foundation questions—not a verified complete Beijing curriculum.
- Multiple-choice, text-answer and true/false questions; parent-controlled per-question/bulk enable switches, subject/type/unit filters, new/error weighting and recent-question downweighting.
- Course metadata includes upper/lower book, lesson number and lesson title, editable alongside grade/subject/content. Filter, select across pages and bulk enable/disable/delete with PIN verification and count confirmation; deletion retains learning history.
- English spelling and Word Runner offer replayable dictation with local system English voices only. No automatic answer filling, scoring, microphone, voice download or remote synthesis; missing voices degrade to text practice.
- 254 grade-three foundation words/phrases produce 508 English-to-Chinese choice and Chinese-to-English spelling questions. Import/export vocabulary by unit; the exact textbook and full two-semester vocabulary coverage remain unverified.
- Full-screen Word Runner: Chinese targets fall inside the game scene; correct English launches a real homing projectile, and collision—not submission—clears a target and scores. Spawn interval/fall speed are adjustable and stored locally, pause retains targets/projectiles/drafts, and ten hits prompt a rest. Wrong attempts are recorded; missed targets are not fabricated answers. No guarding bypass.
- Configurable 1–120 minute intervals and 1–20 correct answers per round. Incorrect answers stay on the current question; no in-app skip or timeout bypass.
- Separate practice mode, three question types, weighted question ordering, shuffled choice options and normalized answer comparison.
- Local question editing, CSV/JSON import with validation, preview and deduplication, and question/record exports.
- Parent-created six-digit PIN, salted PBKDF2-HMAC-SHA256 with 120,000 iterations, and a 30-second verification cooldown after five failures. No default PIN or cloud recovery.
- Responsive desktop/tablet/phone layouts, learning statistics, a 3D learning island and full-screen universe quiz background, animation pause and reduced-motion/static fallbacks.
- Android 1.5 includes the redesigned full-screen spelling shooter and persistent difficulty, retaining course management, offline dictation, native guarding and diagnostics. Not system-level force-stop protection.

| Platform | Supported | Important limitation |
| --- | --- | --- |
| Android 8+ / API 26+ | Native foreground timer and permission-dependent cross-app overlay/quiz entry | The OS or OEM can hide windows or force-stop the app; uninstall/reboot/cleanup cannot be prevented by this build |
| iOS / iPadOS 15+ | Native project, local library and in-app quizzes | No Family Controls / ManagedSettings / DeviceActivity extensions; no cross-app interception |
| Web | Responsive local library, practice and in-app timer | A website cannot block other apps; browser background scheduling is restricted |

Elapsed time includes screen-off time; it is not a measurement of actual gameplay. Android uses a monotonic clock; Web/iOS persist deadlines and recheck on returning to the foreground. An observed Honor Android 14 system-manager force-stop ended the native service. A successful browser test, attached window or quiz shown only after reopening the app is **not** proof of reliable background guarding.

### Quick start

Install Node.js 22.12+ and npm, then clone this repository, run `npm ci`, and start `npm run dev`. Open the local URL printed by Vite, normally `http://127.0.0.1:5173/`. Dependency installation requires network access; the application itself is local-first.

### Usage and screenshot walkthrough

All screenshots are **real browser captures with isolated demonstration data**, not Android/iOS system screenshots or evidence of cross-app blocking. The same images are shown in the Chinese walkthrough above.

| Step | What to do in the UI | Screenshot |
| --- | --- | --- |
| 1. Create a parent PIN | Enter your own six-digit PIN twice, then select “开启学伴时光”. Keep it private; no default PIN exists. | [Welcome / PIN setup](docs/screenshots/01-welcome.png) |
| 2. Configure learning | Open “家长设置”, verify the PIN, choose grade/subjects/interval/target, then save and verify again. Stop guarding before editing. | [Parent settings](docs/screenshots/03-settings.png) |
| 3. Prepare questions | Open “我的题库”. Add questions manually, or download a template and use “导入题库” to select CSV/JSON. | [Local library](docs/screenshots/04-library.png) |
| 4. Confirm import | Review the validated preview and select “确认保存到本机”. Existing questions are retained and duplicates are skipped. | [Import preview](docs/screenshots/05-import.png) |
| 5. Practice or guard | “先练习一下” starts immediate in-app practice, not background guarding. “开启学习守护” starts the configured timer. Android needs overlay/notification/background permissions. | [Home](docs/screenshots/02-home.png) |
| 6. Answer questions | Select an option or enter a text answer, then select “确认答案”. Incorrect answers remain; reaching the correct-answer target completes the round. | [Universe quiz](docs/screenshots/06-quiz.png) |
| 7. Parent exit | Select “家长停止守护” on Home or “家长退出” in the quiz. A correct PIN stops guarding; cancelling verification does not. | [Web parent verification](docs/screenshots/07-parent.png) |
| 8. Review and back up | Open “学习足迹” and export records after PIN verification. Export the question library separately from “我的题库”. | [Learning records](docs/screenshots/08-records.png) |
| 9. Use a narrow screen | The layout adapts and offers bottom navigation. This capture uses a 390 × 844 browser viewport. | [Mobile layout](docs/screenshots/09-mobile.png) |
| 10. Play Word Runner | Read a falling Chinese target, enter its English and press Enter/“发射子弹”. Homing shots score on collision; “调整难度” controls 1–12s spawn interval and 1–8 fall speed. Pause, hints/dictation and ten-hit rest are available. | [Word game](docs/screenshots/10-game.png) |
| 11. Edit course metadata | Change grade, subject, upper/lower book, lesson/title and content; save preserves the ID/history. The pictured lesson is illustrative fixture data, not a verified textbook mapping. | [Course editor](docs/screenshots/11-course-editor.png) |

The parent-verification image shows the **web dialog**. Android 1.2 instead uses a separate native Activity with an inline numeric keypad; that native screen is not pictured. The records capture contains one attempt genuinely made during the demonstration.

For a first guard test, use a one-minute interval with a parent present. Android should show the quiz without reopening the app or tapping a notification; requiring those actions is a failed background test. OEM settings may still prevent this. This build has no Device Owner/DPC lock-task enforcement; installing an APK alone cannot activate device management.

### Question file format

Download [three-type CSV](examples/questions.csv) or [JSON](examples/questions.json), or the separate [vocabulary CSV](examples/vocabulary.csv)/[JSON](examples/vocabulary.json). See [content scope and game guide](docs/LEARNING_CONTENT.md). JSON uses an array of objects; CSV uses a header row.

| Field | Requirement |
| --- | --- |
| `grade` | Integer 1–12 or Chinese grade label; 7–9 junior, 10–12 senior |
| `subject` | Exact stage-specific subject value, as listed in parent settings |
| `type` | `choice`, `fill`, `boolean`; omitted types retain legacy inference |
| `prompt` | Question text, 1–1000 characters |
| `options` | JSON string array or CSV `\|` separated options; empty for fill/boolean; boolean options normalize automatically |
| `answer` | Full choice option, exact text answer, or 正确/错误 (true/false aliases supported) |
| `explanation` | Optional explanation for parents; not directly revealed after a wrong answer |
| `enabled` | Optional true/false, default true; disabled questions do not enter any pool |
| `unit` / `source` / `word` | Optional unit, textbook/source annotation and corresponding English word |
| `semester` | `upper`/上册, `lower`/下册, `unspecified`/未标注; legacy entries remain unspecified |
| `lesson` / `lessonTitle` | Lesson number 1–300 or empty, optional title; template lesson assignments are illustrative, not curriculum verification |

Limits: 5 MB per file, 1–2000 questions or 1–1000 vocabulary entries per import, 5000 stored questions. One invalid item rejects the batch. Text answers use normalized exact matching; OCR, PDF/Word extraction, equivalent alternatives and expression evaluation are not supported. The one-time upgrade appends foundation content without replacing existing question IDs, PINs, attempts or session progress. Subsequent parent deletions are retained.

### Build, test and screenshots

Use the command reference above for all scripts. Typical checks are `npm test`, `npm run lint`, `npm run build` and `npm run test:e2e`. Browser tests require Google Chrome and cover desktop, phone and tablet viewports sequentially. Apple Silicon uses the existing ARM Chrome wrapper when available.

`npm run test:e2e:profile` measures an isolated browser on local port 4177. Hardware ARM detection uses `sysctl hw.optional.arm64`, not `uname` inside x64/Rosetta Node. On this Mac, the unchanged 54-test, single-worker suite improved from about 33.7 minutes to 1.5 minutes; timings are machine-specific and assertions/security settings were not weakened.

Run `npm run docs:screenshots` to regenerate the walkthrough in an isolated local browser. It uses port 4175, closes its preview on completion, never accesses a tablet and never uses real user data. Do not repeat `cap add`: the Android/iOS directories already contain custom native code. No runtime `.env` file is required.

**Android:** prepare Java 21, Android SDK Platform 36 and matching Build Tools, accept SDK licenses yourself and configure `ANDROID_HOME` or an ignored `android/local.properties`. Run `npm run android:apk`; the debug APK is produced at `android/app/build/outputs/apk/debug/app-debug.apk`. Same-signed updates should be installed over the old version, without uninstalling first. Release distribution requires your own signing key, device validation and applicable store approval.

If the current local APK already exists, no full test/build is needed just to install. With USB debugging authorized, run the manual `adb install -r` command above from the repository root; use `-s` for multiple devices. Back up first, do not uninstall/clear data or force past signing/downgrade errors. This guide does not authorize an agent to access a device.

**iOS/iPadOS:** prepare macOS, Xcode 26+, iOS platform components and your signing team. Run `npm run sync` and `npm run ios:open`, then configure signing in Xcode and use Run or Archive / Distribute. `ios:check` is unsigned compilation; `ios:archive` attempts a signing-ready archive. Neither is an installable IPA. See [build status](docs/DELIVERY.md), [Xcode setup](docs/IOS_SETUP.md) and [cross-platform limitations](docs/CROSS_PLATFORM.md).

APK/IPA binaries, caches, device diagnostics and signing material are not committed. An APK can also be downloaded from [GitHub Actions](https://github.com/chaozai0304/time-practice/actions) **after** its Android job succeeds; this does not claim an existing successful build or released download.

### Privacy, troubleshooting and contributions

Questions, nicknames, attempts and derived PIN values stay on the device. There are no ads, analytics or external fonts; other-app content/use is not tracked. Android automatic backup is disabled, while iOS data may be included in the user's own device backup. Exported files contain answers or learning records and should be protected by parents.

Uninstalling or clearing app/browser data deletes local content. Export backups regularly. Reinstalling cannot fix an OS force-stop or automatically grant Device Owner privileges. Native/JVM and browser tests do not validate OEM background policies, real keyboards or device window composition. Emergency and system-safety capabilities remain available.

Same-package, same-signed in-place updates normally retain settings, PINs, questions and attempts; this release preserves the storage key and IDs. Uninstalling first or clearing data removes them. Back up questions/records before updating. An update may terminate the old process, so parents should check guarding and system permissions afterwards; data preservation is not continuous-service assurance.

Report bugs through [Issues](https://github.com/chaozai0304/time-practice/issues) with app/OS versions, reproduction steps and redacted screenshots/diagnostics. Do not submit PINs, PIN hashes, credentials or a child's real question library/learning records. Pull requests should include relevant tests and pass unit tests, lint and build.

**License:** the main application is licensed under the [MIT License](LICENSE). Third-party dependencies and bundled tools retain their respective terms, including the [Apache 2.0 license](.github/prompts/ui-styling/LICENSE.txt) for `ui-styling`. MIT licensing of this project does not change Remotion or other dependency licensing conditions.

**AI development:** [AGENTS.md](AGENTS.md) is the sole complete policy; [CLAUDE.md](CLAUDE.md) imports it without duplicating rules. Read the policy and [historical lessons](docs/AI_LESSONS.md) before working, including authorization, evidence, data preservation, testing and proactive retrospectives.