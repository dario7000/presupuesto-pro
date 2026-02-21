import { useProfile } from '@/contexts/ProfileContext'

interface QuoteCardProps {
  quote: { id: string; quote_number: number; title: string; total: number; status: string; created_at: string; client?: { name: string; phone: string } | null }
  onClick?: () => void
}

export function QuoteCard({ quote, onClick }: QuoteCardProps) {
  const { formatMoney, statusLabel } = useProfile()
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
    in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-purple-100 text-purple-700',
    paid: 'bg-emerald-100 text-emerald-800',
  }
  return (
    <button onClick={onClick} className="w-full bg-white rounded-xl p-4 border border-gray-100 text-left hover:border-amber-200 transition-all">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono">#{quote.quote_number}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[quote.status] || ''}`}>{statusLabel(quote.status)}</span>
          </div>
          <p className="font-medium text-sm text-gray-800 mt-1 truncate">{quote.client?.name || 'Sin cliente'}</p>
          {quote.title && <p className="text-xs text-gray-400 truncate">{quote.title}</p>}
        </div>
        <div className="font-bold text-sm text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>{formatMoney(Number(quote.total))}</div>
      </div>
    </button>
  )
}
