# 构建与部署文档

## 1. 本地运行

项目为纯静态站点，无需安装依赖即可运行。推荐使用 Python 起本地服务器：

```bash
cd web
python -m http.server 8080
```

打开 <http://localhost:8080>。

也可以使用任意静态服务器，例如 VS Code Live Server、`npx serve web` 等。

> 注意：直接双击 `index.html` 可能因浏览器模块加载限制而无法运行，请务必通过 HTTP 服务访问。

## 2. 校验

在仓库根目录运行：

```bash
python tools/validate_web.py
```

该脚本会检查：

- `web/index.html`、`web/styles.css` 等必需文件是否存在。
- Three.js vendor 文件是否完整。
- 所有 `src/*.js` 的本地相对导入是否能解析。
- 可选：调用 Node.js 进行语法检查。

## 3. 依赖管理

运行时代码只需要 `web/vendor/three/three.module.js` 与 `web/vendor/three/three.core.js`，这两个文件已经提交到 `web/vendor`，因此 GitHub Pages 不需要安装 npm 依赖。

如需升级 Three.js：

```bash
cd web
npm install --no-save three@0.185.1
mkdir -p vendor/three
copy node_modules\three\build\three.module.js vendor\three\three.module.js
copy node_modules\three\build\three.core.js vendor\three\three.core.js
```

`web/package.json` 记录了开发依赖，便于复现 vendor 文件。

## 4. 部署到 GitHub Pages

1. 将整个仓库推送到 GitHub。
2. 进入仓库 **Settings → Pages**。
3. 在 **Build and deployment** 中选择 **Deploy from a branch**。
4. Branch 选择 `main`（或你的默认分支），Folder 选择 `/web`。
5. 保存后等待 GitHub Pages 构建完成。

站点会发布到：

```text
https://<用户名>.github.io/<仓库名>/
```

项目使用相对路径和本地模块导入，因此部署在子路径下也能正常工作。

## 5. 离线与 PWA

- `web/manifest.webmanifest` 定义应用名称、全屏显示和图标。
- `web/sw.js` 缓存核心资源，第二次访问可离线打开。
- 若修改了资源，请更新 `web/sw.js` 中的 `CACHE_NAME` 版本号。

## 6. 常用发布清单

- [ ] `python tools/validate_web.py` 通过
- [ ] 浏览器本地运行无控制台报错
- [ ] PC 鼠标锁定、移动、射击、换弹、切枪、视角切换正常
- [ ] 手机触控摇杆、开火、全屏按钮正常
- [ ] 胜利/失败结算正常
- [ ] 确认仓库中不包含 `web/node_modules`
