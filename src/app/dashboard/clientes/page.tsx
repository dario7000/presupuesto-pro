'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { SearchInput } from '@/components/SearchInput'
import { EmptyState } from '@/components/EmptyState'
import { CardSkeleton } from '@/components/LoadingSkeleton'
import { formatARS } from '@/lib/types'
import type { ClientWithStats } from '@/lib/types'

export default function ClientesPage() {
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingClient, setEditingClient] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')

  useEffect(() => { loadClients() }, [])

  const loadClients = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const [{ data: clientsData }, { data: quotes }] = await Promise.all([
      supabase.from('clients').select('*').eq('user_id', session.user.id).order('name'),
      supabase.from('quotes').select('client_id, total').eq('user_id', session.user.id),
    ])
    if (clientsData) {
      const clientStats = clientsData.map((client: any) => {
        const cq = (quotes || []).filter((q: any) => q.client_id === client.id)
        return { ...client, quote_count: cq.length, total_amount: cq.reduce((s: number, q: any) => s + Number(q.total), 0) }
      })
      setClients(clientStats)
    }
    setLoading(false)
  }

  const startEdit = (c: ClientWithStats) => { setEditingClient(c.id); setEditName(c.name); setEditPhone(c.phone || ''); setEditEmail(c.email || '') }
  const saveEdit = async () => {
    if (!editingClient) return
    await supabase.from('clients').update({ name: editName, phone: editPhone, email: editEmail }).eq('id', editingClient)
    setEditingClient(null); loadClients()
  }
  const deleteClient = async (id: string) => {
    if (!confirm('Eliminar este cliente? Los presupuestos no se eliminan.')) return
    await supabase.from('clients').delete().eq('id', id)
    setClients(clients.filter(c => c.id !== id))
  }

  const filtered = clients.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    return c.name.toLowerCase().includes(s) || (c.phone || '').includes(s) || (c.email || '').toLowerCase().includes(s)
  })

  if (loading) return <div className="p-4"><CardSkeleton count={4} /></div>

  return (
    <div className="p-4 space-y-3 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Clientes</h2>
        <p className="text-xs text-gray-500">Se guardan automaticamente al crear presupuestos</p>
      </div>
      {clients.length > 3 && <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, telefono..." />}
      {filtered.length === 0 ? (
        <EmptyState icon="people" title={search ? `Sin resultados para "${search}"` : 'Todavia no tenes clientes'}
          subtitle={search ? undefined : 'Se crean automaticamente cuando haces un presupuesto'} />
      ) : (
        filtered.map(c => (
          <div key={c.id} className="bg-white rounded-xl p-4 border border-gray-100">
            {editingClient === c.id ? (
              <div className="space-y-2">
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="Nombre" />
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="Telefono" />
                <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="Email" />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="flex-1 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg">Guardar</button>
                  <button onClick={() => setEditingClient(null)} className="flex-1 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm">{c.name}</div>
                  {c.phone && (
                    <a href={`https://wa.me/${c.phone.replace(/\D/g, '').startsWith('54') ? c.phone.replace(/\D/g, '') : '54' + c.phone.replace(/\D/g, '')}`}
                      target="_blank" rel="noopener" className="text-xs text-green-600 hover:underline">{c.phone}</a>
                  )}
                  {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="text-xs text-gray-500">{c.quote_count} presup.</div>
                    <div className="font-bold text-sm text-amber-600">{formatARS(c.total_amount)}</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => startEdit(c)} className="text-gray-300 hover:text-amber-500 text-xs">Edit</button>
                    <button onClick={() => deleteClient(c.id)} className="text-gray-300 hover:text-red-400 text-xs">X</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
