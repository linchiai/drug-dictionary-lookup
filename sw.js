// 秀傳藥典查詢 PWA - Service Worker
// 版本號更新時會強制重新快取
const CACHE_NAME = 'drug-lookup-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── 安裝：快取所有靜態資源 ──
self.addEventListener('install', event => {
  console.log('[SW] Installing cache:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => {
      console.log('[SW] All assets cached');
      return self.skipWaiting(); // 立即生效，不等舊 SW 消亡
    })
  );
});

// ── 啟動：清除舊版快取 ──
self.addEventListener('activate', event => {
  console.log('[SW] Activating new service worker');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      );
    }).then(() => self.clients.claim()) // 接管所有分頁
  );
});

// ── Fetch：Cache First 策略 ──
// 優先從快取取得，若無快取才發網路請求
self.addEventListener('fetch', event => {
  // 只攔截 GET 請求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached; // 快取命中，立即回傳（離線可用）
      }
      // 快取未命中，嘗試網路
      return fetch(event.request).then(response => {
        // 成功取得後也存入快取
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // 網路失敗且無快取：回傳 index.html（fallback）
        return caches.match('./index.html');
      });
    })
  );
});

// ── 接收主頁訊息（強制更新用）──
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
