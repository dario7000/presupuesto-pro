'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { registerSW, syncQueue, getQueue } from '@/lib/offline'
import type { Profile } from '@/lib/types'

const NAV_ITEMS = [
  { path: '/dashboard', icon: '📊', activeIcon: '📊', label: 'Inicio' },
  { path: '/dashboard/presupuestos', icon: '📄', activeIcon: '📄', label: 'Presupuestos' },
  { path: '/dashboard/clientes', icon: '👥', activeIcon: '👥', label: 'Clientes' },
  { path: '/dashboard/items', icon: '🔧', activeIcon: '🔧', label: 'Items' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [showSynced, setShowSynced] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single()

      if (profileData) {
        setProfile(profileData as Profile)
        if (!profileData.business_name || !profileData.trade) {
          if (pathname !== '/dashboard/perfil') router.replace('/dashboard/perfil')
        }
      }
      setLoading(false)
    }

    init()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/login')
    })
    return () => subscription.unsubscribe()
  }, [router, pathname])

  // PWA & offline
  useEffect(() => {
    registerSW()
    const handleOffline = () => setIsOffline(true)
    const handleOnline = async () => {
      setIsOffline(false)
      const queue = getQueue()
      if (queue.length > 0) {
        await syncQueue(supabase)
        setShowSynced(true)
        setTimeout(() => setShowSynced(false), 3000)
      }
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    if (!navigator.onLine) setIsOffline(true)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 mb-4" style={{ boxShadow: '0 8px 32px rgba(245, 158, 11, 0.2)' }}>
            <span className="text-xl">🔧</span>
          </div>
          <p className="text-slate-400 text-sm font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col" style={{ maxWidth: 480, margin: '0 auto' }}>
      {/* Offline banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[999] bg-amber-500 text-amber-900 text-center py-2 px-4 text-xs font-bold" style={{ fontFamily: 'var(--font-heading)', maxWidth: 480, margin: '0 auto' }}>
          📡 Sin conexión — Los cambios se guardarán al reconectar
        </div>
      )}
      {showSynced && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg toast" style={{ fontFamily: 'var(--font-heading)' }}>
          ✅ Datos sincronizados
        </div>
      )}

      {/* Header */}
      <header className="bg-brand-gradient text-white px-5 py-4 flex items-center justify-between sticky top-0 z-50" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-sm shadow-md">
            🔧
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight block leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Presupuesto<span className="logo-text">PRO</span>
            </span>
            {profile?.business_name && (
              <span className="text-[10px] text-slate-400 leading-tight">{profile.business_name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/dashboard/perfil')}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-sm" title="Perfil">
            ⚙️
          </button>
          <button onClick={handleLogout}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-[11px] text-slate-400" title="Salir">
            ↗
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto pb-24">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-lg border-t border-black/5 flex justify-around py-2 pb-3 z-50" style={{ maxWidth: 480, width: '100%', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname?.startsWith(item.path))
          return (
            <button key={item.path} onClick={() => router.push(item.path)}
              className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all relative">
              {isActive && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500" />
              )}
              <span className={`text-lg transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
              <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-amber-600' : 'text-slate-400'}`}
                style={{ fontFamily: 'var(--font-heading)' }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
