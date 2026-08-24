# 移动端操控体验优化 PLAN

- 文档编号：PLAN-2026-08-24-mobile-controls
- 状态：已评审并实施（M1/M2/M3 完成，2026-08-24）
- 目标版本：web/ 静态站（Three.js + 原生 ES Module，零第三方依赖）
- 关联需求：
  1. 非横屏全屏状态下，画面中央弹出「全屏」按钮，其余区域半透明灰色遮罩且不可操作；必须横屏全屏才能继续，点击「全屏」切换横屏全屏。
  2. 键位分布、设计与操控体验参考《吃鸡》类手游（PUBG Mobile / 和平精英）。
  3. 手游操控方案必须基于行业调研，不凭空设计。

---

## 1. 现状盘点

当前 `web/` 已有一版基础触控与简易全屏提示，与目标差距如下：

| 项目 | 现状 | 差距 |
| --- | --- | --- |
| 全屏提示 | `#fullscreen-prompt` 底部小胶囊，仅提示"点击进入全屏"，不阻断 | 无居中大按钮、无灰色遮罩、无方向检测、无强制"横屏全屏才可继续" |
| 方向检测 | 无任何方向判断 | 不检测竖屏，`manifest.webmanifest` 虽声明 `orientation: landscape`，但仅对 PWA 安装生效 |
| 屏幕方向锁定 | 未调用 `screen.orientation.lock()` | 进入全屏后未锁定横屏 |
| 触控布局 | 固定左摇杆 + 右侧 3×3 文字按钮网格 + 右半屏视角区 | 非吃鸡式布局：开火/换弹/切枪/视角/跳跃/蹲下全部堆在右下，左上无跳跃蹲下，无动态摇杆，无图标化按钮 |
| 触控视觉 | 半透明圆形文字按钮 | 无吃鸡风格（大圆钮、图标、按压反馈、层次化尺寸） |
| 移动端 HUD | 小地图右上、底部统计左下、暂停键顶部居中 | 与触控区可能重叠，需为移动端单独适配 |
| 多指触控 | 已用 Pointer Events 跟踪 pointerId | 基本达标，需在全屏门控与视觉重构时保持并加强 |

关键文件：`web/index.html`、`web/styles.css`、`web/src/input.js`、`web/src/game.js`、`web/src/config.js`、`web/manifest.webmanifest`。

---

## 2. 行业调研结论（含来源）

### 2.1 吃鸡类键位布局（PUBG Mobile / 和平精英）

官方默认与主流方案高度一致：

- **左手拇指按住屏幕左侧区域移动**（虚拟摇杆，触摸后出现，方向跟随拇指）；**右手拇指在右侧区域控制视角**。
- **开火按钮**默认在右下侧（可同时启用左侧开火键以支持三指/四指操作），带子弹图标。
- **开镜/瞄准按钮**位于开火键上方附近；**跳跃、蹲下、趴下**按钮独立分布在左侧/摇杆周边。
- 所有按钮可自定义位置、尺寸与透明度；主流攻略给出的尺寸参考：移动摇杆为默认 90%–110%，开火键 120%–150%，开镜键约为开火键高度的 1.2 倍、开火/开镜比例约 1.3:1，相邻按钮留 ≥15px 缓冲避免误触。
- 三指方案：左手拇指移动、左手食指开火（左上开火键）、右手拇指开镜压枪；四指方案：左上开火、右上开镜、左右拇指移动与转向。

来源：
- PUBG Mobile 官方操控优化指南：<https://play.google.com/store/apps/editorial?id=mc_editorial_evergreen_post_install_pubg_mobile_improve_your_controls_now_fcp&hl=zh>
- PUBG Mobile 左开火键设置与尺寸参考：<https://bittopup.com/pl/article/PUBG-Mobile-LeftFire-Controls-Master-Hold-vs-Tap-Setup>
- 和平精英三指/四指键位教程（左开火、右开镜、按钮分区）：<https://page.sm.cn/blm/midpage-317/index?id=10_8d0878e227f62496b94410ddb828996b>
- 逆战未来按键攻略（瞄准/开火尺寸比例、15px 缓冲、摇杆放左下）：<https://wap.pp.cn/news/922703.html>

### 2.2 触控设计规范

- **左右分工**：左半屏承担移动，右半屏承担瞄准与射击，左右手职能明确、响应链路最短，是主流 FPS 手游共识（PUBG 官方、逆战未来攻略均如此）。
- **动态摇杆优于固定摇杆**：在触控起始位置出现、半径内归一化输出；移动端"出现在拇指落点"的方案手感更好（通用游戏输入指南亦推荐）。
- **按钮尺寸与热区**：推荐最小触控目标约 44–48px（Apple HIG / Material），圆形热区更容易命中；按钮间留足间距防误触。
- **多指同时操作**：用 Pointer Events 按 `pointerId` 区分摇杆/视角/按钮，避免多指互相抢占。
- **消除浏览器手势干扰**：`touch-action: none`（控制层与画布）、viewport `user-scalable=no`、阻止默认行为，消除 300ms 点击延迟、双击缩放、双指缩放；使用 `env(safe-area-inset-*)` 避开刘海与手势条。

来源：
- MDN touch-action：<https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action>
- 移动 Web 游戏触控优化（touch-action + viewport 禁用缩放）：<https://github.com/asgardtech/archer/pull/16>
- 虚拟摇杆实现要点（落点出现、最大半径、归一化）：<https://generalistprogrammer.com/tutorials/game-input-systems-complete-controller-programming-guide-2025>

### 2.3 全屏与横屏锁定（Web 端）

- **Fullscreen API**：`document.documentElement.requestFullscreen()`（含 `webkit` 前缀 fallback）可全屏任意元素；但 **iOS Safari（iPhone）不支持对任意元素调用全屏**，仅视频元素可用 `webkitEnterFullscreen`。
- **Screen Orientation API**：`screen.orientation.lock('landscape')` 需要**先进入全屏**、需要 HTTPS（secure context）、必须由用户手势触发，且**仅部分移动浏览器支持**（Android Chrome 支持，iOS Safari 禁止）；必须视为 best-effort 并 catch 失败。
- **iOS 的真正全屏方案**：通过 PWA 添加到主屏幕，`manifest.webmanifest` 中 `display: fullscreen` + `orientation: landscape` 生效。Safari 普通网页内只能引导用户手动旋转设备。
- **主流做法**：进入全屏后尝试锁定横屏；监听 `fullscreenchange`、`orientationchange`/`resize` 重新评估状态；不满足条件时显示阻断层（提示旋转/全屏），满足后自动消失。横竖屏适配用 CSS `@media (orientation: ...)` 作为兜底。

来源：
- Screen Orientation API 规范与最佳实践：<https://www.w3docs.com/learn-javascript/screen-orientation-api>
- WebKit bug：iOS 不支持任意元素全屏、PWA 是唯一方案：<https://wiki.webkit.org/show_bug.cgi?id=280181>
- 横屏锁定的两种方案与 iOS 限制：<https://github.com/iftheshoefritz/webula/issues/129>
- 横屏游戏"非横屏显示提示遮罩"设计模式：<https://discussions.unity.com/t/how-to-force-landscape-rotation-in-ios-sfafari/903198>

---

## 3. 总体设计

### 3.1 需求 1：横屏全屏门控（Fullscreen Gate）

**状态机**

```
                       触控设备
                    ┌──────────┐
                    │  blocked  │◄───────────────┐
                    │(非横屏全屏)│                │
                    └─────┬────┘                │
                  点击「全屏」                   │ fullscreenchange/
                  请求全屏→锁横屏                │ orientationchange/
                          │                     │ resize 后仍不满足
                          ▼                     │
                    ┌──────────┐  条件失效      │
                    │   ready   │───────────────┘
                    │(横屏全屏) │
                    └──────────┘
```

**判定条件**（满足才 `ready`）：

1. 处于全屏：`document.fullscreenElement || document.webkitFullscreenElement` 非空；
2. 当前为横屏布局：`window.innerWidth > window.innerHeight`（布局方向判断，稳健）；若 `screen.orientation?.type` 可用，再取 `landscape-*` 佐证。

**阻断层 UI（`#fullscreen-gate`）**：

- 全屏固定层 `position: fixed; inset: 0`，z-index 高于 HUD 与触控层；
- 背景：半透明灰色遮罩（如 `rgba(45, 45, 45, 0.62)` + 轻微 blur），并 `pointer-events: auto` 拦截全部操作；下方游戏画面可见但不可操作；
- 正中：大号「全屏」按钮（含展开图标 ⛶，最小触控目标 ≥ 64px 高），按钮下方说明文案"为获得最佳体验，请横屏全屏"；
- 游戏进入 `blocked` 时自动暂停（对 touch 设备复用现有 pause 逻辑），避免被狼咬死；恢复 `ready` 后继续。

**「全屏」按钮点击流程**：

```text
1) 先请求全屏：documentElement.requestFullscreen()（webkit 前缀 fallback）
2) 进入全屏后尝试锁横屏：screen.orientation?.lock?.('landscape-primary' / 'landscape')
   - 特性检测存在才调用；Promise 必须 catch（视为 best-effort）
3) 事件监听 fullscreenchange / orientationchange / resize / screen.orientation.change
   → 重新评估状态，ready 则隐藏遮罩并继续，否则保持遮罩
```

**iOS Safari 兼容分支**（`requestFullscreen` 不存在时）：

- 按钮文案改为「旋转至横屏」，说明补充"将浏览器添加到主屏幕可获得真全屏（PWA）"；
- 监听方向变化：设备已横屏（布局判定）时按钮变为「继续游戏」，点击后隐藏遮罩放行（Safari 网页内无法真全屏，只能做到"横屏可玩"）；
- `index.html` 补 iOS PWA 相关 meta：`apple-mobile-web-app-capable`、`apple-mobile-web-app-status-bar-style`；manifest 已含 `display: fullscreen` 与 `orientation: landscape`（保持）。

**触发时机**：触控设备从主菜单点「进入游戏」时、游戏中任意时刻条件失效时、启动时若已在游戏中（如 PWA 恢复）。

### 3.2 需求 2：吃鸡风格键位布局

**整体布局（横屏）**

```text
┌───────────────────────────────────────────────────────┐
│  HUD：血量/武器/弹药      [小地图]          [暂停]     │
│                                                        │
│   [跳跃]  [蹲下]                          [视角切换]   │
│               ⌖ 准星                                  │
│                                                        │
│  左半屏（移动区）        右半屏（视角区）               │
│  动态摇杆：拇指落点即出现                              │
│                                                        │
│  摇杆出现区                        [换弹] [切枪]       │
│                                        [开火]（大）    │
└───────────────────────────────────────────────────────┘
```

**键位 → 游戏动作映射**：

| 区域 | 控件 | 动作 | 吃鸡对应 |
| --- | --- | --- | --- |
| 左半屏下方 | 动态虚拟摇杆（触摸出现、松手消失） | 移动 | 左侧移动摇杆 |
| 左上方 | 跳跃 | 跳跃 | 跳跃键（左手侧） |
| 左上方（跳跃下方） | 蹲下（按住保持） | 蹲下 | 蹲下键（左手侧） |
| 右半屏 | 视角区（拖拽转视角） | 视角/准星 | 右侧视角区 |
| 右下主位 | 开火（大圆钮，按住连发） | 开火 | 右侧开火键 |
| 右下次位 | 换弹 | 换弹 R | 换弹键 |
| 右下次位 | 切枪 | AK-47 ↔ 牛角头槌 | 切枪键 |
| 右上 | 视角切换 | 第一/第三人称 | （本作特有，置于右上避免遮挡开火区） |

说明：本作暂无开镜（ADS）系统，故不设开镜键；若后续加入，按调研规范置于开火键上方、尺寸约为开火键 1.2 倍。按钮布局保持可配置的数据结构（HTML 静态标记即可，本阶段不做拖拽自定义编辑器，列入后续迭代）。

**视觉与交互规范**：

- 开火键：最大、最醒目（红色系、子弹图标、约 76–88px），按压时缩放 + 高亮反馈；
- 功能键：≥ 48px 触控目标，相邻间距 ≥ 15px，半透明深色底 + 白色图标/文字，吃鸡式圆形或圆角形；
- 摇杆：触摸落点出现，半径约 60–70px，外圈半透明、内杆跟随拇指，超过半径截断并归一化输出（现有 `_updateJoystick` 逻辑保留并扩展为动态出现/消失）；
- 全部触控元素 `touch-action: none`，按钮区域 `touch-action: manipulation`，阻止默认行为与文本选择；
- 使用 `env(safe-area-inset-*)` 偏移，避免刘海/底部手势条遮挡；
- 触控灵敏度单独配置（`config.js` 增加 `TOUCH` 节：视角灵敏度、摇杆死区、按钮尺寸）。

### 3.3 移动端 HUD 适配

- 小地图缩小并保持右上（避开按钮区）；底部统计（距离/怪物/时间）移到底部中央或与开火区错开；
- 暂停键保持在顶部中央或右上小尺寸图标，不落入触控热区；
- 竖屏被门控阻断，因此移动端只针对横屏布局做 HUD 排版；桌面端保持现状不受影响。

---

## 4. 实现方案（文件级）

| 文件 | 改动 |
| --- | --- |
| `web/index.html` | 新增 `#fullscreen-gate` 阻断层标记；重构 `#touch-controls` 为吃鸡式布局（摇杆区/视角区/跳跃/蹲下/开火/换弹/切枪/视角切换）；补 iOS PWA meta |
| `web/styles.css` | 新增门控层样式（遮罩 + 全屏按钮）；重写触控控件视觉（图标、尺寸、按压反馈、安全区偏移）；移动端 HUD 适配；`@media (orientation: portrait)` 兜底 |
| `web/src/orientation-gate.js`（新增） | 全屏 + 横屏判定、锁方向、事件监听、遮罩显隐、与 Game 的暂停联动、iOS fallback |
| `web/src/input.js` | 触控改为动态摇杆；按钮按新布局重新绑定；保持多指 pointerId 追踪；暴露 `isBlocked` 抑制输入 |
| `web/src/game.js` | 集成 `OrientationGate`（`startGame` 时初始化、blocked 时暂停、ready 时恢复）；`onResize` 保持；移除旧的 `showFullscreenPromptIfNeeded` |
| `web/src/config.js` | 新增 `TOUCH` 配置节（灵敏度、死区、按钮尺寸） |
| `tools/validate_web.py` | 校验逻辑不变（纯静态检查）；如检查 DOM id 可同步更新 |

不改动：渲染/战斗/世界逻辑、`entities.js`、`models.js`、`audio.js`、`utils.js`（除非触控灵敏度需要参数化）。

---

## 5. 分阶段任务与验收标准

### M1：横屏全屏门控（需求 1）

任务：
- 新增 `orientation-gate.js`：状态判定、`requestFullscreen` + `lock('landscape')` 流程、`fullscreenchange/orientationchange/resize` 监听、iOS fallback；
- `index.html`/`styles.css` 增加居中「全屏」按钮与半透明灰色遮罩；
- `game.js` 集成：blocked 暂停、ready 恢复、输入层屏蔽。

验收：
- 触控设备竖屏或非全屏：遮罩出现，画面中央为「全屏」按钮，其余区域灰色半透明且任何操作无效；
- 点击「全屏」：进入横屏全屏，遮罩消失，游戏可玩；
- 游戏中退出全屏或旋转回竖屏：遮罩立即复现且游戏暂停；
- iOS Safari：全屏 API 不可用时按钮降级为「旋转至横屏」，横屏后可「继续」；PWA 安装后进入即横屏全屏；
- 桌面端行为完全不变。

### M2：吃鸡式键位与触控体验（需求 2、3）

任务：
- 重构 `#touch-controls` 布局与 `styles.css` 视觉；
- `input.js`：动态摇杆（落点出现/松手消失）、按钮映射重绑、触控灵敏度参数化；
- 移动端 HUD 适配与安全区处理。

验收：
- 左手拇指落点即出现摇杆并移动角色，松手消失；
- 右手拇指拖拽转视角；右下大圆钮按住连发；
- 跳跃/蹲下在左上方、换弹/切枪/视角切换在右侧，互不遮挡、间距 ≥15px；
- 多指同按（移动+视角+开火）不串扰；
- 无双击缩放/双指缩放/长按选中等浏览器手势干扰；
- 模拟器（Chrome Device Mode）与真机表现一致。

### M3：验证与收尾

- 运行 `python tools/validate_web.py`；
- `cd web && python -m http.server 8080` 真机局域网自测；
- 测试矩阵：Android Chrome（全屏+锁方向）、Android WebView/PWA、iOS Safari（fallback）、iOS 主屏幕 PWA、桌面浏览器回归；
- 提交代码并同步 README（移动端操作说明）。

---

## 6. 风险与兼容性

| 风险 | 应对 |
| --- | --- |
| iOS Safari 不支持任意元素全屏 | 降级为"横屏可玩 + 引导安装 PWA 获得真全屏"；门控判定区分"真全屏"与"仅横屏"两档 |
| `screen.orientation.lock()` 被拒绝 | 一律 catch；锁方向视为 best-effort，UI 不依赖它，仅依赖布局判定 |
| 浏览器要求全屏后才能真正锁定方向 | 按钮点击流程保证"先全屏、再 lock" |
| 部分安卓 WebView 无 `screen.orientation` | 特性检测，缺失时仅用尺寸/全屏判定 |
| PWA 未安装时地址栏仍在 | 属浏览器限制；PWA 安装后 `display: fullscreen` 解决 |
| 触控误触/遮挡 | 遵循 ≥48px 热区、≥15px 间距、安全区偏移；真机实测后微调尺寸 |

---

## 7. 评审点（需确认）

1. iOS Safari 无法真全屏属平台限制，采用"横屏可玩 + 引导 PWA"降级方案是否可接受；
2. 开火采用"按住连发"（对应 AK-47 自动开火）还是"单发点击"；
3. 本阶段是否仅保留静态固定布局（不做拖拽自定义键位编辑器，后续迭代再做）。

默认按：1 接受降级；2 按住连发；3 静态布局。
