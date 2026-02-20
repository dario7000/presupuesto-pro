'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/contexts/ProfileContext'
import { formatARS, IVA_OPTIONS } from '@/lib/types'
import { generateQuotePDF } from '@/lib/pdf-generator'
import type { Client, SavedItem } from '@/lib/types'

interface QuoteItemForm {
  tempId: string; name: string; category: 'material' | 'mano_de_obra'
  quantity: number; unit: string; unit_price: number
}

export default function NuevoPresupuestoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const { profile, reload: reloadProfile } = useProfile()

  const [clients, setClients] = useState<Client[]>([])
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [vehicleInfo, setVehicleInfo] = useState('')
  const [items, setItems] = useState<QuoteItemForm[]>([])
  const [notes, setNotes] = useState('Presupuesto valido por 7 dias.')
  const [discount, setDiscount] = useState(0)
  const [ivaPercent, setIvaPercent] = useState(0)
  const [showSaved, setShowSaved] = useState(false)
  const [showClientList, setShowClientList] = useState(false)
  const [customQuoteNumber, setCustomQuoteNumber] = useState<number | ''>('')
  const [showQuoteNumberField, setShowQuoteNumberField] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const [clientsRes, itemsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', session.user.id).order('name'),
        supabase.from('saved_items').select('*').eq('user_id', session.user.id).order('name'),
      ])
      if (clientsRes.data) setClients(clientsRes.data as Client[])
      if (itemsRes.data) setSavedItems(itemsRes.data as SavedItem[])
      if (profile?.next_quote_number) setCustomQuoteNumber(profile.next_quote_number)

      if (editId) {
        const { data: quote } = await supabase.from('quotes').select('*').eq('id', editId).single()
        const { data: quoteItems } = await supabase.from('quote_items').select('*').eq('quote_id', editId).order('sort_order')
        if (quote) {
          setTitle(quote.title || ''); setVehicleInfo(quote.vehicle_info || '')
          setNotes(quote.notes || ''); setDiscount(Number(quote.discount_percent) || 0)
          setIvaPercent(Number(quote.iva_percent) || 0)
          setCustomQuoteNumber(quote.quote_number); setSelectedClientId(quote.client_id)
          if (quote.client_id) {
            const client = (clientsRes.data as Client[])?.find(c => c.id === quote.client_id)
            if (client) { setClientName(client.name); setClientPhone(client.phone) }
          }
          if (quoteItems) {
            setItems(quoteItems.map((it: any) => ({
              tempId: `ti-${it.id}`, name: it.name, category: it.category as 'material' | 'mano_de_obra',
              quantity: Number(it.quantity), unit: it.unit, unit_price: Number(it.unit_price),
            })))
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [editId, profile?.next_quote_number])

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0)
  const discountAmount = subtotal * (discount / 100)
  const afterDiscount = subtotal - discountAmount
  const ivaAmount = afterDiscount * (ivaPercent / 100)
  const total = afterDiscount + ivaAmount

  const addSavedItem = (si: SavedItem) => {
    setItems([...items, { tempId: `ti-${Date.now()}-${Math.random()}`, name: si.name,
      category: si.category as 'material' | 'mano_de_obra', quantity: 1, unit: si.unit, unit_price: Number(si.default_price) }])
    setShowSaved(false)
  }
  const addBlankItem = (category: 'material' | 'mano_de_obra') => {
    setItems([...items, { tempId: `ti-${Date.now()}-${Math.random()}`, name: '', category, quantity: 1, unit: 'unidad', unit_price: 0 }])
  }
  const updateItem = (tempId: string, field: keyof QuoteItemForm, value: any) => {
    setItems(items.map(it => it.tempId === tempId ? { ...it, [field]: value } : it))
  }
  const removeItem = (tempId: string) => setItems(items.filter(it => it.tempId !== tempId))
  const selectClient = (client: Client) => {
    setSelectedClientId(client.id); setClientName(client.name); setClientPhone(client.phone); setShowClientList(false)
  }

  const handleSave = async (sendWhatsApp: boolean, downloadPdf = false) => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    let clientId = selectedClientId
    if (!clientId && clientName) {
      const { data: newClient } = await supabase.from('clients')
        .insert({ user_id: session.user.id, name: clientName, phone: clientPhone }).select().single()
      if (newClient) clientId = newClient.id
    }

    const status = sendWhatsApp ? 'sent' : 'draft'
    const quoteData = {
      user_id: session.user.id, client_id: clientId, title, status, subtotal,
      discount_percent: discount, discount_amount: discountAmount,
      iva_percent: ivaPercent, iva_amount: ivaAmount, total, notes,
      vehicle_info: vehicleInfo, sent_at: sendWhatsApp ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    let quote: any
    if (editId) {
      const { data } = await supabase.from('quotes').update(quoteData).eq('id', editId).select().single()
      quote = data
      if (quote) await supabase.from('quote_items').delete().eq('quote_id', editId)
    } else {
      const insertData: any = { ...quoteData }
      if (customQuoteNumber) insertData.quote_number = Number(customQuoteNumber)
      const { data } = await supabase.from('quotes').insert(insertData).select().single()
      quote = data
      if (quote) {
        const nextNum = (Number(customQuoteNumber) || quote.quote_number) + 1
        await supabase.from('profiles').update({
          quotes_this_month: (profile?.quotes_this_month || 0) + 1, next_quote_number: nextNum,
        }).eq('id', session.user.id)
      }
    }

    if (!quote) { setSaving(false); return }

    if (items.length > 0) {
      await supabase.from('quote_items').insert(items.map((it, idx) => ({
        quote_id: quote.id, name: it.name, category: it.category, quantity: it.quantity,
        unit: it.unit, unit_price: it.unit_price, total: it.quantity * it.unit_price, sort_order: idx,
      })))
    }

    if (sendWhatsApp || downloadPdf) {
      try {
        const pdf = await generateQuotePDF({
          quoteNumber: customQuoteNumber ? Number(customQuoteNumber) : quote.quote_number,
          title, vehicleInfo: vehicleInfo || undefined, clientName, clientPhone: clientPhone || undefined,
          items: items.map(it => ({ name: it.name, category: it.category, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price })),
          subtotal, discountPercent: discount, discountAmount, ivaPercent, ivaAmount, total, notes, createdAt: new Date().toISOString(),
        }, {
          businessName: profile?.business_name || '', ownerName: profile?.owner_name || '',
          phone: profile?.phone || '', address: profile?.address || '', city: profile?.city || '',
          trade: profile?.trade || '', logoUrl: profile?.logo_url || null,
        }, { watermark: profile?.plan === 'free' })

        const fileName = `Presupuesto-${customQuoteNumber || quote.quote_number}-${clientName.replace(/\s+/g, '-')}.pdf`
        if (downloadPdf) pdf.save(fileName)
        if (sendWhatsApp && clientPhone) {
          pdf.save(fileName)
          setTimeout(() => {
            const itemsList = items.map(it => `- ${it.name}: ${formatARS(it.quantity * it.unit_price)}`).join('\n')
            const msg = [`*Presupuesto #${customQuoteNumber || quote.quote_number} - ${profile?.business_name}*`, '',
              title ? `Trabajo: ${title}` : '', vehicleInfo ? `Vehiculo: ${vehicleInfo}` : '', '', itemsList, '',
              discount > 0 ? `Descuento: ${discount}%` : '', ivaPercent > 0 ? `IVA (${ivaPercent}%): ${formatARS(ivaAmount)}` : '',
              `*TOTAL: ${formatARS(total)}*`, '', notes ? `Notas: ${notes}` : '', '', '_Enviado con PresupuestoPRO_'
            ].filter(Boolean).join('\n')
            const phone = clientPhone.replace(/\D/g, '')
            window.open(`https://wa.me/${phone.startsWith('54') ? phone : '54' + phone}?text=${encodeURIComponent(msg)}`, '_blank')
          }, 1000)
        }
      } catch (e) { console.error('PDF generation error:', e) }
    }

    reloadProfile()
    router.push('/dashboard/presupuestos')
  }

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-gray-400 text-sm">Cargando...</p></div>

  const isMechanic = profile?.trade === 'Mecanico' || profile?.trade === 'Service'

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
        {editId ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      </h2>

      {/* Custom Quote Number */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-700"># Numero de presupuesto</h3>
          {!editId && <button onClick={() => setShowQuoteNumberField(!showQuoteNumberField)} className="text-xs text-amber-600 font-medium">
            {showQuoteNumberField ? 'Usar automatico' : 'Personalizar'}</button>}
        </div>
        {(showQuoteNumberField || editId) ? (
          <div className="space-y-1.5">
            <input type="number" value={customQuoteNumber} onChange={(e) => setCustomQuoteNumber(e.target.value ? Number(e.target.value) : '')}
              placeholder="Ej: 150" className="input-field" min="1" disabled={!!editId} />
            <p className="text-[10px] text-gray-400">{editId ? 'No se puede cambiar el numero de un presupuesto existente' : 'Ideal si ya venias numerando presupuestos antes de usar la app'}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Sera el #{customQuoteNumber || 'automatico'}
            <span className="text-[10px] text-gray-400 block mt-0.5">Toca "Personalizar" para elegir otro numero</span>
          </p>
        )}
      </div>

      {/* Client */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-700">Cliente</h3>
          {clients.length > 0 && <button onClick={() => setShowClientList(!showClientList)} className="text-xs text-amber-600 font-medium">
            {showClientList ? 'Cerrar' : 'Clientes guardados'}</button>}
        </div>
        {showClientList && (
          <div className="bg-gray-50 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto border border-gray-200">
            {clients.map(c => (
              <button key={c.id} onClick={() => selectClient(c)} className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-amber-50 flex justify-between">
                <span className="font-medium">{c.name}</span>
                {c.phone && <span className="text-gray-400 ml-2">{c.phone}</span>}
              </button>
            ))}
          </div>
        )}
        <input value={clientName} onChange={(e) => { setClientName(e.target.value); setSelectedClientId(null) }} placeholder="Nombre del cliente" className="input-field" />
        <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="WhatsApp (ej: 11 2345-6789)" className="input-field" />
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
        <h3 className="font-semibold text-sm text-gray-700">Detalle</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isMechanic ? 'Ej: Service completo 30.000km' : 'Ej: Instalacion electrica cocina'} className="input-field" />
        {isMechanic && <input value={vehicleInfo} onChange={(e) => setVehicleInfo(e.target.value)} placeholder="Vehiculo (ej: Ford Mondeo 2008 - ABC123)" className="input-field" />}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-700">Items</h3>
          {savedItems.length > 0 && <button onClick={() => setShowSaved(!showSaved)} className="text-xs text-amber-600 font-medium">
            {showSaved ? 'Cerrar' : 'Items guardados'}</button>}
        </div>
        {showSaved && (
          <div className="bg-amber-50 rounded-lg p-3 space-y-1.5 border border-amber-100 max-h-48 overflow-y-auto">
            <p className="text-xs text-amber-700 font-medium mb-1">Toca para agregar:</p>
            {savedItems.map(si => (
              <button key={si.id} onClick={() => addSavedItem(si)}
                className="w-full text-left px-3 py-2 bg-white rounded-lg text-xs flex justify-between items-center hover:bg-amber-50 border border-amber-100">
                <div><span className={`px-1.5 py-0.5 rounded mr-1.5 text-[10px] ${si.category === 'mano_de_obra' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>{si.category === 'mano_de_obra' ? 'MO' : 'MAT'}</span>{si.name}</div>
                <span className="font-semibold text-amber-700">{formatARS(Number(si.default_price))}</span>
              </button>
            ))}
          </div>
        )}
        {items.map((it) => (
          <div key={it.tempId} className="bg-gray-50 rounded-lg p-3 space-y-2 relative">
            <button onClick={() => removeItem(it.tempId)} className="absolute top-2 right-2 text-gray-300 hover:text-red-400 text-sm">X</button>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-block ${it.category === 'mano_de_obra' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {it.category === 'mano_de_obra' ? 'Mano de obra' : 'Material'}</span>
            <input value={it.name} onChange={(e) => updateItem(it.tempId, 'name', e.target.value)} placeholder="Descripcion del item"
              className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-amber-400" />
            <div className="flex gap-2">
              <div className="flex-1"><label className="text-[10px] text-gray-400">Cantidad</label>
                <input type="number" value={it.quantity} onChange={(e) => updateItem(it.tempId, 'quantity', Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-amber-400" min="0.5" step="0.5" /></div>
              <div className="flex-1"><label className="text-[10px] text-gray-400">Precio unit.</label>
                <input type="number" value={it.unit_price} onChange={(e) => updateItem(it.tempId, 'unit_price', Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:border-amber-400" min="0" /></div>
              <div className="w-24"><label className="text-[10px] text-gray-400">Subtotal</label>
                <div className="px-2 py-1.5 text-sm font-semibold text-gray-700">{formatARS(it.quantity * it.unit_price)}</div></div>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <button onClick={() => addBlankItem('material')} className="flex-1 py-2.5 border-2 border-dashed border-green-200 rounded-lg text-xs text-green-600 font-medium hover:bg-green-50">+ Material</button>
          <button onClick={() => addBlankItem('mano_de_obra')} className="flex-1 py-2.5 border-2 border-dashed border-blue-200 rounded-lg text-xs text-blue-600 font-medium hover:bg-blue-50">+ Mano de obra</button>
        </div>
      </div>

      {/* Totals */}
      {items.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4 text-white space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span>{formatARS(subtotal)}</span></div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Descuento</span>
            <div className="flex items-center gap-1">
              <input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-14 px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-center text-xs text-white" min="0" max="100" />
              <span className="text-xs text-gray-500">%</span>
              {discount > 0 && <span className="text-red-400 text-xs ml-1">-{formatARS(discountAmount)}</span>}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">IVA</span>
            <div className="flex items-center gap-1">
              <select value={ivaPercent} onChange={(e) => setIvaPercent(Number(e.target.value))}
                className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded text-xs text-white">
                {IVA_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              {ivaPercent > 0 && <span className="text-green-400 text-xs ml-1">+{formatARS(ivaAmount)}</span>}
            </div>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between items-center">
            <span className="font-bold">TOTAL</span>
            <span className="font-bold text-amber-400 text-xl">{formatARS(total)}</span>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">Notas / Condiciones</h3>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Ej: Presupuesto valido por 7 dias. Garantia 30 dias sobre mano de obra."
          rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-500 resize-none" />
      </div>

      {/* Actions */}
      <div className="space-y-2 pb-6">
        <button onClick={() => handleSave(true)} disabled={!clientName || items.length === 0 || saving}
          className="btn-primary w-full flex items-center justify-center gap-2">
          {saving ? 'Generando PDF...' : 'Guardar, PDF + WhatsApp'}</button>
        <button onClick={() => handleSave(false, true)} disabled={!clientName || items.length === 0 || saving}
          className="btn-whatsapp w-full flex items-center justify-center gap-2 !bg-gradient-to-r !from-slate-700 !to-slate-800 !shadow-none">
          Guardar y descargar PDF</button>
        <button onClick={() => handleSave(false)} disabled={items.length === 0 || saving}
          className="w-full py-3 bg-white border border-gray-200 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 disabled:opacity-40">
          {editId ? 'Guardar cambios' : 'Guardar como borrador'}</button>
      </div>
    </div>
  )
}
