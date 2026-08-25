import { Game } from './game.js';

const game = new Game();
game.init();

document.getElementById('pause-restart-button')?.addEventListener('click', () => {
  game.audio.init();
  game.startFromMenu();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 使用相对于站点根的 scope，避免子路径部署（如 /NiuFPS/）下 SW 失效。
    const swUrl = new URL('./sw.js', document.baseURI).toString();
    navigator.serviceWorker
      .register(swUrl, { updateViaCache: 'none' })
      .then((registration) => {
        // 每页加载都向服务器问一次是否有新 SW；命中后让 SW 自己接管页面
        registration.update().catch(() => {});
      })
      .catch(() => {});
  });
}

window.NiuFPS = game;
