import { STATUS_MAP, type QuoteStatus } from '@/lib/types'

export function StatusBadge({ status, size = 'sm' }: { status: QuoteStatus; size?: 'sm' | 'xs' }) {
  const st = STATUS_MAP[status]
  const cls = size === 'xs'
    ? `px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.bg} ${st.color}`
    : `px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.color}`
  return <span className={cls}>{st.label}</span>
}
