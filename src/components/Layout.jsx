import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useConfig } from '../lib/useConfig'
import { useI18n } from '../lib/i18n/I18nContext'
import { getIdentidad, limpiarIdentidad } from '../lib/identidad'
import AjusteFuente from './AjusteFuente'
import logoLaVisual from '../assets/logo-lavisual.png'

function linkClase({ isActive }) {
  return `hover:text-gold-soft transition-colors ${isActive ? 'text-gold-soft' : 'text-paper/80'}`
}

function SelectorIdioma() {
  const { idioma, setIdioma, t } = useI18n()
  return (
    <div className="flex items-center gap-1 font-mono text-[11px]">
      <button
        onClick={() => setIdioma('es')}
        aria-label={t('idioma.es')}
        className={`px-1.5 py-0.5 rounded transition-colors ${idioma === 'es' ? 'bg-paper/20 text-paper' : 'text-paper/50 hover:text-paper/80'}`}
      >
        ES
      </button>
      <span className="text-paper/30">/</span>
      <button
        onClick={() => setIdioma('pt')}
        aria-label={t('idioma.pt')}
        className={`px-1.5 py-0.5 rounded transition-colors ${idioma === 'pt' ? 'bg-paper/20 text-paper' : 'text-paper/50 hover:text-paper/80'}`}
      >
        PT
      </button>
    </div>
  )
}

export default function Layout({ children }) {
  const { config } = useConfig()
  const { session, perfil, cerrarSesion, esAdmin, puedeEditar } = useAuth()
  const { t } = useI18n()
  const puedeGestionarPublicadores = puedeEditar('secretario')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const identidad = getIdentidad()

  const NAV_ITEMS = [
    { to: '/vida-ministerio', label: t('nav.vidaMinisterio') },
    { to: '/reunion-publica', label: t('nav.reunionPublica') },
    { to: '/predicacion', label: t('nav.predicacion') },
    { to: '/territorios', label: t('nav.territorios') },
    { to: '/limpieza', label: t('nav.limpieza') },
    { to: '/anuncios', label: t('nav.anuncios') },
    { to: '/calendario', label: t('nav.calendario') },
  ]

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
            <span className="text-2xl group-hover:opacity-80 transition-opacity" title={config?.nombre || t('layout.inicio')}>🏠</span>
            {config?.nombre && (
              <span className="hidden sm:inline font-display text-sm text-paper/90 truncate max-w-[14rem]">
                {config.nombre}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-3 shrink-0">
            <SelectorIdioma />
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              aria-label={menuAbierto ? t('layout.cerrarMenu') : t('layout.abrirMenu')}
              aria-expanded={menuAbierto}
              className="text-xl leading-none w-9 h-9 flex items-center justify-center rounded-md hover:bg-paper/10 transition-colors"
            >
              {menuAbierto ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {hayInfoSecundaria && (
          <div className="hidden sm:block border-t border-paper/10">
            <div className="max-w-4xl mx-auto px-5 pb-2 pl-[2.75rem] flex flex-wrap items-center gap-x-4 gap-y-0.5 font-mono text-[11px] text-paper/50">
              {config.direccion && <span className="truncate max-w-[16rem]">📍 {config.direccion}</span>}
              {config.telefono_contacto && <span>📞 {config.telefono_contacto}</span>}
              {config.dia_reunion_publica && (
                <span>🎙️ {t('layout.reunionPublicaCorta')}: {config.dia_reunion_publica}{config.hora_reunion_publica && ` · ${config.hora_reunion_publica}`}</span>
              )}
              {config.dia_vida_ministerio && (
                <span>📖 {t('layout.vidaMinisterioCorta')}: {config.dia_vida_ministerio}{config.hora_vida_ministerio && ` · ${config.hora_vida_ministerio}`}</span>
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
                      {t('layout.misAsignaciones')}
                    </Link>
                    <Link to="/mi-cuenta" onClick={cerrarMenu} className="hover:text-gold-soft transition-colors">
                      {t('layout.miCuenta')}
                    </Link>
                    {puedeGestionarPublicadores && (
                      <Link to="/publicadores" onClick={cerrarMenu} className="hover:text-gold-soft transition-colors">
                        {t('layout.publicadores')}
                      </Link>
                    )}
                    {puedeGestionarPublicadores && (
                      <Link to="/informes" onClick={cerrarMenu} className="hover:text-gold-soft transition-colors">
                        {t('layout.informes')}
                      </Link>
                    )}
                    {esAdmin && (
                      <Link to="/configuracion" onClick={cerrarMenu} className="hover:text-gold-soft transition-colors">
                        {t('layout.datosCongregacion')}
                      </Link>
                    )}
                    {esAdmin && (
                      <Link to="/admin" onClick={cerrarMenu} className="hover:text-gold-soft transition-colors">
                        {t('layout.admin')}
                      </Link>
                    )}
                    <span className="text-paper/50">{perfil?.nombre}</span>
                    <button
                      onClick={() => { cerrarSesion(); cerrarMenu() }}
                      className="text-left underline decoration-gold-soft/50 hover:text-gold-soft transition-colors"
                    >
                      {t('layout.salir')}
                    </button>
                  </>
                ) : (
                  <>
                    {identidad?.nombre && (
                      <>
                        <Link to="/mis-asignaciones" onClick={cerrarMenu} className="hover:text-gold-soft transition-colors">
                          {t('layout.misAsignaciones')}
                        </Link>
                        <span className="text-paper/50">{identidad.nombre}</span>
                        <button
                          onClick={() => { cambiarIdentidad(); cerrarMenu() }}
                          className="text-left underline decoration-gold-soft/50 hover:text-gold-soft transition-colors"
                        >
                          {t('layout.noSoyYoCambiar')}
                        </button>
                      </>
                    )}
                    <Link to="/login" onClick={cerrarMenu} className="underline decoration-gold-soft/50 hover:text-gold-soft transition-colors">
                      {t('layout.iniciarSesion')}
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
              {t('layout.reunionPublicaCorta')}: {config.dia_reunion_publica} · {config.hora_reunion_publica}
            </span>
          )}
          {config?.dia_vida_ministerio && (
            <span>
              {t('layout.vidaMinisterioCorta')}: {config.dia_vida_ministerio} · {config.hora_vida_ministerio}
            </span>
          )}
        </div>

        <div className="border-t border-ink/10">
          <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-center gap-3 text-center">
            <a
              href="https://lavisualmk.alastecno.com"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 opacity-80 hover:opacity-100 transition-opacity"
              aria-label="La Visual Mk"
            >
              <img src={logoLaVisual} alt="La Visual Mk" className="h-9 w-auto" />
            </a>
            <span className="text-xs text-ink-soft font-mono max-w-xs flex flex-col">
              <span>{t('footer.disenadoPor')}</span>
              <span>{t('footer.clickLogo')}</span>
            </span>
          </div>
        </div>
      </footer>

      <AjusteFuente />
    </div>
  )
}
