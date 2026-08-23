# ForestFPS · 森林突围：黄牛 FPS

原创黄牛生存射击 Web 3D FPS。你是一头直立行走的黄牛，开局一把 AK-47，穿过森林、河流、岩石与狼群，抵达红色集结旗。蛇只有一条，咬中必死。

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

将仓库推送到 GitHub，在 Settings → Pages 中选择 **Deploy from a branch**，目录选择 `/web` 即可。详细说明见 [docs/BUILD_AND_DEPLOY.md](docs/BUILD_AND_DEPLOY.md)。

> 本作完全原创，所有模型与音效均在浏览器端程序化生成。
