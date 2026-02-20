'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TRADES } from '@/lib/types'

export default function PerfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    business_name: '',
    owner_name: '',
    trade: '',
    phone: '',
    address: '',
    city: '',
  })

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setForm({
          business_name: data.business_name || '',
          owner_name: data.owner_name || '',
          trade: data.trade || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    await supabase
      .from('profiles')
      .update({
        ...form,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id)

    // Crear items de ejemplo para el rubro si es la primera vez
    const { data: existingItems } = await supabase
      .from('saved_items')
      .select('id')
      .eq('user_id', session.user.id)
      .limit(1)

    if (!existingItems || existingItems.length === 0) {
      const sampleItems = getSampleItems(form.trade, session.user.id)
      if (sampleItems.length > 0) {
        await supabase.from('saved_items').insert(sampleItems)
      }
    }

    setSaving(false)
    router.push('/dashboard')
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-gray-400 text-sm">Cargando...</p></div>
  }

  const isComplete = form.business_name && form.owner_name && form.trade
  const isFirstSetup = !form.business_name

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {isFirstSetup ? '¡Bienvenido! Configurá tu negocio' : 'Perfil del negocio'}
        </h2>
        <p className="text-xs text-gray-500">
          {isFirstSetup
            ? 'Completá estos datos para empezar (30 segundos)'
            : 'Estos datos aparecen en tus presupuestos'}
        </p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tu nombre *</label>
          <input
            value={form.owner_name}
            onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
            placeholder="Juan Pérez"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del negocio *</label>
          <input
            value={form.business_name}
            onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            placeholder="Taller Don Carlos"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Rubro / Oficio *</label>
          <select
            value={form.trade}
            onChange={(e) => setForm({ ...form, trade: e.target.value })}
            className="input-field appearance-none"
          >
            <option value="">Seleccioná tu oficio</option>
            {TRADES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="11 2345-6789"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Av. San Martín 1234"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Buenos Aires"
            className="input-field"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!isComplete || saving}
        className="btn-primary w-full"
      >
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

  return (items[trade] || []).map((item) => ({
    ...item,
    user_id: userId,
  }))
}
