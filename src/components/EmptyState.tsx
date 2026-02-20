export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-slate-600 text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>{title}</p>
      {subtitle && <p className="text-slate-400 text-xs mt-1">{subtitle}</p>}
    </div>
  )
}
