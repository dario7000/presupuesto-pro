// Offline queue - stores operations to sync when back online
const QUEUE_KEY = 'ppro_offline_queue'
const CACHE_KEY = 'ppro_cache'

interface OfflineOperation {
  id: string
  table: string
  type: 'insert' | 'update' | 'delete'
  data: any
  timestamp: number
}

// Queue management
export function getQueue(): OfflineOperation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addToQueue(op: Omit<OfflineOperation, 'id' | 'timestamp'>) {
  const queue = getQueue()
  queue.push({
    ...op,
    id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: Date.now(),
  })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY)
}

// Cache for offline data access
export function cacheData(key: string, data: any) {
  try {
    const cache = getCacheAll()
    cache[key] = { data, timestamp: Date.now() }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage full, clear old entries
    localStorage.removeItem(CACHE_KEY)
  }
}

export function getCachedData<T>(key: string): T | null {
  try {
    const cache = getCacheAll()
    return cache[key]?.data ?? null
  } catch {
    return null
  }
}

function getCacheAll(): Record<string, { data: any; timestamp: number }> {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// Online/offline detection
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

// Sync queue when back online
export async function syncQueue(supabase: any): Promise<{ synced: number; errors: number }> {
  const queue = getQueue()
  if (queue.length === 0) return { synced: 0, errors: 0 }

  let synced = 0
  let errors = 0

  for (const op of queue) {
    try {
      if (op.type === 'insert') {
        const { error } = await supabase.from(op.table).insert(op.data)
        if (error) throw error
      } else if (op.type === 'update') {
        const { id, ...rest } = op.data
        const { error } = await supabase.from(op.table).update(rest).eq('id', id)
        if (error) throw error
      } else if (op.type === 'delete') {
        const { error } = await supabase.from(op.table).delete().eq('id', op.data.id)
        if (error) throw error
      }
      synced++
    } catch (e) {
      errors++
      console.error('Sync error:', e)
    }
  }

  if (errors === 0) {
    clearQueue()
  }

  return { synced, errors }
}

// Register for online event
export function onOnline(callback: () => void) {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', callback)
    return () => window.removeEventListener('online', callback)
  }
  return () => {}
}

// Register service worker
export async function registerSW() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('SW registered:', registration.scope)
    } catch (e) {
      console.log('SW registration failed:', e)
    }
  }
}
