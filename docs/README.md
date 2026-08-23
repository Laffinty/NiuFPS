# ForestFPS 项目文档

## 文档索引

- [DESIGN.md](./DESIGN.md)：游戏设计、架构与技术选型
- [CONTROLS.md](./CONTROLS.md)：PC / 手机端完整键位与操作
- [BUILD_AND_DEPLOY.md](./BUILD_AND_DEPLOY.md)：本地运行、构建校验与 GitHub Pages 部署
- [RESEARCH.md](./RESEARCH.md)：原创动画设定调研与 Web 3D 技术调研

## 快速导航

游戏入口：`../web/index.html`

核心模块：

- `web/src/config.js`：所有可调参数集中管理
- `web/src/world.js`：森林、河流、岩石、山体、出生点与集结点生成
- `web/src/entities.js`：玩家、狼、蛇的实体与 AI
- `web/src/game.js`：主循环、战斗、特效、HUD、胜败流程
- `web/src/models.js`：低多边形程序化建模
- `web/src/input.js`：键鼠、指针锁定、移动端虚拟摇杆与触控

## 设计目标

1. 静态部署，打开即玩，无 npm 构建步骤。
2. 每局随机但公平：出生点到集结点的直线距离固定。
3. 同时覆盖 PC（CS1.5 式键鼠）与手机（吃鸡式触控）体验。
4. 全部资源程序化生成，便于原创项目分发。
