'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/contexts/ProfileContext'
import { StatsSkeleton } from '@/components/LoadingSkeleton'
import { QuoteCard } from '@/components/QuoteCard'
import { EmptyState } from '@/components/EmptyState'
import type { Quote } from '@/lib/types'

export default function DashboardPage() {
  const router = useRouter()
  const { profile, t, formatMoney } = useProfile()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ count: 0, amount: 0, pending: 0, paid: 0 })

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data } = await supabase.from('quotes').select('*, client:clients(name, phone)')
        .eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(5)
      const all = (data || []) as Quote[]
      setQuotes(all)
      const { data: allQ } = await supabase.from('quotes').select('total, status').eq('user_id', session.user.id)
      if (allQ) {
        setStats({
          count: allQ.length,
          amount: allQ.reduce((s, q) => s + Number(q.total), 0),
          pending: allQ.filter(q => ['sent','accepted','in_progress'].includes(q.status)).reduce((s, q) => s + Number(q.total), 0),
          paid: allQ.filter(q => q.status === 'paid').reduce((s, q) => s + Number(q.total), 0),
        })
      }
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <StatsSkeleton />

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            {t.dash_welcome}, {profile?.owner_name?.split(' ')[0] || ''} 👋
          </h1>
          <p className="text-xs text-gray-400">{stats.count} {t.dash_quotes}</p>
        </div>
        <button onClick={() => router.push('/dashboard/perfil')} className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
          {profile?.owner_name?.[0] || '?'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: '💰', label: t.dash_total, value: formatMoney(stats.amount), color: 'amber' },
          { icon: '⏳', label: t.dash_pending, value: formatMoney(stats.pending), color: 'orange', textColor: 'text-amber-600' },
          { icon: '✅', label: t.dash_collected, value: formatMoney(stats.paid), color: 'emerald', textColor: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <span className="text-lg">{s.icon}</span>
            <p className={`font-bold text-sm mt-0.5 ${s.textColor || 'text-gray-800'}`} style={{ fontFamily: 'var(--font-heading)' }}>{s.value}</p>
            <p className="text-[10px] text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">{t.dash_recent}</h2>
        {quotes.length > 0 && <button onClick={() => router.push('/dashboard/presupuestos')} className="text-xs text-amber-600 font-medium">{t.dash_view_all}</button>}
      </div>

      {quotes.length === 0 ? (
        <EmptyState icon="📋" title={t.dash_no_quotes} subtitle={t.dash_no_quotes_sub} />
      ) : (
        <div className="space-y-2">
          {quotes.map(q => (
            <QuoteCard key={q.id} quote={q} onClick={() => router.push('/dashboard/presupuestos')} />
          ))}
        </div>
      )}

      <button onClick={() => router.push('/dashboard/presupuestos/nuevo')}
        className="btn-primary w-full">{t.dash_new_quote}</button>
    </div>
  )
}
