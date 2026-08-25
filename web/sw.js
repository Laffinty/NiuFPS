// NiuFPS · Service Worker
// 策略：network-first（HTML/导航永远从网络拉，失败时回退缓存）
//        cache-first  （静态资源：JS / CSS / 字体 / 图标 / three）
// 升级时只需将 BUILD_VERSION + 1；旧版本缓存会在 activate 阶段被自动清掉，
// 老用户的浏览器也会在 SW 接管页面前通过 skipWaiting + clients.claim 立即生效。

const BUILD_VERSION = 4;
const CACHE_NAME = `forest-fps-v${BUILD_VERSION}`;
const STATIC_CACHE = `${CACHE_NAME}-static`;

const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './src/main.js',
  './src/game.js',
  './src/entities.js',
  './src/world.js',
  './src/models.js',
  './src/input.js',
  './src/orientation-gate.js',
  './src/audio.js',
  './src/utils.js',
  './src/config.js',
  './src/hero-scene.js',
  './vendor/three/three.module.js',
  './vendor/three/three.core.js',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS)),
  );
  // 不等旧 SW 关闭，立即让新版接管
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key.startsWith('forest-fps-'))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  // 不等下一次刷新，立即接管所有打开的页面
  self.clients.claim();
});

const isNavigation = (request) =>
  request.mode === 'navigate' ||
  (request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html'));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // 1. 页面导航 / HTML：network-first，永远拿到最新版；离线时回退到缓存的 index.html
  if (isNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html').then((cached) => cached || Response.error())),
    );
    return;
  }

  // 2. 静态资源：cache-first（JS/CSS/three/icon）。命中失败再去网络，并把新版本写回缓存。
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // 后台异步刷新缓存（stale-while-revalidate 行为，不阻塞当前请求）
        fetch(request)
          .then((response) => {
            if (response.ok) {
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, response.clone()));
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});