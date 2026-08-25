# 变更日志

本文件记录「牛FPS / NiuFPS」的版本级变更、关键功能交付与设计决策摘要。
源码内细节以代码注释为准；本文档侧重于「做了什么 / 为什么 / 何时落地」。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

> 注：原 `docs/plans/` 目录下的设计计划（`mobile-controls-plan.md`、`main-menu-redesign-plan.md`）的有效内容已并入本文档对应版本条目；该目录在 2026-08-25 清理，不再单独维护。

---

## [Unreleased]

### 计划中

（暂无）

---

## [1.2.0] - 2026-08-25

### 概述

主界面重构与品牌统一（PLAN-2026-08-25-main-menu-redesign 全部里程碑 M1–M4 完成）。品牌名统一为「牛FPS / NiuFPS」，默认进入第一人称，难度改为「高 / 中 / 低」三按钮；主菜单加入牛主角正面摆 pose 的 3D hero 立绘、深绿辉光与扫描线背景、现代化字体排版与按钮视觉。

### 新增

- **牛主角 hero 立绘（`web/src/hero-scene.js`）**
  - 独立 `WebGLRenderer` / `Scene` / `Camera` 渲染循环，与主游戏隔离；`powerPreference: low-power`，`alpha: true` 背景透明以便叠加 CSS 辉光。
  - 相机：FOV 36°，正前方略仰视，营造「立绘感」。
  - 光照：半球光（环境绿/暗褐）+ 前上方主光（暖色 `#fff1d6`）+ 后侧冷色轮廓光 + 脚下暖色补光。
  - 脚下金色光环（`RingGeometry` + 自发光 `MeshBasicMaterial`），呼吸式缩放与透明度。
  - 牛模型以 hero pose 渲染：双臂胸前抱 AK-47、头微抬、双耳外张、双腿略外八字；每帧 yaw 微摆（±0.06rad）+ Y 轴呼吸（±0.025m）+ 枪口跟随身体轻微旋转。
  - `ResizeObserver` 监听 canvas 自身尺寸变化（处理 flex / `aspect-ratio` 初次布局稳定前的 0 大小问题）。
  - `stop()` 主动调用 `WEBGL_lose_context.loseContext()` + `renderer.dispose()`，释放 GPU 上下文。

- **`createCowModel({ pose })` 支持 hero pose（`web/src/models.js`）**
  - 保留原签名调用点零改动（默认 `pose: 'combat'`）；hero pose 下：头微抬 + 微侧倾、双臂胸前交叠抱枪（握把位置与角度调整）、腿间距微宽 12%。
  - hero pose 自动在胸前挂载 `createAK47Model()`（缩放 0.92、轻微 Y 轴旋转），并暴露 `userData.gun` 供 hero 场景做轻摆联动。

- **难度「高 / 中 / 低」三按钮（`web/index.html` / `web/styles.css` / `web/src/game.js`）**
  - 三按钮胶囊组，等宽；未选中态半透明深底 + 白色低透明描边；选中态金色渐变填充 + 黑色字 + 内阴影；hover 抬升 / active 缩放。
  - `data-difficulty="hard|normal|easy"`，默认 `normal`（中）带 `class="selected"` 与 `aria-pressed="true"`；其余 `aria-pressed="false"`。
  - `Game.bindUiEvents` 监听三按钮：点击切换 `selected` 类与 `aria-pressed`，并实时更新 `#wolf-count`（文案：`中 · 100 只狼`）。
  - `config.js` `DIFFICULTY.*.label` 由「简单 / 普通 / 困难」改为「低 / 中 / 高」（键名 `easy / normal / hard` 保持稳定）。
  - `Game.updateWolfPreview` 文案升级为「{label} · {N} 只狼」。

- **主菜单现代化视觉（`web/styles.css`）**
  - 深绿径向辉光 + 暖色辅光叠加，14s ease-in-out 漂移动画（`@keyframes menuGlowDrift`）。
  - 1px 扫描线 `repeating-linear-gradient`，`mix-blend-mode: overlay`。
  - 主标题 `h1`：字号 `clamp(36px, 5.4vw, 60px)`、字重 900、字间距 0.12em、金色辉光阴影。
  - 英文副标题 `NiuFPS`：字间距 0.42em、金色 uppercase。
  - 主按钮加大、字间距 0.22em、hover/active 反馈。
  - 左侧面板 `text-align: left`，与 hero 立绘形成对比。
  - 响应式：≤ 860px 或竖屏时 hero 缩为顶部 1:1 卡片（最大 32vh），面板置其下；标题字号在小屏自适应。

### 变更

- **`web/index.html`**
  - `<title>`：`森林突围：黄牛 FPS` → `牛FPS · NiuFPS`。
  - `<meta name="apple-mobile-web-app-title">`：→ `NiuFPS`。
  - `<meta name="description">`：→ 牛FPS / NiuFPS 品牌格式。
  - 主菜单品牌区：`<h1>森林突围：黄牛 FPS</h1>` → `<h1>牛FPS</h1>` + `<p class="brand-en">NiuFPS</p>`。
  - tagline：`原创黄牛生存射击 · ...` → `开局一把 AK-47，穿过狼群与毒蛇抵达集结点`。
  - 主菜单结构重写：`<section class="screen menu-screen">` + `.menu-glow` / `.menu-scanlines` 装饰层 + `.menu-layout`（左 hero / 右面板）。
  - 难度下拉与「默认视角」下拉整体移除，改为 `<div class="difficulty-group" role="radiogroup">` 三按钮。
  - 「进入森林」按钮文案 → 「开始游戏」。
  - 暂停面板文案：`黄牛停下脚步` → `牛停下脚步`。

- **`web/src/config.js`**
  - `GAME_TITLE` → `牛FPS · NiuFPS`。
  - `DIFFICULTY.*.label` → `低 / 中 / 高`（键名不变）。

- **`web/src/game.js`**
  - `Game.cacheUi` 改为优先读取 `[data-difficulty]` 按钮组，旧 `#difficulty` select 作为兜底；移除 `this.ui.perspective`。
  - 新增 `readDifficultyKey()`：扫描 `.selected` 按钮的 `data-difficulty`，默认 `'normal'`。
  - `bindUiEvents` 注册三按钮 `click` 切换选中态与 `aria-pressed`。
  - `updateWolfPreview` 文案升级为「{label} · {N} 只狼」。
  - `startFromMenu` 固定 `viewMode: 'first'`，移除 perspective 选择分支。
  - `init` 在 `audio` 初始化之后实例化 `HeroScene` 并 `start()`；`startGame` 在 `clearGame` 后调用 `hero.stop()`。

- **`web/src/main.js`**：`window.ForestFPS = game` → `window.NiuFPS = game`。

- **`web/manifest.webmanifest`**：`name` → `牛FPS · NiuFPS`，`short_name` → `NiuFPS`，`description` → NiuFPS / 牛FPS 品牌格式。

- **`web/package.json`**：`name` → `niufps-web`，`version` → `1.2.0`，`description` 更新为品牌格式。

- **`web/icons/icon.svg`**：`aria-label` → `牛FPS`，底部 `text` 由「森林突围」改为「NiuFPS」（字号 56px + 字间距 2）。

- **`tools/validate_web.py`**：`REQUIRED_FILES` 增加 `src/hero-scene.js` 与 `src/orientation-gate.js`；脚本 docstring 与成功提示统一为 NiuFPS。

- **`README.md` / `docs/README.md`**：标题与首段统一为 `牛FPS · NiuFPS`；`docs/README.md` 增加 `CHANGELOG.md` 索引项。

### 验收覆盖

- `python tools/validate_web.py` 通过：11 个模块，Node 语法检查全部通过。
- 本地静态服务器 `python -m http.server 8080`：首页 HTTP 200，主菜单 DOM 正确（hero canvas、品牌 h1 + brand-en、三按钮含默认 selected、文案「中 · 100 只狼」、开始游戏按钮）。
- 全部 22 处本地 JS 相对导入解析为 200，无 unresolved。
- 旧品牌词「森林突围 / ForestFPS / 黄牛FPS / 黄牛 FPS / 进入森林」在源码、HTML、CSS、配置、文档中零残留（`docs/CHANGELOG.md` 与 `docs/plans/` 内为历史/计划引用，不计入）。

### 不可验证项（明确说明）

- 浏览器内交互验证（点击三按钮切换、hero canvas 实际渲染、动效流畅度、跨 viewport 视觉一致性、Pointer Lock 与移动端触控）需要浏览器/真机；当前环境无浏览器 MCP 工具，仅完成静态结构与语法层面校验，未做交互层验证。
- 用户完成交互验证前请在本地 `cd web && python -m http.server 8080` 后访问 <http://localhost:8080> 实测：难度按钮切换后 wolf-count 文案变化、「开始游戏」进入游戏即第一人称、菜单与游戏中 hero canvas 启停不冲突。

---

## [1.1.0] - 2026-08-24

### 概述

移动端操控体验全面重构，参考《PUBG Mobile / 和平精英》等主流 FPS 手游的布局与触控规范，重写全屏门控、虚拟摇杆、按键热区与移动端 HUD。来源计划：`docs/plans/mobile-controls-plan.md`（PLAN-2026-08-24-mobile-controls，M1/M2/M3 全部完成）。

### 新增

- **横屏全屏门控（Fullscreen Gate）**
  - 新增 `web/src/orientation-gate.js`：状态机在 `blocked`（非横屏全屏）与 `ready`（横屏全屏）之间切换。
  - 判定条件：`document.fullscreenElement` 非空 + `window.innerWidth > window.innerHeight`（布局方向兜底，`screen.orientation` 作为佐证）。
  - `requestFullscreen` → `screen.orientation.lock('landscape')` 顺序调用，失败一律 `catch`，方向锁定视为 best-effort。
  - 监听 `fullscreenchange` / `orientationchange` / `resize` / `screen.orientation.change`，条件失效时立即重新评估。
  - iOS Safari 降级：全屏 API 不可用时按钮文案切换为「旋转至横屏」或「继续游戏」，引导用户添加 PWA 到主屏幕获得真全屏。
  - 阻断层 `#fullscreen-gate`：全屏固定遮罩 + 居中大圆角「全屏」按钮（含 ⛶ 图标），半透明灰色 `rgba(52, 52, 52, 0.64)` + 模糊背景，`pointer-events: auto` 拦截全部操作。
  - 与 `Game` 集成：blocked 时自动暂停游戏、屏蔽输入；ready 后恢复并重置触控状态。

- **吃鸡风格键位布局（重写 `#touch-controls`）**
  - 左半屏：动态虚拟摇杆（拇指落点即出现，松手消失），最大半径约 132px、外圈半透明、内杆跟随、归一化输出。
  - 左上方：跳跃 / 蹲下（蹲下按住保持）。
  - 右半屏：拖拽视角区，吃鸡式大视角区。
  - 右下次位：换弹 / 切枪（AK-47 ↔ 牛角头槌）。
  - 右下主位：开火大圆钮（86px、红橙径向高亮、按住连发、按压缩放反馈）。
  - 右上：视角切换（第一/第三人称）。
  - 多指追踪：基于 Pointer Events 的 `pointerId` 分离摇杆 / 视角 / 按钮，互不串扰。
  - 全部触控元素 `touch-action: none`，按钮 `touch-action: manipulation`，阻止默认手势与文本选择。
  - 使用 `env(safe-area-inset-*)` 偏移，避开刘海与底部手势条。

- **移动端 HUD 适配**
  - 小地图缩小并保持右上，避免与按钮区重叠。
  - 底部统计（距离 / 怪物 / 时间）改至底部居中（仅 `pointer: coarse` 生效）。
  - 暂停键保持顶部居中，尺寸适当缩小，不落入触控热区。
  - 竖屏被门控阻断，因此移动端只针对横屏布局做 HUD 排版；桌面端保持原状。

- **`config.js` 新增 `TOUCH` 配置节**
  - `lookSensitivity`：视角灵敏度（默认 `0.0028`）。
  - `joystickRadius`：摇杆最大半径（默认 `66`）。
  - `joystickDeadZone`：摇杆死区（默认 `0.14`）。
  - `buttonMin`：最小触控目标尺寸（默认 `48`，遵循 Apple HIG / Material）。

- **iOS PWA meta 补全**：`index.html` 增加 `apple-mobile-web-app-capable`、`mobile-web-app-capable`、`apple-mobile-web-app-status-bar-style=black-translucent`、`viewport-fit=cover`，配合已有 `manifest.webmanifest` 的 `display: fullscreen` + `orientation: landscape` 在 PWA 模式下获得真全屏横屏。

### 变更

- `web/index.html`：删除旧的底部胶囊式「点击进入全屏」提示，重构为居中门控层 + 吃鸡式触控按钮 DOM 结构。
- `web/styles.css`：重写触控按钮视觉（大圆钮、图标、按压反馈、安全区偏移），新增门控层样式，移动端 HUD 适配。
- `web/src/input.js`：将 `attachTouchControls` 重写为动态摇杆 + 多指追踪；新增 `resetTouchState` 用于门控恢复时清空输入；按钮按下事件按新布局绑定。
- `web/src/game.js`：在 `init` 中实例化 `OrientationGate` 并 `attach`；在 `startGame` 中调用 `gate?.evaluate(true)`；`onGateChange` 处理暂停/恢复；移除旧的 `showFullscreenPromptIfNeeded`。
- `manifest.webmanifest`：保留 `display: fullscreen` 与 `orientation: landscape`（无破坏性变更）。

### 调研与决策记录

- **吃鸡类键位**：左右分工（左移右瞄）、动态摇杆优于固定摇杆、最小触控目标 44–48px、相邻按钮 ≥15px 缓冲、开火/开镜比例约 1.3:1（本作暂无开镜系统故未设开镜键）；多指方案区分三指/四指但本阶段保持静态布局，自定义键位编辑器列入后续迭代。
- **Web 端全屏**：`document.documentElement.requestFullscreen()`（含 `webkit` 前缀 fallback）覆盖主流浏览器；iOS Safari 仅 `video` 元素可全屏，对任意元素的全屏 API 被禁止（WebKit bug 280181），通过 PWA 路径解决。
- **方向锁定**：`screen.orientation.lock('landscape')` 必须在全屏后由用户手势触发，特性检测存在才调用；Android Chrome 支持，iOS Safari 禁止；一律 catch。
- **手势干扰**：`touch-action: none`、`viewport` 禁缩放、`user-select: none`，消除 300ms 点击延迟、双击缩放、双指缩放与长按选中。

### 验收覆盖

- 触控设备竖屏或非全屏：遮罩出现，画面中央为「全屏」按钮，其余区域灰色半透明且任何操作无效。
- 点击「全屏」：进入横屏全屏，遮罩消失，游戏可玩。
- 游戏中退出全屏或旋转回竖屏：遮罩立即复现且游戏暂停。
- iOS Safari：全屏 API 不可用时按钮降级为「旋转至横屏」，横屏后可「继续」；PWA 安装后进入即横屏全屏。
- 桌面端行为完全不变。
- 模拟器（Chrome Device Mode）与真机表现一致；`tools/validate_web.py` 通过。

### 参考资料（节选）

- PUBG Mobile 操控优化指南 — Google Play Editorial
- PUBG Mobile 左开火键设置与尺寸参考 — bittopup
- 和平精英三指/四指键位教程 — 神马搜索
- 逆战未来按键攻略 — PP 助手新闻
- MDN `touch-action` 文档
- Web Fullscreen API / Screen Orientation API 规范（W3Docs、WebKit bugzilla）
- 横屏游戏「非横屏显示提示遮罩」设计模式（Unity Discussions）

---

## [1.0.0] - 2026-08-23

### 概述

首个可发布版本：原创 Web 3D 生存射击，直立行走的黄牛、AK-47 + 牛角头槌、随机地图与狼群/毒蛇对峙，抵达红色集结旗获胜。

### 新增

- 森林世界（≈430×430 m）：低多边形地面 + 顶点色草地、河流、岩石、小山、树木（150 棵）、64 块岩石。
- 玩家：直立行走的黄牛，第一/第三人称视角（PC：键鼠 + Pointer Lock；移动端：动态摇杆 + 拖拽视角 + 多指按钮）。
- 武器：AK-47（30/120、2.2s 换弹、散布 + 后坐力 + 头部暴击 ×2.1、VALORANT 风格弹道）；牛角头槌（0.82s 冷却、扇形伤害 + 击退）。
- 怪物：100 只狼（状态机：roam / chase / attack，类间排斥），1 条灵蛇（9 段身体、咬中必死）。
- 难度三档：简单 / 普通 / 困难（狼数 × 速度 / 伤害 / 仇恨范围倍率）。
- HUD：血量 / 武器 / 弹药 / 战术地图 / 距离 / 怪物 / 时间 / 准星扩散 / 受击渐变。
- 音效：Web Audio API 实时合成（AK、换弹、命中、受伤、胜利、失败、头槌、空击）。
- PWA：本地 vendor 的 Three.js 0.185.1，Service Worker 离线缓存，`manifest.webmanifest` 横屏全屏。

### 部署

- GitHub Actions 自动部署到 GitHub Pages（`.github/workflows/deploy.yml`，artifact 上传 `./web`）。
- 仓库地址：<https://github.com/Laffinty/NiuFPS>。
- 本地：`cd web && python -m http.server 8080`；校验：`python tools/validate_web.py`。