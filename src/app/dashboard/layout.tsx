'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ProfileProvider, useProfile } from '@/contexts/ProfileContext'
import { useState, useEffect } from 'react'

function NavContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile, t } = useProfile()
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const tabs = [
    { href: '/dashboard', icon: '📊', label: t.nav_home },
    { href: '/dashboard/presupuestos', icon: '📋', label: t.nav_quotes },
    { href: '/dashboard/clientes', icon: '👥', label: t.nav_clients },
    { href: '/dashboard/items', icon: '🔧', label: t.nav_items },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {offline && <div className="bg-red-500 text-white text-center text-xs py-1 sticky top-0 z-50">{t.offline}</div>}
      <div className="max-w-lg mx-auto">{children}</div>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(tab => {
            const active = tab.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(tab.href)
            return (
              <Link key={tab.href} href={tab.href} className={`flex-1 flex flex-col items-center py-2.5 text-[10px] font-medium transition-colors ${active ? 'text-amber-600' : 'text-gray-400'}`}>
                <span className="text-lg mb-0.5">{tab.icon}</span>{tab.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ProfileProvider><NavContent>{children}</NavContent></ProfileProvider>
}
