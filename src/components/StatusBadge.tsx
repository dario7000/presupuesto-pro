import { useProfile } from '@/contexts/ProfileContext'

const colors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
  in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-purple-100 text-purple-700',
  paid: 'bg-emerald-100 text-emerald-800',
}

export function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'xs' }) {
  const { statusLabel } = useProfile()
  const s = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
  return <span className={`${s} rounded-full font-medium ${colors[status] || ''}`}>{statusLabel(status)}</span>
}
