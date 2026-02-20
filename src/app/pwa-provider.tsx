'use client'

import { useEffect, useState } from 'react'
import { registerSW, syncQueue, onOnline, getQueue } from '@/lib/offline'
import { supabase } from '@/lib/supabase'

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const [showOnline, setShowOnline] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Register service worker
    registerSW()

    // Offline detection
    const handleOffline = () => setIsOffline(true)
    const handleOnline = async () => {
      setIsOffline(false)
      // Sync queued operations
      const queue = getQueue()
      if (queue.length > 0) {
        const result = await syncQueue(supabase)
        if (result.synced > 0) {
          setShowOnline(true)
          setTimeout(() => setShowOnline(false), 3000)
        }
      }
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    // Check initial state
    if (!navigator.onLine) setIsOffline(true)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return (
    <>
      {children}
      
      {/* Offline banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[999] bg-amber-500 text-amber-900 text-center py-2 px-4 text-xs font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
          📡 Sin conexión — Los cambios se guardarán al reconectar
        </div>
      )}

      {/* Synced toast */}
      {showOnline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg toast" style={{ fontFamily: 'var(--font-heading)' }}>
          ✅ Datos sincronizados correctamente
        </div>
      )}
    </>
  )
}
