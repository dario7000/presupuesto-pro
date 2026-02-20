import { formatARS } from '@/lib/types'
import { StatusBadge } from './StatusBadge'
import type { Quote } from '@/lib/types'

export function QuoteCard({ quote, onClick }: { quote: Quote; onClick: () => void }) {
  const clientName = quote.client?.name || 'Sin cliente'

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl p-4 border border-gray-100 text-left hover:border-amber-200 transition-colors"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-semibold text-sm text-slate-900" style={{ fontFamily: 'var(--font-heading)' }}>{clientName}</div>
          <div className="text-xs text-slate-500">{quote.title || `Presupuesto #${quote.quote_number}`}</div>
          <div className="text-[10px] text-gray-400 mt-1">
            {new Date(quote.created_at).toLocaleDateString('es-AR')}
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-sm text-slate-900 mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            {formatARS(Number(quote.total))}
          </div>
          <StatusBadge status={quote.status} size="xs" />
        </div>
      </div>
    </button>
  )
}
