const CACHE_NAME = 'ppro-v3'
const OFFLINE_URL = '/offline.html'

const PRECACHE_URLS = [
  '/',
  '/login',
  '/dashboard',
  '/dashboard/presupuestos',
  '/dashboard/presupuestos/nuevo',
  '/dashboard/clientes',
  '/dashboard/items',
  '/dashboard/perfil',
  '/offline.html',
  '/manifest.json',
]

// Install - cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // If some URLs fail to cache, continue anyway
        console.log('Some URLs failed to precache')
      })
    })
  )
  self.skipWaiting()
})

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET and Supabase API calls
  if (request.method !== 'GET') return
  if (request.url.includes('supabase.co')) return
  if (request.url.includes('googleapis.com')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone)
          })
        }
        return response
      })
      .catch(async () => {
        // Try cache
        const cached = await caches.match(request)
        if (cached) return cached

        // For navigation, show offline page
        if (request.mode === 'navigate') {
          const offlinePage = await caches.match(OFFLINE_URL)
          if (offlinePage) return offlinePage
        }

        return new Response('Offline', { status: 503 })
      })
  )
})
