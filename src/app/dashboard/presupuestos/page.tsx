'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatARS, STATUS_MAP } from '@/lib/types'
import type { Quote, QuoteItem, Profile, QuoteStatus } from '@/lib/types'

const STATUS_FLOW: QuoteStatus[] = ['draft', 'sent', 'accepted', 'in_progress', 'completed', 'paid']
const NEXT_ACTION: Record<string, string> = {
  draft: 'Marcar como Enviado',
  sent: 'Marcar como Aceptado',
  accepted: 'Empezar trabajo',
  in_progress: 'Completar trabajo',
  completed: 'Registrar cobro',
}

export default function PresupuestosPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState<(Quote & { items?: QuoteItem[] }) | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const [profileRes, quotesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase
        .from('quotes')
        .select('*, client:clients(name, phone)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
    ])

    if (profileRes.data) setProfile(profileRes.data as Profile)
    if (quotesRes.data) setQuotes(quotesRes.data as Quote[])
    setLoading(false)
  }

  const viewQuote = async (quote: Quote) => {
    const { data: items } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quote.id)
      .order('sort_order')

    setSelectedQuote({ ...quote, items: (items || []) as QuoteItem[] })
  }

  const updateStatus = async (quoteId: string, newStatus: QuoteStatus) => {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() }
    if (newStatus === 'sent') updates.sent_at = new Date().toISOString()
    if (newStatus === 'accepted') updates.accepted_at = new Date().toISOString()
    if (newStatus === 'paid') updates.paid_at = new Date().toISOString()

    await supabase.from('quotes').update(updates).eq('id', quoteId)

    setQuotes(quotes.map(q => q.id === quoteId ? { ...q, ...updates } : q))
    if (selectedQuote?.id === quoteId) {
      setSelectedQuote({ ...selectedQuote, ...updates })
    }
  }

  const shareWhatsApp = (quote: Quote) => {
    const client = (quote as any).client
    const itemsList = selectedQuote?.items?.map(it =>
      `• ${it.name}: ${formatARS(Number(it.total))}`
    ).join('\n') || ''

    const msg = [
      `*Presupuesto #${quote.quote_number} — ${profile?.business_name}*`,
      '',
      quote.title ? `Trabajo: ${quote.title}` : '',
      quote.vehicle_info ? `Vehículo: ${quote.vehicle_info}` : '',
      '',
      itemsList,
      '',
      quote.discount_percent > 0 ? `Descuento: ${quote.discount_percent}%` : '',
      `*TOTAL: ${formatARS(Number(quote.total))}*`,
      '',
      quote.notes ? `Notas: ${quote.notes}` : '',
      '',
      `_Enviado con PresupuestoPRO_`,
    ].filter(Boolean).join('\n')

    const phone = (client?.phone || '').replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/${phone.startsWith('54') ? phone : '54' + phone}?text=${encodeURIComponent(msg)}`
    window.open(whatsappUrl, '_blank')
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-gray-400 text-sm">Cargando...</p></div>
  }

  // DETAIL VIEW
  if (selectedQuote) {
    const st = STATUS_MAP[selectedQuote.status]
    const nextIdx = STATUS_FLOW.indexOf(selectedQuote.status) + 1
    const nextStatus = nextIdx < STATUS_FLOW.length ? STATUS_FLOW[nextIdx] : null
    const client = (selectedQuote as any).client

    return (
      <div className="p-4 space-y-4">
        <button onClick={() => setSelectedQuote(null)} className="text-sm text-gray-500 flex items-center gap-1">
          ← Volver a la lista
        </button>

        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[10px] text-gray-400 uppercase">Presupuesto #{selectedQuote.quote_number}</p>
              <h2 className="font-bold text-lg">{client?.name || 'Sin cliente'}</h2>
              {selectedQuote.title && <p className="text-sm text-gray-500">{selectedQuote.title}</p>}
              {selectedQuote.vehicle_info && <p className="text-xs text-gray-400">🚗 {selectedQuote.vehicle_info}</p>}
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.color}`}>
              {st.label}
            </span>
          </div>

          {/* Items */}
          <div className="space-y-1.5 mb-4">
            {selectedQuote.items?.map((it) => (
              <div key={it.id} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                <div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded mr-1.5 ${
                    it.category === 'mano_de_obra' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {it.category === 'mano_de_obra' ? 'MO' : 'MAT'}
                  </span>
                  <span>{it.name}</span>
                  {it.quantity > 1 && <span className="text-gray-400 text-xs ml-1">×{it.quantity}</span>}
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

          {selectedQuote.notes && (
            <p className="mt-3 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg">{selectedQuote.notes}</p>
          )}

          <p className="mt-2 text-[10px] text-gray-400">
            Creado: {new Date(selectedQuote.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => shareWhatsApp(selectedQuote)}
            className="btn-whatsapp w-full flex items-center justify-center gap-2"
          >
            📲 Enviar por WhatsApp
          </button>

          {nextStatus && NEXT_ACTION[selectedQuote.status] && (
            <button
              onClick={() => updateStatus(selectedQuote.id, nextStatus)}
              className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl text-sm"
            >
              {NEXT_ACTION[selectedQuote.status]}
            </button>
          )}

          {selectedQuote.status === 'sent' && (
            <button
              onClick={() => updateStatus(selectedQuote.id, 'rejected')}
              className="w-full py-2.5 border border-red-200 text-red-500 rounded-xl text-xs font-medium hover:bg-red-50"
            >
              Marcar como Rechazado
            </button>
          )}
        </div>
      </div>
    )
  }

  // LIST VIEW
  const filteredQuotes = filter === 'all' ? quotes : quotes.filter(q => q.status === filter)
  const filters = [
    { id: 'all', label: 'Todos' },
    { id: 'draft', label: 'Borrador' },
    { id: 'sent', label: 'Enviados' },
    { id: 'accepted', label: 'Aceptados' },
    { id: 'in_progress', label: 'En trabajo' },
    { id: 'paid', label: 'Cobrados' },
  ]

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Presupuestos</h2>
        <button
          onClick={() => router.push('/dashboard/presupuestos/nuevo')}
          className="px-4 py-2 bg-amber-500 text-gray-900 font-bold rounded-lg text-xs"
        >
          + Nuevo
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredQuotes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-gray-400 text-sm">
            {filter === 'all' ? 'No hay presupuestos todavía' : `No hay presupuestos con estado "${filters.find(f => f.id === filter)?.label}"`}
          </p>
        </div>
      ) : (
        filteredQuotes.map((q) => {
          const clientName = (q as any).client?.name || 'Sin cliente'
          const st = STATUS_MAP[q.status]
          return (
            <button
              key={q.id}
              onClick={() => viewQuote(q)}
              className="w-full bg-white rounded-xl p-4 border border-gray-100 text-left hover:border-amber-200 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-sm">{clientName}</div>
                  <div className="text-xs text-gray-500">{q.title || `Presupuesto #${q.quote_number}`}</div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {new Date(q.created_at).toLocaleDateString('es-AR')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm mb-1">{formatARS(Number(q.total))}</div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.bg} ${st.color}`}>
                    {st.label}
                  </span>
                </div>
              </div>
            </button>
          )
        })
      )}
    </div>
  )
}
