'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/contexts/ProfileContext'
import { QuoteCard } from '@/components/QuoteCard'
import { SearchInput } from '@/components/SearchInput'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'
import { CardSkeleton } from '@/components/LoadingSkeleton'
import { formatARS, STATUS_MAP } from '@/lib/types'
import type { Quote, QuoteItem, QuoteStatus } from '@/lib/types'

const STATUS_FLOW: QuoteStatus[] = ['draft', 'sent', 'accepted', 'in_progress', 'completed', 'paid']
const NEXT_ACTION: Record<string, string> = {
  draft: 'Marcar como Enviado', sent: 'Marcar como Aceptado',
  accepted: 'Empezar trabajo', in_progress: 'Completar trabajo', completed: 'Registrar cobro',
}

export default function PresupuestosPage() {
  const router = useRouter()
  const { profile } = useProfile()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState<(Quote & { items?: QuoteItem[] }) | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('quotes').select('*, client:clients(name, phone)')
      .eq('user_id', session.user.id).order('created_at', { ascending: false })
    if (data) setQuotes(data as Quote[])
    setLoading(false)
  }

  const viewQuote = async (quote: Quote) => {
    const { data: items } = await supabase.from('quote_items').select('*').eq('quote_id', quote.id).order('sort_order')
    setSelectedQuote({ ...quote, items: (items || []) as QuoteItem[] })
  }

  const updateStatus = async (quoteId: string, newStatus: QuoteStatus) => {
    const updates: Record<string, any> = { status: newStatus, updated_at: new Date().toISOString() }
    if (newStatus === 'sent') updates.sent_at = new Date().toISOString()
    if (newStatus === 'accepted') updates.accepted_at = new Date().toISOString()
    if (newStatus === 'paid') updates.paid_at = new Date().toISOString()
    await supabase.from('quotes').update(updates).eq('id', quoteId)
    setQuotes(quotes.map(q => q.id === quoteId ? { ...q, ...updates } : q))
    if (selectedQuote?.id === quoteId) setSelectedQuote({ ...selectedQuote, ...updates })
  }

  const duplicateQuote = async (quote: Quote & { items?: QuoteItem[] }) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: newQuote } = await supabase.from('quotes').insert({
      user_id: session.user.id, client_id: quote.client_id, title: `${quote.title || ''} (copia)`,
      status: 'draft', subtotal: quote.subtotal, discount_percent: quote.discount_percent,
      discount_amount: quote.discount_amount, total: quote.total, notes: quote.notes, vehicle_info: quote.vehicle_info,
    }).select().single()
    if (newQuote && quote.items?.length) {
      await supabase.from('quote_items').insert(quote.items.map((it, idx) => ({
        quote_id: newQuote.id, name: it.name, category: it.category, quantity: it.quantity,
        unit: it.unit, unit_price: it.unit_price, total: it.total, sort_order: idx,
      })))
    }
    setSelectedQuote(null); await loadData()
  }

  const deleteQuote = async (quoteId: string) => {
    await supabase.from('quote_items').delete().eq('quote_id', quoteId)
    await supabase.from('quotes').delete().eq('id', quoteId)
    setQuotes(quotes.filter(q => q.id !== quoteId))
    setSelectedQuote(null); setConfirmDelete(false)
  }

  const shareWhatsApp = (quote: Quote) => {
    const itemsList = selectedQuote?.items?.map(it => `\u2022 ${it.name}: ${formatARS(Number(it.total))}`).join('\n') || ''
    const msg = [`*Presupuesto #${quote.quote_number} \u2014 ${profile?.business_name}*`, '',
      quote.title ? `Trabajo: ${quote.title}` : '', quote.vehicle_info ? `Veh\u00edculo: ${quote.vehicle_info}` : '',
      '', itemsList, '', quote.discount_percent > 0 ? `Descuento: ${quote.discount_percent}%` : '',
      `*TOTAL: ${formatARS(Number(quote.total))}*`, '', quote.notes ? `Notas: ${quote.notes}` : '',
      '', '_Enviado con PresupuestoPRO_'].filter(Boolean).join('\n')
    const phone = (quote.client?.phone || '').replace(/\D/g, '')
    window.open(`https://wa.me/${phone.startsWith('54') ? phone : '54' + phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (loading) return <div className="p-4 space-y-3"><CardSkeleton count={5} /></div>

  if (selectedQuote) {
    const st = STATUS_MAP[selectedQuote.status]
    const nextIdx = STATUS_FLOW.indexOf(selectedQuote.status) + 1
    const nextStatus = nextIdx < STATUS_FLOW.length ? STATUS_FLOW[nextIdx] : null

    return (
      <div className="p-4 space-y-4 animate-fade-in">
        <button onClick={() => { setSelectedQuote(null); setConfirmDelete(false) }} className="text-sm text-gray-500 flex items-center gap-1">&larr; Volver a la lista</button>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Presupuesto #{selectedQuote.quote_number}</p>
              <h2 className="font-bold text-lg">{selectedQuote.client?.name || 'Sin cliente'}</h2>
              {selectedQuote.title && <p className="text-sm text-gray-500">{selectedQuote.title}</p>}
              {selectedQuote.vehicle_info && <p className="text-xs text-gray-400">{selectedQuote.vehicle_info}</p>}
            </div>
            <StatusBadge status={selectedQuote.status} />
          </div>
          <div className="space-y-1.5 mb-4">
            {selectedQuote.items?.map((it) => (
              <div key={it.id} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                <div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded mr-1.5 ${it.category === 'mano_de_obra' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                    {it.category === 'mano_de_obra' ? 'MO' : 'MAT'}
                  </span>
                  <span>{it.name}</span>
                  {it.quantity > 1 && <span className="text-gray-400 text-xs ml-1">&times;{it.quantity}</span>}
                </div>
                <span className="font-medium">{formatARS(Number(it.total))}</span>
              </div>
            ))}
          </div>
          {selectedQuote.discount_percent > 0 && (
            <div className="flex justify-between text-sm text-red-500 mb-1">
              <span>Descuento ({selectedQuote.discount_percent}%)</span>
              <span>-{formatARS(Number(selectedQuote.discount_amount))}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t border-gray-200">
            <span className="font-bold text-base">TOTAL</span>
            <span className="font-extrabold text-xl text-amber-600">{formatARS(Number(selectedQuote.total))}</span>
          </div>
          {selectedQuote.notes && <p className="mt-3 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg">{selectedQuote.notes}</p>}
          <p className="mt-2 text-[10px] text-gray-400">Creado: {new Date(selectedQuote.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="space-y-2">
          <button onClick={() => shareWhatsApp(selectedQuote)} className="btn-whatsapp w-full flex items-center justify-center gap-2">Enviar por WhatsApp</button>
          {nextStatus && NEXT_ACTION[selectedQuote.status] && (
            <button onClick={() => updateStatus(selectedQuote.id, nextStatus)} className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl text-sm">{NEXT_ACTION[selectedQuote.status]}</button>
          )}
          {(selectedQuote.status === 'draft' || selectedQuote.status === 'sent') && (
            <button onClick={() => router.push(`/dashboard/presupuestos/nuevo?edit=${selectedQuote.id}`)}
              className="w-full py-2.5 border border-amber-200 text-amber-700 rounded-xl text-xs font-medium hover:bg-amber-50 flex items-center justify-center gap-1.5">
              Editar presupuesto
            </button>
          )}
          <button onClick={() => duplicateQuote(selectedQuote)}
            className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-1.5">
            Duplicar presupuesto
          </button>
          {selectedQuote.status === 'sent' && (
            <button onClick={() => updateStatus(selectedQuote.id, 'rejected')}
              className="w-full py-2.5 border border-red-200 text-red-500 rounded-xl text-xs font-medium hover:bg-red-50">Marcar como Rechazado</button>
          )}
          {selectedQuote.status === 'draft' && (
            !confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="w-full py-2 text-red-400 text-xs hover:text-red-600">Eliminar borrador</button>
            ) : (
              <div className="bg-red-50 rounded-xl p-3 border border-red-200 space-y-2">
                <p className="text-xs text-red-700 font-medium">Seguro que queres eliminar este presupuesto?</p>
                <div className="flex gap-2">
                  <button onClick={() => deleteQuote(selectedQuote.id)} className="flex-1 py-2 bg-red-500 text-white text-xs font-bold rounded-lg">Si, eliminar</button>
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 text-xs rounded-lg">Cancelar</button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    )
  }

  const filteredQuotes = quotes
    .filter(q => filter === 'all' || q.status === filter)
    .filter(q => {
      if (!search) return true
      const s = search.toLowerCase()
      return (q.client?.name || '').toLowerCase().includes(s) || q.title.toLowerCase().includes(s) || String(q.quote_number).includes(s) || (q.vehicle_info || '').toLowerCase().includes(s)
    })

  const filters = [
    { id: 'all', label: 'Todos' }, { id: 'draft', label: 'Borrador' }, { id: 'sent', label: 'Enviados' },
    { id: 'accepted', label: 'Aceptados' }, { id: 'in_progress', label: 'En trabajo' }, { id: 'paid', label: 'Cobrados' },
  ]

  return (
    <div className="p-4 space-y-3 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Presupuestos</h2>
        <button onClick={() => router.push('/dashboard/presupuestos/nuevo')} className="px-4 py-2 bg-amber-500 text-gray-900 font-bold rounded-lg text-xs">+ Nuevo</button>
      </div>
      {quotes.length > 3 && <SearchInput value={search} onChange={setSearch} placeholder="Buscar por cliente, titulo, nro..." />}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === f.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {f.label}
            {f.id !== 'all' && <span className="ml-1 opacity-60">{quotes.filter(q => q.status === f.id).length}</span>}
          </button>
        ))}
      </div>
      {filteredQuotes.length === 0 ? (
        <EmptyState icon="clipboard" title={search ? `Sin resultados para "${search}"` : filter === 'all' ? 'No hay presupuestos todavia' : 'Sin presupuestos en este filtro'} />
      ) : (
        <div className="space-y-2">{filteredQuotes.map((q) => <QuoteCard key={q.id} quote={q} onClick={() => viewQuote(q)} />)}</div>
      )}
    </div>
  )
}
