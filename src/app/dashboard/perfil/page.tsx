'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/contexts/ProfileContext'
import { TRADES } from '@/lib/types'
import { CURRENCIES, CURRENCY_GROUPS, getCurrency } from '@/lib/currencies'
import { LANGUAGES, type Lang } from '@/lib/i18n'

export default function PerfilPage() {
  const router = useRouter()
  const { profile, reload, t, lang: currentLang } = useProfile()
  const [form, setForm] = useState({
    owner_name: '', business_name: '', trade: '', phone: '', address: '', city: '',
    quote_number_offset: 0, currency: 'ARS', language: 'es' as string,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (profile) setForm({
      owner_name: profile.owner_name || '', business_name: profile.business_name || '',
      trade: profile.trade || '', phone: profile.phone || '', address: profile.address || '',
      city: profile.city || '', quote_number_offset: profile.quote_number_offset || 0,
      currency: profile.currency || 'ARS', language: profile.language || 'es',
    })
  }, [profile])

  const handleSave = async () => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.from('profiles').update({
      ...form, updated_at: new Date().toISOString(),
    }).eq('id', session.user.id)
    await reload()
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const path = `${session.user.id}/${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
    if (error) { alert(t.profile_error_upload); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
    await supabase.from('profiles').update({ logo_url: publicUrl }).eq('id', session.user.id)
    await reload()
    setUploading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = (form.business_name || form.owner_name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const nextQuote = Math.max(form.quote_number_offset, profile?.next_quote_number || 1)
  const selectedCurrency = getCurrency(form.currency)

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{t.profile_title}</h2>
        <p className="text-xs text-gray-400">{t.profile_subtitle}</p>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
        <h3 className="font-semibold text-sm text-gray-700">🎨 {t.profile_logo}</h3>
        <p className="text-xs text-gray-400">{t.profile_logo_sub}</p>
        <div className="flex items-center gap-4">
          {profile?.logo_url ? (
            <img src={profile.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover border" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg">{initials}</div>
          )}
          <div className="flex-1">
            <label className="block">
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <span className="inline-block px-4 py-2 bg-gray-100 rounded-xl text-sm text-gray-600 cursor-pointer hover:bg-gray-200">
                {uploading ? t.profile_logo_uploading : (profile?.logo_url ? t.profile_logo_change : t.profile_logo_change)}</span>
            </label>
            <p className="text-[10px] text-gray-400 mt-1">{t.profile_logo_auto}</p>
          </div>
        </div>
      </div>

      {/* Business data */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
        <h3 className="font-semibold text-sm text-gray-700">📋 {t.profile_biz_data}</h3>
        <div className="space-y-2">
          <div><label className="text-xs text-gray-500">{t.profile_name} *</label>
            <input value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} className="input-field" /></div>
          <div><label className="text-xs text-gray-500">{t.profile_biz_name} *</label>
            <input value={form.business_name} onChange={e => setForm({...form, business_name: e.target.value})} className="input-field" /></div>
          <div><label className="text-xs text-gray-500">{t.profile_trade} *</label>
            <select value={form.trade} onChange={e => setForm({...form, trade: e.target.value})} className="input-field">
              <option value="">-</option>
              {TRADES.map(tr => <option key={tr} value={tr}>{tr}</option>)}
            </select></div>
          <div><label className="text-xs text-gray-500">{t.profile_phone}</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" /></div>
          <div><label className="text-xs text-gray-500">{t.profile_address}</label>
            <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input-field" /></div>
          <div><label className="text-xs text-gray-500">{t.profile_city}</label>
            <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="input-field" /></div>
        </div>
      </div>

      {/* Currency */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
        <h3 className="font-semibold text-sm text-gray-700">💲 {t.profile_currency}</h3>
        <p className="text-xs text-gray-400">{t.profile_currency_sub}</p>
        <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="input-field">
          {CURRENCY_GROUPS.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.currencies.map(code => {
                const cur = getCurrency(code)
                return <option key={code} value={code}>{cur.symbol} {code} — {cur.name}</option>
              })}
            </optgroup>
          ))}
        </select>
        <div className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
          <p className="text-xs text-amber-700">Preview: <span className="font-bold">{selectedCurrency.symbol} 15.000</span> ({selectedCurrency.code})</p>
        </div>
      </div>

      {/* Language */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
        <h3 className="font-semibold text-sm text-gray-700">🌐 {t.profile_language}</h3>
        <p className="text-xs text-gray-400">{t.profile_language_sub}</p>
        <div className="grid grid-cols-3 gap-2">
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={() => setForm({...form, language: l.code})}
              className={`p-3 rounded-xl text-center border-2 transition-all ${form.language === l.code ? 'border-amber-500 bg-amber-50' : 'border-gray-100 bg-white'}`}>
              <span className="text-lg block">{l.flag}</span>
              <span className="text-xs font-medium">{l.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quote numbering */}
      <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
        <h3 className="font-semibold text-sm text-gray-700">🔢 {t.profile_numbering}</h3>
        <p className="text-xs text-gray-400">{t.profile_numbering_sub}</p>
        <div><label className="text-xs text-gray-500">{t.profile_start_from}</label>
          <input type="number" value={form.quote_number_offset} onChange={e => setForm({...form, quote_number_offset: Number(e.target.value)})} min="0" className="input-field" /></div>
        <div className="bg-amber-50 rounded-lg px-3 py-2 flex items-center gap-3 border border-amber-100">
          <span className="bg-amber-500 text-white text-xs font-bold rounded-lg px-2.5 py-1.5">#{nextQuote}</span>
          <div>
            <p className="text-xs text-amber-700 font-medium">{t.profile_next_will_be} #{nextQuote}</p>
            <p className="text-[10px] text-amber-500">{form.quote_number_offset > 0 ? t.profile_numbering_custom : t.profile_numbering_default}</p>
          </div>
        </div>
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving || !form.owner_name || !form.business_name}
        className="btn-primary w-full">
        {saving ? t.profile_saving : saved ? t.profile_saved : t.profile_save}
      </button>

      {/* Plan */}
      <div className="bg-white rounded-xl p-4 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{t.profile_plan}</p>
            <p className="font-bold text-sm">{profile?.plan === 'pro' ? t.profile_plan_pro : t.profile_plan_free}</p>
          </div>
          {profile?.plan !== 'pro' && <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-bold">{t.profile_upgrade}</button>}
        </div>
      </div>

      <button onClick={handleLogout} className="w-full py-3 text-red-500 text-sm font-medium">{t.profile_logout}</button>
    </div>
  )
}
