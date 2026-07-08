import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useConfig } from '../lib/useConfig'
import { getIdentidad, limpiarIdentidad } from '../lib/identidad'
import AjusteFuente from './AjusteFuente'

const NAV_ITEMS = [
  { to: '/vida-ministerio', label: 'Vida y Ministerio' },
  { to: '/reunion-publica', label: 'Reunión Pública' },
  { to: '/predicacion', label: 'Predicación' },
  { to: '/territorios', label: 'Territorios' },
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
  const identidad = getIdentidad()

  function cambiarIdentidad() {
    limpiarIdentidad()
    window.location.reload()
  }

  const hayInfoSecundaria =
    config?.direccion || config?.telefono_contacto || config?.dia_reunion_publica || config?.dia_vida_ministerio

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

        {hayInfoSecundaria && (
          <div className="hidden sm:block border-t border-paper/10">
            <div className="max-w-4xl mx-auto px-5 pb-2 pl-[2.75rem] flex flex-wrap items-center gap-x-4 gap-y-0.5 font-mono text-[11px] text-paper/50">
              {config.direccion && <span className="truncate max-w-[16rem]">📍 {config.direccion}</span>}
              {config.telefono_contacto && <span>📞 {config.telefono_contacto}</span>}
              {config.dia_reunion_publica && (
                <span>🎙️ Reunión pública: {config.dia_reunion_publica}{config.hora_reunion_publica && ` · ${config.hora_reunion_publica}`}</span>
              )}
              {config.dia_vida_ministerio && (
                <span>📖 Vida y Ministerio: {config.dia_vida_ministerio}{config.hora_vida_ministerio && ` · ${config.hora_vida_ministerio}`}</span>
              )}
            </div>
          </div>
        )}

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
                    <Link to="/mi-cuenta" onClick={cerrarMenu} className="hover:text-gold-soft transition-colors">
                      mi cuenta
                    </Link>
                    {puedeGestionarPublicadores && (
                      <Link to="/publicadores" onClick={cerrarMenu} className="hover:text-gold-soft transition-colors">
                        publicadores
                      </Link>
                    )}
                    {puedeGestionarPublicadores && (
                      <Link to="/informes" onClick={cerrarMenu} className="hover:text-gold-soft transition-colors">
                        informes
                      </Link>
                    )}
                    {esAdmin && (
                      <Link to="/configuracion" onClick={cerrarMenu} className="hover:text-gold-soft transition-colors">
                        datos de la congregación
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
                  <>
                    {identidad?.nombre && (
                      <>
                        <Link to="/mis-asignaciones" onClick={cerrarMenu} className="hover:text-gold-soft transition-colors">
                          mis asignaciones
                        </Link>
                        <span className="text-paper/50">{identidad.nombre}</span>
                        <button
                          onClick={() => { cambiarIdentidad(); cerrarMenu() }}
                          className="text-left underline decoration-gold-soft/50 hover:text-gold-soft transition-colors"
                        >
                          no soy yo, cambiar email
                        </button>
                      </>
                    )}
                    <Link to="/login" onClick={cerrarMenu} className="underline decoration-gold-soft/50 hover:text-gold-soft transition-colors">
                      iniciar sesión
                    </Link>
                  </>
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
