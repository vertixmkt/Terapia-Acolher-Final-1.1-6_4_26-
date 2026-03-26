import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: string; positive: boolean }
  accent?: 'orange' | 'green' | 'red' | 'yellow' | 'blue'
}

const accents = {
  orange: { icon: 'text-orange-400', bg: 'bg-orange-500/10' },
  green: { icon: 'text-green-400', bg: 'bg-green-500/10' },
  red: { icon: 'text-red-400', bg: 'bg-red-500/10' },
  yellow: { icon: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  blue: { icon: 'text-blue-400', bg: 'bg-blue-500/10' },
}

export function StatCard({ label, value, icon: Icon, trend, accent = 'orange' }: StatCardProps) {
  const a = accents[accent]
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 flex items-start justify-between">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-100">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
        {trend && (
          <p className={`text-xs mt-1 ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </p>
        )}
      </div>
      <div className={`p-2.5 rounded-lg ${a.bg}`}>
        <Icon size={20} className={a.icon} />
      </div>
    </div>
  )
}
