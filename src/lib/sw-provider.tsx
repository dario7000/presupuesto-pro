'use client'

import { useEffect, useState } from 'react'

export default function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false)
  const [showOfflineBanner, setShowOfflineBanner] = useState(false)
  const [pendingSync, setPendingSync] = useState(0)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('SW registered:', reg.scope)
      }).catch((err) => {
        console.log('SW registration failed:', err)
      })
    }

    // Online/offline detection
    const handleOffline = () => {
      setIsOffline(true)
      setShowOfflineBanner(true)
    }
    const handleOnline = () => {
      setIsOffline(false)
      // Try to sync pending data
      syncOfflineData().then((synced) => {
        if (synced > 0) {
          setPendingSync(0)
          setTimeout(() => setShowOfflineBanner(false), 3000)
        } else {
          setShowOfflineBanner(false)
        }
      })
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    setIsOffline(!navigator.onLine)

    // Check for pending offline data
    const pending = getOfflineQueue()
    if (pending.length > 0) {
      setPendingSync(pending.length)
      if (navigator.onLine) {
        syncOfflineData().then(() => setPendingSync(0))
      }
    }

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return (
    <>
      {children}
      {/* Offline banner */}
      {showOfflineBanner && (
        <div
          className="fixed top-0 left-0 right-0 z-[100] text-center py-2 text-xs font-semibold transition-all"
          style={{
            fontFamily: 'var(--font-heading)',
            background: isOffline
              ? 'linear-gradient(90deg, #dc2626, #ef4444)'
              : 'linear-gradient(90deg, #16a34a, #22c55e)',
            color: 'white',
          }}
        >
          {isOffline
            ? '📡 Sin conexión — Los datos se guardan localmente'
            : pendingSync > 0
              ? `✅ Conexión restaurada — Sincronizando ${pendingSync} cambios...`
              : '✅ Conexión restaurada'}
        </div>
      )}
    </>
  )
}

// ==========================================
// OFFLINE QUEUE - localStorage based
// ==========================================

const OFFLINE_KEY = 'ppro_offline_queue'

interface OfflineAction {
  id: string
  type: 'create_quote' | 'update_quote' | 'create_client' | 'create_item'
  data: any
  timestamp: number
}

export function getOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addToOfflineQueue(action: Omit<OfflineAction, 'id' | 'timestamp'>) {
  const queue = getOfflineQueue()
  queue.push({
    ...action,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
  })
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue))
  return queue.length
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_KEY)
}

async function syncOfflineData(): Promise<number> {
  if (!navigator.onLine) return 0

  const queue = getOfflineQueue()
  if (queue.length === 0) return 0

  // Dynamic import to avoid loading supabase at module level
  const { supabase } = await import('@/lib/supabase')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return 0

  let synced = 0

  for (const action of queue) {
    try {
      switch (action.type) {
        case 'create_quote': {
          // Create client if needed
          let clientId = action.data.clientId
          if (!clientId && action.data.clientName) {
            const { data: client } = await supabase
              .from('clients')
              .insert({
                user_id: session.user.id,
                name: action.data.clientName,
                phone: action.data.clientPhone || '',
              })
              .select()
              .single()
            if (client) clientId = client.id
          }

          // Create quote
          const { data: quote } = await supabase
            .from('quotes')
            .insert({
              user_id: session.user.id,
              client_id: clientId,
              title: action.data.title,
              status: action.data.status || 'draft',
              subtotal: action.data.subtotal,
              discount_percent: action.data.discountPercent,
              discount_amount: action.data.discountAmount,
              total: action.data.total,
              notes: action.data.notes,
              vehicle_info: action.data.vehicleInfo || '',
            })
            .select()
            .single()

          if (quote && action.data.items?.length > 0) {
            await supabase.from('quote_items').insert(
              action.data.items.map((it: any, idx: number) => ({
                quote_id: quote.id,
                name: it.name,
                category: it.category,
                quantity: it.quantity,
                unit: it.unit,
                unit_price: it.unit_price,
                total: it.quantity * it.unit_price,
                sort_order: idx,
              }))
            )
          }
          synced++
          break
        }
        case 'create_client': {
          await supabase.from('clients').insert({
            user_id: session.user.id,
            ...action.data,
          })
          synced++
          break
        }
        case 'create_item': {
          await supabase.from('saved_items').insert({
            user_id: session.user.id,
            ...action.data,
          })
          synced++
          break
        }
      }
    } catch (err) {
      console.error('Failed to sync action:', action.id, err)
    }
  }

  // Clear synced items
  if (synced === queue.length) {
    clearOfflineQueue()
  }

  return synced
}

// Check if we're online
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
