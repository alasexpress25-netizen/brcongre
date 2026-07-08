import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useConfig } from '../lib/useConfig'
import AjusteFuente from './AjusteFuente'

const NAV_ITEMS = [
  { to: '/vida-ministerio', label: 'Vida y Ministerio' },
  { to: '/reunion-publica', label: 'Reunión Pública' },
  { to: '/predicacion', label: 'Predicación' },
  { to: '/limpieza', label: 'Limpieza' },
  { to: '/anuncios', label: 'Anuncios' },
  { to: '/calendario', label: 'Calendario' },
]

function linkClase({ isActive }) {
  return `hover:text-gold-soft transition-colors ${isActive ? 'text-gold-soft' : 'text-paper/80'}`
}

export default function Layout({ children }) {
  const { config } = useConfig()
  const { session, perfil, cerrarSesion, esAdmin, puedeEditar } = useAuth()
  const puedeGestionarPublicadores = puedeEditar('secretario')
  const [menuAbierto, setMenuAbierto] = useState(false)

  function cerrarMenu() {
    setMenuAbierto(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink/10 bg-petrol text-paper sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex items-center justify-between gap-4">
          <Link to="/" onClick={cerrarMenu} className="flex items-baseline gap-2 group shrink-0">
            <span className="text-2xl group-hover:opacity-80 transition-opacity" title={config?.nombre || 'Inicio'}>🏠</span>
            {config?.nombre && (
              <span className="hidden sm:inline font-display text-sm text-paper/90 truncate max-w-[14rem]">
                {config.nombre}
              </span>
            )}
          </Link>

          <button
            onClick={() => setMenuAbierto((v) => !v)}
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            className="text-xl leading-none w-9 h-9 flex items-center justify-center rounded-md hover:bg-paper/10 transition-colors shrink-0"
          >
            {menuAbierto ? '✕' : '☰'}
          </button>
        </div>

        {menuAbierto && (
          <div className="border-t border-paper/10 bg-petrol-dark">
            <nav className="max-w-4xl mx-auto px-5 py-3 flex flex-col gap-3 font-mono text-xs">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={cerrarMenu} className={linkClase}>
                  {item.label}
                </NavLink>
              ))}
              <div className="border-t border-paper/10 pt-3 flex flex-col gap-3 text-paper/70">
                {session ? (
                  <>
                    <Link to="/mis-asignaciones" onClick={cerrarMenu} className="hover:text-gold-soft transition-colors">
                      mis asignaciones
                    </Link>
                    {puedeGestionarPublicadores && (
                      <Link to="/publicadores" onClick={cerrarMenu} className="hover:text-gold-soft transition-colors">
                        publicadores
                      </Link>
                    )}
                    {esAdmin && (
                      <Link to="/admin" onClick={cerrarMenu} className="hover:text-gold-soft transition-colors">
                        admin
                      </Link>
                    )}
                    <span className="text-paper/50">{perfil?.nombre}</span>
                    <button
                      onClick={() => { cerrarSesion(); cerrarMenu() }}
                      className="text-left underline decoration-gold-soft/50 hover:text-gold-soft transition-colors"
                    >
                      salir
                    </button>
                  </>
                ) : (
                  <Link to="/login" onClick={cerrarMenu} className="underline decoration-gold-soft/50 hover:text-gold-soft transition-colors">
                    iniciar sesión
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-5 py-8">{children}</main>

      <footer className="border-t border-ink/10 bg-paper-dim">
        <div className="max-w-4xl mx-auto px-5 py-6 text-sm text-ink-soft font-mono flex flex-col gap-1">
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

      <AjusteFuente />
    </div>
  )
}
