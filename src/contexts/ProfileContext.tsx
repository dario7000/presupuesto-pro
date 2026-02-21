'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { formatMoney as fmtMoney } from '@/lib/currencies'
import { getTranslations, getStatusLabel, type Lang, type Translations } from '@/lib/i18n'
import type { Profile } from '@/lib/types'

interface ProfileContextType {
  profile: Profile | null
  loading: boolean
  reload: () => Promise<void>
  t: Translations
  lang: Lang
  currency: string
  formatMoney: (amount: number) => string
  statusLabel: (status: string) => string
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null, loading: true,
  reload: async () => {},
  t: getTranslations('es'),
  lang: 'es',
  currency: 'ARS',
  formatMoney: (n: number) => String(n),
  statusLabel: (s: string) => s,
})

export const useProfile = () => useContext(ProfileContext)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (data) setProfile(data as Profile)
    setLoading(false)
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const lang: Lang = (profile?.language as Lang) || 'es'
  const currency = profile?.currency || 'ARS'
  const t = getTranslations(lang)

  const formatMoneyFn = useCallback((amount: number) => fmtMoney(amount, currency), [currency])
  const statusLabelFn = useCallback((status: string) => getStatusLabel(status, lang), [lang])

  return (
    <ProfileContext.Provider value={{
      profile, loading, reload: fetchProfile,
      t, lang, currency,
      formatMoney: formatMoneyFn,
      statusLabel: statusLabelFn,
    }}>
      {children}
    </ProfileContext.Provider>
  )
}
