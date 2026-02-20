export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
            <div className="space-y-2 text-right">
              <div className="h-4 bg-gray-200 rounded w-20 ml-auto" />
              <div className="h-5 bg-gray-100 rounded-full w-16 ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 animate-pulse">
      {[1,2,3,4].map(i => (
        <div key={i} className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gray-200" />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
          <div className="h-6 bg-gray-200 rounded w-20" />
        </div>
      ))}
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 mb-4" style={{ boxShadow: '0 8px 32px rgba(245, 158, 11, 0.2)' }}>
          <span className="text-xl">🔧</span>
        </div>
        <p className="text-slate-400 text-sm font-medium">Cargando...</p>
      </div>
    </div>
  )
}
