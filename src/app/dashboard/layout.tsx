'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ProfileProvider } from '@/contexts/ProfileContext'

const NAV_ITEMS = [
  { path: '/dashboard', icon: '📊', label: 'Inicio' },
  { path: '/dashboard/presupuestos', icon: '📄', label: 'Presupuestos' },
  { path: '/dashboard/clientes', icon: '👥', label: 'Clientes' },
  { path: '/dashboard/items', icon: '🔧', label: 'Items' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [userId, setUserId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setUserId(session.user.id)
      const { data } = await supabase.from('profiles').select('business_name, trade').eq('id', session.user.id).single()
      if (data) {
        setBusinessName(data.business_name || '')
        if (!data.business_name || !data.trade) {
          if (pathname !== '/dashboard/perfil') router.replace('/dashboard/perfil')
        }
      }
      setLoading(false)
    }
    init()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, s) => { if (!s) router.replace('/login') })
    return () => subscription.unsubscribe()
  }, [router, pathname])

  useEffect(() => {
    const off = () => setIsOffline(true)
    const on = () => setIsOffline(false)
    window.addEventListener('offline', off)
    window.addEventListener('online', on)
    if (!navigator.onLine) setIsOffline(true)
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on) }
  }, [])

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace('/login') }

  if (loading || !userId) {
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
    <ProfileProvider userId={userId}>
      <div className="min-h-screen bg-[#f8f9fb] flex flex-col" style={{ maxWidth: 480, margin: '0 auto' }}>
        {isOffline && (
          <div className="fixed top-0 left-0 right-0 z-[999] bg-amber-500 text-amber-900 text-center py-2 px-4 text-xs font-bold" style={{ fontFamily: 'var(--font-heading)', maxWidth: 480, margin: '0 auto' }}>
            📡 Sin conexión — Los cambios se guardarán al reconectar
          </div>
        )}
        <header className="bg-brand-gradient text-white px-5 py-4 flex items-center justify-between sticky top-0 z-50" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-sm shadow-md">🔧</div>
            <div>
              <span className="font-bold text-sm tracking-tight block leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                Presupuesto<span className="logo-text">PRO</span>
              </span>
              {businessName && <span className="text-[10px] text-slate-400 leading-tight">{businessName}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/dashboard/perfil')} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-sm" title="Perfil">⚙️</button>
            <button onClick={handleLogout} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-[11px] text-slate-400" title="Salir">↗</button>
          </div>
        </header>
        <main className="flex-1 overflow-auto pb-24">{children}</main>
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-lg border-t border-black/5 flex justify-around py-2 pb-3 z-50" style={{ maxWidth: 480, width: '100%', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname?.startsWith(item.path))
            return (
              <button key={item.path} onClick={() => router.push(item.path)} className="flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all relative">
                {isActive && <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500" />}
                <span className={`text-lg transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                <span className={`text-[10px] font-semibold transition-colors ${isActive ? 'text-amber-600' : 'text-slate-400'}`} style={{ fontFamily: 'var(--font-heading)' }}>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </ProfileProvider>
  )
}
