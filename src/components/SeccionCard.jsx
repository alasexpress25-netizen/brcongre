import { Link } from 'react-router-dom'

export default function SeccionCard({ to, titulo, descripcion, icono }) {
  return (
    <Link
      to={to}
      className="group relative flex flex-col justify-between rounded-lg border border-ink/10 bg-white p-5 min-h-[132px] transition-all hover:border-petrol hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_rgba(16,71,77,0.15)]"
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icono}</span>
        <span className="font-mono text-xs text-ink-soft/50 group-hover:text-gold transition-colors">→</span>
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold leading-tight text-ink">{titulo}</h3>
        {descripcion && <p className="text-sm text-ink-soft mt-1">{descripcion}</p>}
      </div>
    </Link>
  )
}
