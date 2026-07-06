import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useConfig } from '../lib/useConfig'

export default function Layout({ children }) {
  const { config } = useConfig()
  const { session, perfil, cerrarSesion, esAdmin } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink/10 bg-petrol text-paper">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-baseline gap-2 group">
            <span className="font-display text-xl md:text-2xl font-semibold tracking-tight group-hover:text-gold-soft transition-colors">
              {config?.nombre || 'Congregación'}
            </span>
          </Link>
          <div className="font-mono text-xs text-paper/70 flex items-center gap-3">
            {session ? (
              <>
                <Link to="/mis-asignaciones" className="hover:text-gold-soft transition-colors hidden sm:inline">
                  mis asignaciones
                </Link>
                {esAdmin && (
                  <Link to="/admin" className="hover:text-gold-soft transition-colors">
                    admin
                  </Link>
                )}
                <span className="hidden md:inline text-paper/50">{perfil?.nombre}</span>
                <button
                  onClick={cerrarSesion}
                  className="underline decoration-gold-soft/50 hover:text-gold-soft transition-colors"
                >
                  salir
                </button>
              </>
            ) : (
              <Link to="/login" className="underline decoration-gold-soft/50 hover:text-gold-soft transition-colors">
                iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-5 py-8">{children}</main>

      <footer className="border-t border-ink/10 bg-paper-dim">
        <div className="max-w-3xl mx-auto px-5 py-6 text-sm text-ink-soft font-mono flex flex-col gap-1">
          {config?.direccion && <span>{config.direccion}</span>}
          {config?.dia_reunion_publica && (
            <span>
              Reunión pública: {config.dia_reunion_publica} · {config.hora_reunion_publica}
            </span>
          )}
          {config?.dia_vida_ministerio && (
            <span>
              Vida y Ministerio: {config.dia_vida_ministerio} · {config.hora_vida_ministerio}
            </span>
          )}
        </div>
      </footer>
    </div>
  )
}
