const CACHE_NAME = 'panda-reader-v2';

self.addEventListener('install', event => {
    // 立即強制接管
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    // 清除舊版本的快取
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // 對於外部 CDN (Firebase, Pako 等) 使用 Cache First
    if (event.request.url.includes('gstatic.com') || event.request.url.includes('cdnjs.cloudflare.com')) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) return cachedResponse;
                return fetch(event.request).then(response => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                });
            })
        );
        return;
    }

    // 對於主頁 index.html 和其他檔案，使用 Network First, Fallback to Cache
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // 如果成功從網路抓到最新版，就更新快取
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, response.clone());
                    return response;
                });
            })
            .catch(() => {
                // 如果斷網，就從快取拿
                return caches.match(event.request);
            })
    );
});