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

仓库自带 `.github/workflows/deploy.yml`，推荐使用 GitHub Actions 自动化部署（每次推送到 `main` 自动发布）；同时保留从分支直接部署的备选方案。

### 方案 A：GitHub Actions 自动部署（推荐）

1. 将仓库推送到 GitHub：

   ```bash
   git push origin main
   ```

2. 进入 **Settings → Pages**。
3. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
4. 保存后 GitHub 会提示创建一个 `github-pages` environment，同意即可。
5. 工作流会自动构建并发布 `web/` 目录。

工作流文件：`.github/workflows/deploy.yml`，主要步骤：

- `actions/checkout@v4` 拉取代码
- `actions/configure-pages@v5` 初始化 Pages 上下文
- `actions/upload-pages-artifact@v3` 将 `./web` 打包为 artifact
- `actions/deploy-pages@v4` 部署到 GitHub Pages

之后每次推送到 `main` 都会自动重新部署；也可以在 Actions 页面手动触发 `workflow_dispatch`。

### 方案 B：从分支直接部署（备选）

如果不希望使用 Actions：

1. 进入 **Settings → Pages**。
2. 在 **Build and deployment** 中选择 **Deploy from a branch**。
3. Branch 选择 `main`，Folder 选择 `/web`。
4. 保存后等待 GitHub Pages 构建完成。

### 访问地址

部署完成后，站点会发布到：

```text
https://<用户名>.github.io/<仓库名>/
```

本仓库的用户/仓库名为 `Laffinty/NiuFPS`，发布后地址为：

```text
https://laffinty.github.io/NiuFPS/
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
