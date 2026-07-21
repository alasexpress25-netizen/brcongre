import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useConfig } from '../lib/useConfig'
import { useI18n } from '../lib/i18n/I18nContext'
import { getIdentidad, limpiarIdentidad } from '../lib/identidad'
import AjusteFuente from './AjusteFuente'
import logoLaVisual from '../assets/logo-lavisual.png'
import {
  IconVidaMinisterio,
  IconReunionPublica,
  IconPredicacion,
  IconAnuncios,
  IconCalendario,
  IconLimpieza,
  IconMisAsignaciones,
  IconInforme,
  IconPrecursorAuxiliar,
  IconEntrar,
  IconCambiarIdentidad,
  IconLogo,
  DecoracionLateral,
} from './icons/NavIcons'

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

  const nombreMostrado = perfil?.nombre || identidad?.nombre || ''

  const NAV_ITEMS = [
    { to: '/vida-ministerio', label: t('nav.vidaMinisterio'), Icon: IconVidaMinisterio },
    { to: '/reunion-publica', label: t('nav.reunionPublica'), Icon: IconReunionPublica },
    { to: '/predicacion', label: t('nav.predicacion'), Icon: IconPredicacion },
    { to: '/anuncios', label: t('nav.anuncios'), Icon: IconAnuncios },
    { to: '/calendario', label: t('nav.calendario'), Icon: IconCalendario },
    { to: '/limpieza', label: t('nav.limpieza'), Icon: IconLimpieza },
    { to: '/mis-asignaciones', label: t('nav.misAsignaciones'), Icon: IconMisAsignaciones },
    { to: '/informe-predicacion', label: t('nav.informe'), Icon: IconInforme },
    { to: '/precursor-auxiliar', label: t('nav.solicitudPrecursorAuxiliar'), Icon: IconPrecursorAuxiliar },
  ]

  const ENLACES_GESTION = [
    puedeGestionarPublicadores && { to: '/publicadores', label: t('layout.publicadores') },
    puedeGestionarPublicadores && { to: '/informes', label: t('layout.informes') },
    esAdmin && { to: '/configuracion', label: t('layout.datosCongregacion') },
    esAdmin && { to: '/admin', label: t('layout.admin') },
    { to: '/mi-cuenta', label: t('layout.miCuenta') },
  ].filter(Boolean)

  function cambiarIdentidad() {
    limpiarIdentidad()
    window.location.reload()
  }

  function cerrarMenu() {
    setMenuAbierto(false)
  }

  const hayInfoSecundaria =
    config?.direccion || config?.telefono_contacto || config?.dia_reunion_publica || config?.dia_vida_ministerio

  return (
    <div className="min-h-screen flex flex-col">
      {/* ===== Barra superior ===== */}
      <header className="fixed top-0 inset-x-0 z-40 h-16 bg-petrol text-paper border-b border-paper/10">
        <div className="h-full grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-5">
          {/* Izquierda: botón menú (mobile) + "no soy yo" */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              aria-label={menuAbierto ? t('layout.cerrarMenu') : t('layout.abrirMenu')}
              aria-expanded={menuAbierto}
              className="md:hidden shrink-0 w-9 h-9 flex flex-col items-center justify-center gap-[3px] rounded-md hover:bg-paper/10 transition-colors"
            >
              <span className={`block h-[1.5px] w-5 bg-paper transition-transform ${menuAbierto ? 'translate-y-[5.5px] rotate-45' : ''}`} />
              <span className={`block h-[1.5px] w-5 bg-paper transition-opacity ${menuAbierto ? 'opacity-0' : ''}`} />
              <span className={`block h-[1.5px] w-5 bg-paper transition-transform ${menuAbierto ? '-translate-y-[5.5px] -rotate-45' : ''}`} />
            </button>

            {!session && identidad?.nombre && (
              <button
                onClick={cambiarIdentidad}
                className="flex items-center gap-1.5 text-paper/75 hover:text-gold-soft transition-colors text-xs sm:text-sm font-mono truncate"
              >
                <IconCambiarIdentidad className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline truncate">{t('layout.noSoyYo')}</span>
              </button>
            )}
          </div>

          {/* Centro: "Semana" grande */}
          <Link
            to="/"
            className="font-display text-xl sm:text-2xl font-semibold tracking-wide text-paper hover:text-gold-soft transition-colors whitespace-nowrap"
          >
            {t('index.semana')}
          </Link>

          {/* Derecha: idioma + entrar/salir */}
          <div className="flex items-center justify-end gap-2 sm:gap-3 min-w-0">
            <SelectorIdioma />
            {session ? (
              <button
                onClick={cerrarSesion}
                className="flex items-center gap-1.5 text-paper/85 hover:text-gold-soft transition-colors text-xs sm:text-sm font-mono shrink-0"
              >
                <span className="hidden sm:inline">{t('layout.salir')}</span>
                <IconEntrar className="w-4 h-4 shrink-0 rotate-180" />
              </button>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-paper/85 hover:text-gold-soft transition-colors text-xs sm:text-sm font-mono shrink-0"
              >
                <span className="hidden sm:inline">{t('layout.entrar')}</span>
                <IconEntrar className="w-4 h-4 shrink-0" />
              </Link>
            )}
          </div>
        </div>

        {hayInfoSecundaria && (
          <div className="hidden lg:block border-t border-paper/10">
            <div className="px-5 py-1.5 pl-[4.5rem] md:pl-[17.5rem] flex flex-wrap items-center gap-x-4 gap-y-0.5 font-mono text-[11px] text-paper/50">
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
      </header>

      {/* Overlay para cerrar el menú lateral en mobile */}
      {menuAbierto && (
        <div
          onClick={cerrarMenu}
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
          aria-hidden="true"
        />
      )}

      {/* ===== Menú lateral ===== */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-30 w-64 bg-petrol-dark text-paper flex flex-col
          transition-transform duration-200 ease-out
          ${menuAbierto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="flex flex-col items-center gap-1.5 px-4 pt-6 pb-4 border-b border-paper/10 shrink-0">
          <div className="w-11 h-11 rounded-full border border-gold-soft/50 flex items-center justify-center text-gold-soft">
            <IconLogo className="w-6 h-6" />
          </div>
          <p className="font-display text-[13px] leading-tight text-center text-paper/90 max-w-[9rem]">
            {nombreMostrado || config?.nombre || t('layout.inicio')}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={cerrarMenu}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-mono transition-colors ${
                  isActive
                    ? 'bg-paper/10 text-gold-soft'
                    : 'text-paper/75 hover:bg-paper/5 hover:text-paper'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}

          {ENLACES_GESTION.length > 0 && (
            <div className="mt-3 pt-3 border-t border-paper/10 flex flex-col gap-0.5">
              {ENLACES_GESTION.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={cerrarMenu}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-xs font-mono transition-colors ${
                      isActive ? 'text-gold-soft' : 'text-paper/50 hover:text-paper/80'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        <div className="shrink-0 flex justify-center pb-4 pt-1 text-gold-soft/25">
          <DecoracionLateral className="w-24 h-auto" />
        </div>
      </aside>

      {/* ===== Contenido ===== */}
      <main className="flex-1 w-full pt-16 md:pl-64">
        <div className="max-w-4xl mx-auto px-5 py-8">{children}</div>
      </main>

      <footer className="border-t border-ink/10 bg-paper-dim md:pl-64">
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
          <div className="max-w-4xl mx-auto px-5 pt-4 pb-24 md:pb-4 flex items-center justify-center gap-3 text-center">
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
