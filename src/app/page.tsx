'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      router.replace(session ? '/dashboard' : '/login')
    })
  }, [router])

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 mb-4">
          <span className="text-xl">🔧</span>
        </div>
        <p className="text-slate-400 text-sm">Cargando...</p>
      </div>
    </div>
  )
}
