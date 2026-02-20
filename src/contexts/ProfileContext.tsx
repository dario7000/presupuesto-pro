'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

interface ProfileContextType {
  profile: Profile | null
  loading: boolean
  reload: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  loading: true,
  reload: async () => {},
})

export function ProfileProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from('profiles').select('*').eq('id', userId).single()
    if (data) setProfile(data as Profile)
    setLoading(false)
  }, [userId])

  useEffect(() => { reload() }, [reload])

  return (
    <ProfileContext.Provider value={{ profile, loading, reload }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)
