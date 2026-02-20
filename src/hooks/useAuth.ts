'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

export function useAuth(requireAuth = true): AuthState {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s && requireAuth) {
        router.replace('/login')
        return
      }
      setSession(s)
      setLoading(false)
    }
    init()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s && requireAuth) router.replace('/login')
    })
    return () => subscription.unsubscribe()
  }, [router, requireAuth])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return { session, user: session?.user ?? null, loading, signOut }
}
