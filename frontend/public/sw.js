const CACHE_NAME = 'shitplace-images-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // 이미지 요청만 캐싱
  if (event.request.destination === 'image' || 
      event.request.url.includes('.jpg') || 
      event.request.url.includes('.jpeg') || 
      event.request.url.includes('.png') ||
      event.request.url.includes('s3.amazonaws.com')) {
    
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            console.log('캐시에서 이미지 반환:', event.request.url);
            return response;
          }
          
          return fetch(event.request).then((fetchResponse) => {
            if (fetchResponse.ok) {
              console.log('이미지 캐시에 저장:', event.request.url);
              cache.put(event.request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      })
    );
  }
});
