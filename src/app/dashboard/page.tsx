'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/contexts/ProfileContext'
import { formatARS } from '@/lib/types'
import { StatsSkeleton } from '@/components/LoadingSkeleton'
import { StatusBadge } from '@/components/StatusBadge'
import type { Quote } from '@/lib/types'

export default function DashboardPage() {
  const router = useRouter()
  const { profile } = useProfile()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('quotes').select('*, client:clients(name, phone)')
        .eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(50)
      if (data) setQuotes(data as Quote[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <StatsSkeleton />

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthQuotes = quotes.filter(q => q.created_at >= startOfMonth && q.status !== 'draft')
  const stats = {
    total: monthQuotes.length,
    amount: monthQuotes.reduce((s, q) => s + Number(q.total), 0),
    pending: monthQuotes.filter(q => !['paid', 'rejected'].includes(q.status)).reduce((s, q) => s + Number(q.total), 0),
    paid: monthQuotes.filter(q => q.status === 'paid').reduce((s, q) => s + Number(q.total), 0),
  }
  const recent = quotes.slice(0, 5)
  const firstName = profile?.owner_name?.split(' ')[0] || ''

  return (
    <div className="p-5 space-y-5 animate-fade-in">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Hola, {firstName} 👋</h2>
        <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: 'var(--font-heading)' }}>{now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 stagger">
        {[
          { icon: '📄', label: 'Presupuestos', value: stats.total, color: 'blue' },
          { icon: '💰', label: 'Total', value: formatARS(stats.amount), color: 'amber' },
          { icon: '⏳', label: 'Pendiente', value: formatARS(stats.pending), color: 'orange', textColor: 'text-amber-600' },
          { icon: '✅', label: 'Cobrado', value: formatARS(stats.paid), color: 'emerald', textColor: 'text-emerald-600' },
        ].map((s, i) => (
          <div key={i} className="stat-card animate-fade-in" style={{ opacity: 0 }}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg bg-${s.color}-50 flex items-center justify-center text-sm`}>{s.icon}</div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider" style={{ fontFamily: 'var(--font-heading)' }}>{s.label}</span>
            </div>
            <div className={`font-extrabold ${typeof s.value === 'number' ? 'text-xl' : 'text-lg'} ${s.textColor || 'text-slate-900'}`} style={{ fontFamily: 'var(--font-heading)' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <button onClick={() => router.push('/dashboard/presupuestos/nuevo')} className="btn-primary w-full flex items-center justify-center gap-2">
        <span className="text-base">➕</span> Nuevo presupuesto
      </button>
      {profile?.plan === 'free' && (
        <div className="glass-card p-4 flex items-center justify-between !border-amber-100">
          <div>
            <p className="text-xs font-bold text-slate-700" style={{ fontFamily: 'var(--font-heading)' }}>Plan Gratis</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full w-24 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all" style={{ width: `${Math.min(((profile.quotes_this_month || 0) / 5) * 100, 100)}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 font-medium">{profile.quotes_this_month || 0}/5</span>
            </div>
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 rounded-xl text-xs font-bold shadow-sm" style={{ fontFamily: 'var(--font-heading)' }}>Upgrade PRO</button>
        </div>
      )}
      {recent.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-700" style={{ fontFamily: 'var(--font-heading)' }}>Últimos presupuestos</h3>
            <button onClick={() => router.push('/dashboard/presupuestos')} className="text-xs text-amber-600 font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Ver todos →</button>
          </div>
          <div className="space-y-2 stagger">
            {recent.map(q => (
              <button key={q.id} onClick={() => router.push(`/dashboard/presupuestos?id=${q.id}`)} className="w-full glass-card p-4 flex items-center justify-between text-left animate-fade-in" style={{ opacity: 0 }}>
                <div>
                  <div className="font-semibold text-sm text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>{q.client?.name || 'Sin cliente'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{q.title || `Presupuesto #${q.quote_number}`}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>{formatARS(Number(q.total))}</div>
                  <StatusBadge status={q.status} />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4"><span className="text-2xl">📋</span></div>
          <p className="text-slate-600 text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Todavía no tenés presupuestos</p>
          <p className="text-slate-400 text-xs mt-1">Creá el primero y empezá a facturar más</p>
        </div>
      )}
    </div>
  )
}
