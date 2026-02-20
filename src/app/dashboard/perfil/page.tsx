'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/contexts/ProfileContext'
import { TRADES } from '@/lib/types'
import { generateInitialsLogo } from '@/lib/pdf-generator'

export default function PerfilPage() {
  const router = useRouter()
  const { user } = useAuth(false)
  const { profile, reload } = useProfile()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [form, setForm] = useState({
    business_name: '', owner_name: '', trade: '', phone: '',
    address: '', city: '', logo_url: '', quote_number_offset: 0,
  })
  const [nextQuoteNumber, setNextQuoteNumber] = useState<number | null>(null)

  useEffect(() => {
    if (!profile) return
    setForm({
      business_name: profile.business_name || '',
      owner_name: profile.owner_name || '',
      trade: profile.trade || '',
      phone: profile.phone || '',
      address: profile.address || '',
      city: profile.city || '',
      logo_url: profile.logo_url || '',
      quote_number_offset: profile.quote_number_offset || 0,
    })
    if (profile.logo_url) setLogoPreview(profile.logo_url)
  }, [profile])

  // Calculate next quote number preview
  useEffect(() => {
    if (!user) return
    supabase.from('quotes').select('quote_number').eq('user_id', user.id)
      .order('quote_number', { ascending: false }).limit(1)
      .then(({ data }) => {
        const currentMax = data?.[0]?.quote_number || 0
        const next = Math.max(currentMax, form.quote_number_offset) + 1
        setNextQuoteNumber(next)
      })
  }, [user, form.quote_number_offset])

  useEffect(() => {
    if (!form.logo_url && (form.business_name || form.owner_name)) {
      const name = form.business_name || form.owner_name
      if (name.length >= 2) setLogoPreview(generateInitialsLogo(name))
    }
  }, [form.business_name, form.owner_name, form.logo_url])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!file.type.startsWith('image/')) { alert('Por favor subí una imagen (JPG, PNG)'); return }
    if (file.size > 2 * 1024 * 1024) { alert('La imagen no puede superar 2MB'); return }
    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const filePath = `logos/${user.id}.${ext}`
    const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file, { upsert: true })
    if (uploadError) { setUploadingLogo(false); alert('Error al subir. Revisá que el bucket "logos" esté creado en Supabase Storage.'); return }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(filePath)
    setForm({ ...form, logo_url: urlData.publicUrl }); setLogoPreview(urlData.publicUrl); setUploadingLogo(false)
  }

  const removeLogo = () => {
    setForm({ ...form, logo_url: '' })
    const name = form.business_name || form.owner_name
    if (name.length >= 2) setLogoPreview(generateInitialsLogo(name)); else setLogoPreview(null)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({ ...form, updated_at: new Date().toISOString() }).eq('id', user.id)

    // Sample items for first setup
    const { data: existingItems } = await supabase.from('saved_items').select('id').eq('user_id', user.id).limit(1)
    if (!existingItems || existingItems.length === 0) {
      const sampleItems = getSampleItems(form.trade, user.id)
      if (sampleItems.length > 0) await supabase.from('saved_items').insert(sampleItems)
    }
    await reload()
    setSaving(false)
    router.push('/dashboard')
  }

  if (!profile) return <div className="flex items-center justify-center py-20"><p className="text-slate-400 text-sm">Cargando...</p></div>

  const isComplete = form.business_name && form.owner_name && form.trade
  const isFirstSetup = !profile.business_name

  return (
    <div className="p-5 space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
          {isFirstSetup ? '¡Bienvenido! Configurá tu negocio' : 'Perfil del negocio'}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">{isFirstSetup ? 'Completá estos datos para empezar (30 segundos)' : 'Estos datos aparecen en tus presupuestos y PDFs'}</p>
      </div>

      {/* Logo */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="font-bold text-sm text-slate-700" style={{ fontFamily: 'var(--font-heading)' }}>🎨 Logo de tu negocio</h3>
        <p className="text-[11px] text-slate-500">Subí tu logo o se genera uno automático con tus iniciales</p>
        <div className="flex items-center gap-4">
          <div className="relative">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-white"
                onError={() => { const n = form.business_name || form.owner_name || 'PP'; setLogoPreview(generateInitialsLogo(n)) }} />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">?</div>
            )}
            {form.logo_url && <button onClick={removeLogo} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow-md hover:bg-red-600">✕</button>}
          </div>
          <div className="flex-1 space-y-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={uploadingLogo} className="btn-secondary w-full text-xs !py-2.5">{uploadingLogo ? '⏳ Subiendo...' : form.logo_url ? '📷 Cambiar logo' : '📷 Subir logo'}</button>
            <p className="text-[10px] text-slate-400 text-center">{form.logo_url ? 'Logo personalizado ✓' : 'Logo automático con iniciales'}</p>
          </div>
        </div>
      </div>

      {/* Business info */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="font-bold text-sm text-slate-700" style={{ fontFamily: 'var(--font-heading)' }}>📋 Datos del negocio</h3>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Tu nombre *</label>
          <input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} placeholder="Juan Pérez" className="input-field" /></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Nombre del negocio *</label>
          <input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="Taller Don Carlos" className="input-field" /></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Rubro / Oficio *</label>
          <select value={form.trade} onChange={(e) => setForm({ ...form, trade: e.target.value })} className="input-field appearance-none">
            <option value="">Seleccioná tu oficio</option>{TRADES.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>WhatsApp</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="11 2345-6789" className="input-field" /></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Dirección</label>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Av. San Martín 1234" className="input-field" /></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Ciudad</label>
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Buenos Aires" className="input-field" /></div>
      </div>

      {/* ======== NUMERACIÓN DE PRESUPUESTOS ======== */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="font-bold text-sm text-slate-700" style={{ fontFamily: 'var(--font-heading)' }}>
          🔢 Numeración de presupuestos
        </h3>
        <p className="text-[11px] text-slate-500">
          Si ya tenías presupuestos antes de usar la app, podés elegir desde qué número empezar.
          Así tus clientes no ven "Presupuesto #1" y la numeración sigue tu historial real.
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            Empezar desde el número
          </label>
          <input
            type="number"
            value={form.quote_number_offset}
            onChange={(e) => setForm({ ...form, quote_number_offset: Math.max(0, Number(e.target.value)) })}
            placeholder="Ej: 150"
            min="0"
            className="input-field"
          />
        </div>

        {/* Preview */}
        <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-3 border border-amber-100">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
            #{nextQuoteNumber || '?'}
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-800" style={{ fontFamily: 'var(--font-heading)' }}>
              Tu próximo presupuesto será el #{nextQuoteNumber || '—'}
            </p>
            <p className="text-[10px] text-amber-600">
              {form.quote_number_offset > 0
                ? `Empezando desde ${form.quote_number_offset}`
                : 'Numeración desde cero (por defecto)'
              }
            </p>
          </div>
        </div>

        {form.quote_number_offset > 0 && (
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            💡 Ejemplo: si ponés 150, tu primer presupuesto será el #151
          </p>
        )}
      </div>

      <button onClick={handleSave} disabled={!isComplete || saving} className="btn-primary w-full">
        {saving ? 'Guardando...' : isFirstSetup ? 'Empezar a presupuestar →' : 'Guardar cambios'}
      </button>
    </div>
  )
}

function getSampleItems(trade: string, userId: string) {
  const items: Record<string, Array<{ name: string; category: string; default_price: number; unit: string }>> = {
    'Mecánico': [
      { name: 'Cambio de aceite', category: 'mano_de_obra', default_price: 8000, unit: 'servicio' },
      { name: 'Aceite 10W40 4L', category: 'material', default_price: 12000, unit: 'unidad' },
      { name: 'Filtro de aceite', category: 'material', default_price: 5000, unit: 'unidad' },
      { name: 'Filtro de aire', category: 'material', default_price: 4500, unit: 'unidad' },
      { name: 'Diagnóstico electrónico', category: 'mano_de_obra', default_price: 6000, unit: 'servicio' },
      { name: 'Alineación y balanceo', category: 'mano_de_obra', default_price: 15000, unit: 'servicio' },
      { name: 'Pastillas de freno (juego)', category: 'material', default_price: 18000, unit: 'juego' },
      { name: 'Cambio de pastillas', category: 'mano_de_obra', default_price: 10000, unit: 'servicio' },
    ],
    'Plomero': [
      { name: 'Destape de cañería', category: 'mano_de_obra', default_price: 12000, unit: 'servicio' },
      { name: 'Caño PPR 1/2"', category: 'material', default_price: 800, unit: 'metro' },
      { name: 'Llave de paso', category: 'material', default_price: 3500, unit: 'unidad' },
      { name: 'Instalación canilla', category: 'mano_de_obra', default_price: 8000, unit: 'servicio' },
      { name: 'Mano de obra (hora)', category: 'mano_de_obra', default_price: 5000, unit: 'hora' },
    ],
    'Electricista': [
      { name: 'Cable 2.5mm', category: 'material', default_price: 600, unit: 'metro' },
      { name: 'Térmica 20A', category: 'material', default_price: 8000, unit: 'unidad' },
      { name: 'Instalación punto de luz', category: 'mano_de_obra', default_price: 7000, unit: 'punto' },
      { name: 'Tablero eléctrico', category: 'material', default_price: 15000, unit: 'unidad' },
      { name: 'Mano de obra (hora)', category: 'mano_de_obra', default_price: 5000, unit: 'hora' },
    ],
  }
  return (items[trade] || []).map((item) => ({ ...item, user_id: userId }))
}
