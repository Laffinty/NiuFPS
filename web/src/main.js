import { Game } from './game.js';

const game = new Game();
game.init();

document.getElementById('pause-restart-button')?.addEventListener('click', () => {
  game.audio.init();
  game.startFromMenu();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

window.NiuFPS = game;
