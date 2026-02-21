'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/contexts/ProfileContext'
import { SearchInput } from '@/components/SearchInput'
import { EmptyState } from '@/components/EmptyState'
import type { Client } from '@/lib/types'

interface ClientWithStats extends Client { quote_count: number; total_amount: number }

export default function ClientesPage() {
  const { t, formatMoney } = useProfile()
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '' })

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: clientsData } = await supabase.from('clients').select('*').eq('user_id', session.user.id).order('name')
      const { data: quotesData } = await supabase.from('quotes').select('client_id, total').eq('user_id', session.user.id)
      const statsMap: Record<string, { count: number; amount: number }> = {}
      quotesData?.forEach(q => {
        if (!q.client_id) return
        if (!statsMap[q.client_id]) statsMap[q.client_id] = { count: 0, amount: 0 }
        statsMap[q.client_id].count++
        statsMap[q.client_id].amount += Number(q.total)
      })
      setClients((clientsData || []).map(c => ({
        ...c, quote_count: statsMap[c.id]?.count || 0, total_amount: statsMap[c.id]?.amount || 0,
      })) as ClientWithStats[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = search
    ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase()))
    : clients

  const startEdit = (c: ClientWithStats) => { setEditingId(c.id); setEditForm({ name: c.name, phone: c.phone, email: c.email }) }
  const saveEdit = async () => {
    if (!editingId) return
    await supabase.from('clients').update(editForm).eq('id', editingId)
    setClients(clients.map(c => c.id === editingId ? { ...c, ...editForm } : c))
    setEditingId(null)
  }
  const deleteClient = async (id: string) => {
    await supabase.from('clients').delete().eq('id', id)
    setClients(clients.filter(c => c.id !== id))
  }

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-gray-400 text-sm">{t.loading}</p></div>

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{t.clients_title}</h2>
      {clients.length >= 3 && <SearchInput value={search} onChange={setSearch} placeholder={t.clients_search} />}
      {filtered.length === 0 ? (
        <EmptyState icon="👥" title={t.clients_empty} subtitle={t.clients_empty_sub} />
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-xl p-4 border border-gray-100">
              {editingId === c.id ? (
                <div className="space-y-2">
                  <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder={t.clients_name} className="input-field" />
                  <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder={t.clients_phone} className="input-field" />
                  <input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder={t.clients_email} className="input-field" />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold">{t.clients_save}</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs">{t.quotes_cancel}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{c.name}</p>
                    {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    <p className="text-[10px] text-gray-400">{c.quote_count} {t.clients_quotes}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-amber-600">{formatMoney(c.total_amount)}</div>
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => startEdit(c)} className="text-[10px] text-gray-400 hover:text-amber-600">{t.clients_edit}</button>
                      {c.quote_count === 0 && <button onClick={() => deleteClient(c.id)} className="text-[10px] text-gray-400 hover:text-red-500">{t.clients_delete}</button>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
