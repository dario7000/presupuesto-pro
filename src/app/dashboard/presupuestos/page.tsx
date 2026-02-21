'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/contexts/ProfileContext'
import { SearchInput } from '@/components/SearchInput'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import { generateQuotePDF } from '@/lib/pdf-generator'
import type { Quote, QuoteStatus } from '@/lib/types'

export default function PresupuestosPage() {
  const router = useRouter()
  const { profile, t, formatMoney, lang } = useProfile()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('quotes')
        .select('*, client:clients(name, phone), items:quote_items(*)')
        .eq('user_id', session.user.id).order('created_at', { ascending: false })
      if (data) setQuotes(data as Quote[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = quotes.filter(q => {
    if (filter !== 'all' && q.status !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      return q.client?.name?.toLowerCase().includes(s) || q.title?.toLowerCase().includes(s) ||
        String(q.quote_number).includes(s) || q.vehicle_info?.toLowerCase().includes(s)
    }
    return true
  })

  const statusCounts = quotes.reduce((acc, q) => { acc[q.status] = (acc[q.status] || 0) + 1; return acc }, {} as Record<string, number>)

  const handleStatusChange = async (quoteId: string, newStatus: QuoteStatus) => {
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() }
    if (newStatus === 'sent') updates.sent_at = new Date().toISOString()
    if (newStatus === 'accepted') updates.accepted_at = new Date().toISOString()
    if (newStatus === 'paid') updates.paid_at = new Date().toISOString()
    await supabase.from('quotes').update(updates).eq('id', quoteId)
    setQuotes(quotes.map(q => q.id === quoteId ? { ...q, ...updates } : q))
    if (selectedQuote?.id === quoteId) setSelectedQuote({ ...selectedQuote, ...updates })
  }

  const handleWhatsApp = (quote: Quote) => {
    if (!quote.client?.phone) return
    const itemsList = quote.items?.map(it => `\u2022 ${it.name}: ${formatMoney(Number(it.total))}`).join('\n') || ''
    const msg = [
      `*${t.pdf_quote} #${quote.quote_number} - ${profile?.business_name}*`, '',
      quote.title ? `${t.new_wa_work}: ${quote.title}` : '', quote.vehicle_info ? `${t.new_wa_vehicle}: ${quote.vehicle_info}` : '',
      '', itemsList, '',
      Number(quote.discount_percent) > 0 ? `${t.new_discount}: ${quote.discount_percent}%` : '',
      `*${t.new_total}: ${formatMoney(Number(quote.total))}*`, '',
      quote.notes ? `${t.new_wa_notes}: ${quote.notes}` : '', '', `_${t.new_wa_sent_with}_`
    ].filter(Boolean).join('\n')
    const phone = quote.client.phone.replace(/\D/g, '')
    window.open(`https://wa.me/${phone.startsWith('54') ? phone : '54' + phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleDuplicate = async (quote: Quote) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: newQ } = await supabase.from('quotes').insert({
      user_id: session.user.id, client_id: quote.client_id, title: (quote.title || '') + ` ${t.copy}`,
      status: 'draft', subtotal: quote.subtotal, discount_percent: quote.discount_percent,
      discount_amount: quote.discount_amount, iva_percent: quote.iva_percent, iva_amount: quote.iva_amount,
      total: quote.total, notes: quote.notes, vehicle_info: quote.vehicle_info,
    }).select().single()
    if (newQ && quote.items?.length) {
      await supabase.from('quote_items').insert(quote.items.map((it, idx) => ({
        quote_id: newQ.id, name: it.name, category: it.category, quantity: it.quantity,
        unit: it.unit, unit_price: it.unit_price, total: it.total, sort_order: idx,
      })))
    }
    if (newQ) setQuotes([{ ...newQ, client: quote.client, items: quote.items } as Quote, ...quotes])
    setSelectedQuote(null)
  }

  const handleDelete = async () => {
    if (!selectedQuote) return
    await supabase.from('quote_items').delete().eq('quote_id', selectedQuote.id)
    await supabase.from('quotes').delete().eq('id', selectedQuote.id)
    setQuotes(quotes.filter(q => q.id !== selectedQuote.id))
    setSelectedQuote(null); setShowDeleteConfirm(false)
  }

  const handleDownloadPDF = async (quote: Quote) => {
    try {
      const pdf = await generateQuotePDF({
        quoteNumber: quote.quote_number, title: quote.title, vehicleInfo: quote.vehicle_info || undefined,
        clientName: quote.client?.name || '', clientPhone: quote.client?.phone || undefined,
        items: quote.items?.map(it => ({ name: it.name, category: it.category, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price })) || [],
        subtotal: Number(quote.subtotal), discountPercent: Number(quote.discount_percent), discountAmount: Number(quote.discount_amount),
        ivaPercent: Number(quote.iva_percent), ivaAmount: Number(quote.iva_amount), total: Number(quote.total),
        notes: quote.notes, createdAt: quote.created_at,
      }, {
        businessName: profile?.business_name || '', ownerName: profile?.owner_name || '',
        phone: profile?.phone || '', address: profile?.address || '', city: profile?.city || '',
        trade: profile?.trade || '', logoUrl: profile?.logo_url || null,
      }, { watermark: profile?.plan === 'free', currency: profile?.currency || 'ARS', lang })
      pdf.save(`${t.pdf_quote}-${quote.quote_number}.pdf`)
    } catch (e) { console.error('PDF error:', e) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-gray-400 text-sm">{t.loading}</p></div>

  const statusFilters = ['all','draft','sent','accepted','in_progress','completed','paid']

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{t.quotes_title}</h2>
        <button onClick={() => router.push('/dashboard/presupuestos/nuevo')}
          className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md">{t.quotes_new}</button>
      </div>

      {quotes.length >= 3 && <SearchInput value={search} onChange={setSearch} placeholder={t.quotes_search} />}

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
        {statusFilters.map(s => {
          const count = s === 'all' ? quotes.length : (statusCounts[s] || 0)
          if (s !== 'all' && count === 0) return null
          const active = filter === s
          const label = s === 'all' ? t.quotes_all : (t[`status_${s}` as keyof typeof t] || s)
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${active ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {s === 'all' ? t.quotes_all : t[`status_${s}` as keyof typeof t]} ({count})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📋" title={t.quotes_empty} subtitle={t.quotes_empty_sub} />
      ) : (
        <div className="space-y-2">
          {filtered.map(q => (
            <button key={q.id} onClick={() => setSelectedQuote(q)}
              className="w-full bg-white rounded-xl p-4 border border-gray-100 text-left hover:border-amber-200 transition-all">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">#{q.quote_number}</span>
                    <StatusBadge status={q.status} size="xs" />
                  </div>
                  <p className="font-medium text-sm text-gray-800 mt-1 truncate">{q.client?.name || '-'}</p>
                  {q.title && <p className="text-xs text-gray-400 truncate">{q.title}</p>}
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm">{formatMoney(Number(q.total))}</span>
                  <p className="text-[10px] text-gray-400">{new Date(q.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setSelectedQuote(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">{t.quotes_detail} #{selectedQuote.quote_number}</h3>
              <div className="flex items-center gap-2">
                {['draft','sent'].includes(selectedQuote.status) && (
                  <button onClick={() => router.push(`/dashboard/presupuestos/nuevo?edit=${selectedQuote.id}`)}
                    className="text-xs text-amber-600 font-medium">{t.quotes_edit}</button>
                )}
                <button onClick={() => setSelectedQuote(null)} className="text-gray-400 text-lg">&times;</button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{selectedQuote.client?.name || '-'}</p>
                  {selectedQuote.title && <p className="text-xs text-gray-500">{selectedQuote.title}</p>}
                </div>
                <StatusBadge status={selectedQuote.status} />
              </div>

              {selectedQuote.items && selectedQuote.items.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500">{t.quotes_items}</p>
                  {selectedQuote.items.map(it => (
                    <div key={it.id} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                      <span className="truncate flex-1">{it.name}</span>
                      <span className="font-medium">{formatMoney(Number(it.total))}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-gray-900 rounded-xl p-4 text-white space-y-1">
                <div className="flex justify-between text-sm"><span className="text-gray-400">{t.new_subtotal}</span><span>{formatMoney(Number(selectedQuote.subtotal))}</span></div>
                {Number(selectedQuote.discount_percent) > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-gray-400">{t.quotes_discount} ({selectedQuote.discount_percent}%)</span>
                    <span className="text-red-400">-{formatMoney(Number(selectedQuote.discount_amount))}</span></div>
                )}
                {Number(selectedQuote.iva_percent) > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-gray-400">{t.new_iva} ({selectedQuote.iva_percent}%)</span>
                    <span className="text-green-400">+{formatMoney(Number(selectedQuote.iva_amount))}</span></div>
                )}
                <div className="border-t border-gray-700 pt-1 flex justify-between">
                  <span className="font-bold">{t.quotes_total}</span>
                  <span className="font-extrabold text-xl text-amber-400">{formatMoney(Number(selectedQuote.total))}</span>
                </div>
              </div>

              {selectedQuote.notes && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-1">{t.quotes_notes}</p>
                  <p className="text-xs text-amber-800">{selectedQuote.notes}</p>
                </div>
              )}

              {/* Status buttons */}
              <div className="flex flex-wrap gap-1.5">
                {selectedQuote.status === 'draft' && <button onClick={() => handleStatusChange(selectedQuote.id, 'sent')} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{t.status_sent}</button>}
                {selectedQuote.status === 'sent' && <>
                  <button onClick={() => handleStatusChange(selectedQuote.id, 'accepted')} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">{t.status_accepted}</button>
                  <button onClick={() => handleStatusChange(selectedQuote.id, 'rejected')} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">{t.status_rejected}</button>
                </>}
                {selectedQuote.status === 'accepted' && <button onClick={() => handleStatusChange(selectedQuote.id, 'in_progress')} className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">{t.status_in_progress}</button>}
                {selectedQuote.status === 'in_progress' && <button onClick={() => handleStatusChange(selectedQuote.id, 'completed')} className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{t.status_completed}</button>}
                {['completed','accepted','in_progress'].includes(selectedQuote.status) && <button onClick={() => handleStatusChange(selectedQuote.id, 'paid')} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">{t.status_paid}</button>}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {selectedQuote.client?.phone && (
                  <button onClick={() => handleWhatsApp(selectedQuote)} className="btn-whatsapp w-full text-sm">{t.quotes_share_wa}</button>
                )}
                <button onClick={() => handleDownloadPDF(selectedQuote)} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">{t.quotes_download_pdf}</button>
                <button onClick={() => handleDuplicate(selectedQuote)} className="w-full py-2.5 bg-gray-50 text-gray-500 rounded-xl text-xs">{t.quotes_duplicate}</button>
                {selectedQuote.status === 'draft' && (
                  showDeleteConfirm ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                      <p className="text-xs text-red-700">{t.quotes_delete_confirm}</p>
                      <div className="flex gap-2">
                        <button onClick={handleDelete} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-xs font-bold">{t.quotes_delete_yes}</button>
                        <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-gray-200 text-gray-600 rounded-lg text-xs">{t.quotes_cancel}</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-2 text-red-400 text-xs">{t.quotes_delete}</button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
