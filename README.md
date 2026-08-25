# 牛FPS · NiuFPS

牛生存射击 Web 3D FPS（牛FPS / NiuFPS）。你是一头牛，开局一把 AK-47，穿过森林、河流、岩石与狼群，抵达红色集结旗。蛇只有一条，咬中必死。

## 快速开始

项目是纯静态站点，无需构建即可运行：

```bash
cd web
python -m http.server 8080
```

浏览器打开 <http://localhost:8080>。

## 目录

- `docs/`：项目文档（设计、操作、构建部署、研究笔记）
- `web/`：可发布到 GitHub Pages 的静态游戏目录
- `tools/`：Python 辅助脚本

## 本地校验

```bash
python tools/validate_web.py
```

## 部署到 GitHub Pages

仓库已自带 `.github/workflows/deploy.yml`，推荐使用 GitHub Actions 自动部署：

1. 推送代码到 GitHub：

   ```bash
   git push origin main
   ```

2. 在 **Settings → Pages → Source** 选择 **GitHub Actions**。
3. 之后每次推送到 `main` 都会自动重新部署。

访问地址：<https://laffinty.github.io/NiuFPS/>

详细说明见 [docs/BUILD_AND_DEPLOY.md](docs/BUILD_AND_DEPLOY.md)。

> 本作完全原创，所有模型与音效均在浏览器端程序化生成。

## 手机端操作

- 首次进入请点击「全屏」切换横屏全屏；竖屏或非全屏时画面中央会弹出提示并阻断操作。
- 左手拇指在左半屏落点处出现移动摇杆；右手拇指拖拽右半屏控制视角。
- 右下大圆钮开火（按住连发），右侧「换弹 / 切枪」，左上「跳跃 / 蹲下」，右上「视角切换」。
- iOS Safari 浏览器内不支持网页全屏，可旋转横屏后点击「继续游戏」，或添加到主屏幕（PWA）获得真全屏。