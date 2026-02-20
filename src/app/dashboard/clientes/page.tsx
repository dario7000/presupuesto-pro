'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatARS } from '@/lib/types'
import type { Client } from '@/lib/types'

export default function ClientesPage() {
  const [clients, setClients] = useState<(Client & { quote_count: number; total_amount: number })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name')

      if (clientsData) {
        // Get quote stats for each client
        const { data: quotes } = await supabase
          .from('quotes')
          .select('client_id, total')
          .eq('user_id', session.user.id)

        const clientStats = (clientsData as Client[]).map(client => {
          const clientQuotes = (quotes || []).filter(q => q.client_id === client.id)
          return {
            ...client,
            quote_count: clientQuotes.length,
            total_amount: clientQuotes.reduce((s, q) => s + Number(q.total), 0),
          }
        })

        setClients(clientStats)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-gray-400 text-sm">Cargando...</p></div>
  }

  return (
    <div className="p-4 space-y-3">
      <div>
        <h2 className="text-lg font-bold">Clientes</h2>
        <p className="text-xs text-gray-500">Se guardan automáticamente al crear presupuestos</p>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">👥</div>
          <p className="text-gray-400 text-sm">Todavía no tenés clientes</p>
          <p className="text-gray-300 text-xs mt-1">Se crean automáticamente cuando hacés un presupuesto</p>
        </div>
      ) : (
        clients.map(c => (
          <div key={c.id} className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-sm">{c.name}</div>
                {c.phone && (
                  <a
                    href={`https://wa.me/${c.phone.replace(/\D/g, '').startsWith('54') ? c.phone.replace(/\D/g, '') : '54' + c.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener"
                    className="text-xs text-green-600 hover:underline"
                  >
                    📱 {c.phone}
                  </a>
                )}
                {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">{c.quote_count} presup.</div>
                <div className="font-bold text-sm text-amber-600">{formatARS(c.total_amount)}</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
