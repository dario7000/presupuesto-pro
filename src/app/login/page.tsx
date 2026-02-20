'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type ViewMode = 'login' | 'register' | 'forgot'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [view, setView] = useState<ViewMode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const reset = () => { setError(''); setSuccess('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); reset()
    if (view === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/dashboard/perfil` })
      if (error) setError(error.message); else setSuccess('Revisá tu email para restablecer tu contraseña.')
      setLoading(false); return
    }
    if (view === 'register') {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` } })
      if (error) setError(error.message); else setSuccess('¡Cuenta creada! Revisá tu email para confirmar.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : error.message)
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` } })
  }

  return (
    <div className="min-h-screen bg-brand-gradient flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-amber-500/5 blur-3xl" />
      </div>
      <div className="w-full max-w-[380px] relative animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 mb-4 shadow-lg" style={{ boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)' }}>
            <span className="text-2xl">🔧</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Presupuesto<span className="logo-text">PRO</span></h1>
          <p className="text-slate-400 text-sm">{view === 'forgot' ? 'Recuperar contraseña' : view === 'register' ? 'Creá tu cuenta gratis' : 'Ingresá a tu cuenta'}</p>
        </div>

        {view !== 'forgot' && (
          <>
            <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm transition-all mb-5 shadow-sm" style={{ fontFamily: 'var(--font-heading)' }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continuar con Google
            </button>
            <div className="flex items-center gap-4 mb-5"><div className="flex-1 h-px bg-white/10" /><span className="text-xs text-slate-500 font-medium uppercase tracking-wider">o con email</span><div className="flex-1 h-px bg-white/10" /></div>
          </>
        )}

        {view === 'forgot' && <button onClick={() => { setView('login'); reset() }} className="text-sm text-slate-400 mb-4 hover:text-white">← Volver</button>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required className="input-dark" />
          {view !== 'forgot' && <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña (mínimo 6)" required minLength={6} className="input-dark" />}
          {error && <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl"><span className="text-red-400 text-xs">⚠️ {error}</span></div>}
          {success && <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"><span className="text-emerald-400 text-xs">✅ {success}</span></div>}
          <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
            {loading ? 'Cargando...' : view === 'forgot' ? 'Enviar link' : view === 'register' ? 'Crear cuenta gratis' : 'Ingresar'}
          </button>
        </form>

        {view === 'login' && <button onClick={() => { setView('forgot'); reset() }} className="block w-full text-center mt-3 text-xs text-slate-500 hover:text-amber-400">¿Olvidaste tu contraseña?</button>}
        {view !== 'forgot' && (
          <p className="text-center mt-6 text-sm text-slate-500">
            {view === 'register' ? '¿Ya tenés cuenta? ' : '¿No tenés cuenta? '}
            <button onClick={() => { setView(view === 'register' ? 'login' : 'register'); reset() }} className="text-amber-400 font-semibold hover:text-amber-300">{view === 'register' ? 'Ingresá' : 'Registrate gratis'}</button>
          </p>
        )}
        <div className="flex items-center justify-center gap-6 mt-8 text-[11px] text-slate-600">
          <span>🔒 Datos seguros</span><span>⚡ Gratis para siempre</span><span>📱 Mobile-first</span>
        </div>
      </div>
    </div>
  )
}
