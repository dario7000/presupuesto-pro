'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/contexts/ProfileContext'
import type { SavedItem } from '@/lib/types'

export default function ItemsPage() {
  const { formatMoney, t } = useProfile()
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form for new/edit item
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formCategory, setFormCategory] = useState<'material' | 'mano_de_obra'>('material')
  const [formUnit, setFormUnit] = useState('unidad')

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data } = await supabase
      .from('saved_items')
      .select('*')
      .eq('user_id', session.user.id)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (data) setItems(data as SavedItem[])
    setLoading(false)
  }

  const resetForm = () => {
    setFormName('')
    setFormPrice('')
    setFormCategory('material')
    setFormUnit('unidad')
    setAdding(false)
    setEditingId(null)
  }

  const handleSave = async () => {
    if (!formName || !formPrice) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    if (editingId) {
      await supabase
        .from('saved_items')
        .update({
          name: formName,
          default_price: Number(formPrice),
          category: formCategory,
          unit: formUnit,
        })
        .eq('id', editingId)
    } else {
      await supabase
        .from('saved_items')
        .insert({
          user_id: session.user.id,
          name: formName,
          default_price: Number(formPrice),
          category: formCategory,
          unit: formUnit,
        })
    }

    resetForm()
    loadItems()
  }

  const startEdit = (item: SavedItem) => {
    setEditingId(item.id)
    setFormName(item.name)
    setFormPrice(String(item.default_price))
    setFormCategory(item.category as 'material' | 'mano_de_obra')
    setFormUnit(item.unit)
    setAdding(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este item?')) return
    await supabase.from('saved_items').delete().eq('id', id)
    setItems(items.filter(i => i.id !== id))
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-gray-400 text-sm">Cargando...</p></div>
  }

  const materials = items.filter(i => i.category === 'material')
  const labor = items.filter(i => i.category === 'mano_de_obra')

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Items guardados</h2>
          <p className="text-xs text-gray-500">Aparecen al crear un presupuesto</p>
        </div>
        <button
          onClick={() => { if (adding) resetForm(); else setAdding(true) }}
          className="px-4 py-2 bg-amber-500 text-gray-900 font-bold rounded-lg text-xs"
        >
          {adding ? 'Cancelar' : '+ Nuevo'}
        </button>
      </div>

      {/* Add/Edit form */}
      {adding && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 space-y-3">
          <h3 className="font-semibold text-sm text-amber-800">
            {editingId ? 'Editar item' : 'Nuevo item'}
          </h3>
          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Nombre (ej: Filtro de aceite)"
            className="w-full px-3 py-2.5 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:border-amber-500"
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={formPrice}
              onChange={(e) => setFormPrice(e.target.value)}
              placeholder="Precio"
              className="flex-1 px-3 py-2.5 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:border-amber-500"
            />
            <select
              value={formUnit}
              onChange={(e) => setFormUnit(e.target.value)}
              className="px-3 py-2.5 bg-white border border-amber-200 rounded-lg text-sm"
            >
              <option value="unidad">Unidad</option>
              <option value="metro">Metro</option>
              <option value="hora">Hora</option>
              <option value="servicio">Servicio</option>
              <option value="juego">Juego</option>
              <option value="kg">Kg</option>
              <option value="litro">Litro</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFormCategory('material')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border-2 ${
                formCategory === 'material'
                  ? 'border-green-400 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-400'
              }`}
            >
              🧱 Material
            </button>
            <button
              onClick={() => setFormCategory('mano_de_obra')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border-2 ${
                formCategory === 'mano_de_obra'
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-400'
              }`}
            >
              🔧 Mano de obra
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={!formName || !formPrice}
            className="w-full py-2.5 bg-amber-500 text-gray-900 font-bold rounded-lg text-sm disabled:opacity-40"
          >
            {editingId ? 'Guardar cambios' : 'Agregar item'}
          </button>
        </div>
      )}

      {/* Materials */}
      {materials.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">🧱 Materiales</h3>
          <div className="space-y-1.5">
            {materials.map(it => (
              <ItemRow key={it.id} item={it} onEdit={startEdit} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Labor */}
      {labor.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">🔧 Mano de obra</h3>
          <div className="space-y-1.5">
            {labor.map(it => (
              <ItemRow key={it.id} item={it} onEdit={startEdit} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && !adding && (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">🔧</div>
          <p className="text-gray-400 text-sm">No tenés items guardados</p>
          <p className="text-gray-300 text-xs mt-1">Agregá los materiales y servicios que más usás</p>
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, onEdit, onDelete }: {
  item: SavedItem
  onEdit: (item: SavedItem) => void
  onDelete: (id: string) => void
}) {
  const { formatMoney } = useProfile()
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-100 flex justify-between items-center">
      <div className="flex-1">
        <span className={`text-[10px] px-1.5 py-0.5 rounded mr-1.5 ${
          item.category === 'mano_de_obra' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
        }`}>
          {item.category === 'mano_de_obra' ? 'MO' : 'MAT'}
        </span>
        <span className="text-sm">{item.name}</span>
        {item.unit !== 'unidad' && (
          <span className="text-[10px] text-gray-400 ml-1">/{item.unit}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">{formatMoney(Number(item.default_price))}</span>
        <button onClick={() => onEdit(item)} className="text-gray-300 hover:text-amber-500 text-xs">✏️</button>
        <button onClick={() => onDelete(item.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
      </div>
    </div>
  )
}
