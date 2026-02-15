const CACHE_NAME = 'quiztime-arena-v1'
const APP_SHELL = ['/', '/manifest.webmanifest', '/pwa/icon-192.svg', '/pwa/icon-512.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL)
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            return caches.delete(key)
          }),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          void caches.open(CACHE_NAME).then((cache) => {
            void cache.put(request, clone)
          })
          return response
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME)
          return (await cache.match(request)) || (await cache.match('/'))
        }),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached
      }

      return fetch(request).then((response) => {
        const clone = response.clone()
        void caches.open(CACHE_NAME).then((cache) => {
          void cache.put(request, clone)
        })
        return response
      })
    }),
  )
})
