import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useConfig } from '../lib/useConfig'
import { useI18n } from '../lib/i18n/I18nContext'
import { useTema } from '../lib/TemaContext'
import { getIdentidad, limpiarIdentidad } from '../lib/identidad'
import { useSemana } from '../lib/SemanaContext'
import { formatearRango } from '../lib/semanas'
import AjusteFuente from './AjusteFuente'
import logoLaVisual from '../assets/logo-lavisual.png'
import {
  IconHome,
  IconVidaMinisterio,
  IconReunionPublica,
  IconPredicacion,
  IconAnuncios,
  IconCalendario,
  IconLimpieza,
  IconInforme,
  IconPrecursorAuxiliar,
  IconEntrar,
  IconCambiarIdentidad,
  IconSol,
  IconLuna,
  IconLogo,
  DecoracionLateral,
} from './icons/NavIcons'

function BotonTema() {
  const { tema, alternarTema } = useTema()
  const { t } = useI18n()
  const esOscuro = tema === 'oscuro'
  return (
    <button
      onClick={alternarTema}
      aria-label={esOscuro ? t('tema.activarClaro') : t('tema.activarOscuro')}
      title={esOscuro ? t('tema.activarClaro') : t('tema.activarOscuro')}
      className="w-7 h-7 flex items-center justify-center rounded-md text-crema/75 hover:text-gold-soft hover:bg-crema/10 transition-colors shrink-0"
    >
      {esOscuro ? <IconSol className="w-4 h-4" /> : <IconLuna className="w-4 h-4" />}
    </button>
  )
}

function SelectorIdioma() {
  const { idioma, setIdioma, t } = useI18n()
  return (
    <div className="flex items-center gap-1 font-mono text-[11px]">
      <button
        onClick={() => setIdioma('es')}
        aria-label={t('idioma.es')}
        className={`px-1.5 py-0.5 rounded transition-colors ${idioma === 'es' ? 'bg-crema/20 text-crema' : 'text-crema/50 hover:text-crema/80'}`}
      >
        ES
      </button>
      <span className="text-crema/30">/</span>
      <button
        onClick={() => setIdioma('pt')}
        aria-label={t('idioma.pt')}
        className={`px-1.5 py-0.5 rounded transition-colors ${idioma === 'pt' ? 'bg-crema/20 text-crema' : 'text-crema/50 hover:text-crema/80'}`}
      >
        PT
      </button>
    </div>
  )
}

export default function Layout() {
  const { config } = useConfig()
  const { session, perfil, cerrarSesion, esAdmin, puedeEditar } = useAuth()
  const { t, locale } = useI18n()
  const semana = useSemana()
  const puedeGestionarPublicadores = puedeEditar('secretario')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const identidad = getIdentidad()
  const navRef = useRef(null)
  const location = useLocation()

  // Layout ahora es una ruta padre persistente (no se remonta al navegar),
  // así que reforzamos que el ítem activo del menú quede visible en cada
  // cambio de ruta, por si el scroll interno del <nav> lo dejó fuera de vista.
  useEffect(() => {
    const activo = navRef.current?.querySelector('[aria-current="page"]')
    if (activo) {
      activo.scrollIntoView({ block: 'nearest' })
    }
  }, [location.pathname])

  const nombreMostrado = perfil?.nombre || identidad?.nombre || ''

  const NAV_ITEMS = [
    { to: '/', label: t('layout.home'), Icon: IconHome, end: true },
    { to: '/vida-ministerio', label: t('nav.vidaMinisterio'), Icon: IconVidaMinisterio },
    { to: '/reunion-publica', label: t('nav.reunionPublica'), Icon: IconReunionPublica },
    { to: '/predicacion', label: t('nav.predicacion'), Icon: IconPredicacion },
    { to: '/anuncios', label: t('nav.anuncios'), Icon: IconAnuncios },
    { to: '/calendario', label: t('nav.calendario'), Icon: IconCalendario },
    { to: '/limpieza', label: t('nav.limpieza'), Icon: IconLimpieza },
    { to: '/informe-predicacion', label: t('nav.informe'), Icon: IconInforme },
    { to: '/precursor-auxiliar', label: t('nav.solicitudPrecursorAuxiliar'), Icon: IconPrecursorAuxiliar },
  ]

  const ENLACES_GESTION = [
    puedeGestionarPublicadores && { to: '/publicadores', label: t('layout.publicadores') },
    puedeGestionarPublicadores && { to: '/informes', label: t('layout.informes') },
    esAdmin && { to: '/configuracion', label: t('layout.datosCongregacion') },
    esAdmin && { to: '/admin', label: t('layout.admin') },
  ].filter(Boolean)

  function cambiarIdentidad() {
    limpiarIdentidad()
    window.location.reload()
  }

  function confirmarCambiarIdentidad() {
    if (window.confirm(t('layout.confirmarNoSoyYo'))) {
      cambiarIdentidad()
    }
  }

  function cerrarMenu() {
    setMenuAbierto(false)
  }

  const hayInfoSecundaria =
    config?.direccion || config?.telefono_contacto || config?.dia_reunion_publica || config?.dia_vida_ministerio

  return (
    <div className="min-h-screen flex flex-col">
      {/* ===== Barra superior ===== */}
      <header className="fixed top-0 inset-x-0 z-40 bg-petrol text-crema border-b border-crema/10">
        {/* --- Mobile: 2 filas (menú + íconos arriba, semana abajo) --- */}
        <div className="md:hidden flex flex-col">
          <div className="h-14 flex items-center justify-between gap-2 px-3">
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              aria-label={menuAbierto ? t('layout.cerrarMenu') : t('layout.abrirMenu')}
              aria-expanded={menuAbierto}
              className="shrink-0 w-9 h-9 flex flex-col items-center justify-center gap-[3px] rounded-md hover:bg-crema/10 transition-colors"
            >
              <span className={`block h-[1.5px] w-5 bg-crema transition-transform ${menuAbierto ? 'translate-y-[5.5px] rotate-45' : ''}`} />
              <span className={`block h-[1.5px] w-5 bg-crema transition-opacity ${menuAbierto ? 'opacity-0' : ''}`} />
              <span className={`block h-[1.5px] w-5 bg-crema transition-transform ${menuAbierto ? '-translate-y-[5.5px] -rotate-45' : ''}`} />
            </button>

            <div className="flex items-center gap-2 min-w-0 justify-end">
              {!session && identidad?.nombre && (
                <button
                  onClick={confirmarCambiarIdentidad}
                  className="flex items-center gap-1.5 text-crema/75 hover:text-gold-soft transition-colors text-xs font-mono truncate"
                >
                  <IconCambiarIdentidad className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline truncate">{t('layout.noSoyYo')}</span>
                </button>
              )}
              <SelectorIdioma />
              <BotonTema />
              {session ? (
                <button
                  onClick={cerrarSesion}
                  className="flex items-center gap-1.5 text-crema/85 hover:text-gold-soft transition-colors text-xs font-mono shrink-0"
                >
                  <span className="hidden sm:inline">{t('layout.salir')}</span>
                  <IconEntrar className="w-4 h-4 shrink-0 rotate-180" />
                </button>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 text-crema/85 hover:text-gold-soft transition-colors text-xs font-mono shrink-0"
                >
                  <span className="hidden sm:inline">{t('layout.entrar')}</span>
                  <IconEntrar className="w-4 h-4 shrink-0" />
                </Link>
              )}
            </div>
          </div>

          <div className="h-14 flex flex-col items-center justify-center leading-none pb-1">
            <div className="flex items-center gap-2">
              <button
                onClick={semana.semanaAnterior}
                aria-label={t('index.semanaAnterior')}
                className="text-gold-soft/80 hover:text-gold-soft transition-colors font-mono text-lg px-1"
              >
                ‹
              </button>
              <Link
                to="/"
                className="font-display text-lg font-semibold tracking-wide text-crema hover:text-gold-soft transition-colors whitespace-nowrap text-center"
              >
                {t('index.semana')}
              </Link>
              <button
                onClick={semana.semanaSiguiente}
                aria-label={t('index.semanaSiguiente')}
                className="text-gold-soft/80 hover:text-gold-soft transition-colors font-mono text-lg px-1"
              >
                ›
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[10px] text-crema/60 whitespace-nowrap">
                {formatearRango(semana.lunes, semana.domingo, locale())}
              </span>
              {!semana.esSemanaActual && (
                <button
                  onClick={semana.irEstaSemana}
                  className="font-mono text-[10px] text-gold-soft underline decoration-gold-soft/50 hover:text-crema transition-colors whitespace-nowrap"
                >
                  {t('index.volverAEstaSemana')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* --- Desktop: fila única original --- */}
        <div className="hidden md:grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-2 px-5">
          <div className="flex items-center min-w-0">
            {!session && identidad?.nombre && (
              <button
                onClick={confirmarCambiarIdentidad}
                className="flex items-center gap-1.5 text-crema/75 hover:text-gold-soft transition-colors text-sm font-mono truncate"
              >
                <IconCambiarIdentidad className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('layout.noSoyYo')}</span>
              </button>
            )}
          </div>

          <div className="flex flex-col items-center leading-none">
            <div className="flex items-center gap-3">
              <button
                onClick={semana.semanaAnterior}
                aria-label={t('index.semanaAnterior')}
                className="text-gold-soft/80 hover:text-gold-soft transition-colors font-mono text-xl px-1"
              >
                ‹
              </button>
              <Link
                to="/"
                className="font-display text-2xl font-semibold tracking-wide text-crema hover:text-gold-soft transition-colors whitespace-nowrap text-center"
              >
                {t('index.semana')}
              </Link>
              <button
                onClick={semana.semanaSiguiente}
                aria-label={t('index.semanaSiguiente')}
                className="text-gold-soft/80 hover:text-gold-soft transition-colors font-mono text-xl px-1"
              >
                ›
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[11px] text-crema/60 whitespace-nowrap">
                {formatearRango(semana.lunes, semana.domingo, locale())}
              </span>
              {!semana.esSemanaActual && (
                <button
                  onClick={semana.irEstaSemana}
                  className="font-mono text-[11px] text-gold-soft underline decoration-gold-soft/50 hover:text-crema transition-colors whitespace-nowrap"
                >
                  {t('index.volverAEstaSemana')}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 min-w-0">
            <SelectorIdioma />
            <BotonTema />
            {session ? (
              <button
                onClick={cerrarSesion}
                className="flex items-center gap-1.5 text-crema/85 hover:text-gold-soft transition-colors text-sm font-mono shrink-0"
              >
                <span>{t('layout.salir')}</span>
                <IconEntrar className="w-4 h-4 shrink-0 rotate-180" />
              </button>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 text-crema/85 hover:text-gold-soft transition-colors text-sm font-mono shrink-0"
              >
                <span>{t('layout.entrar')}</span>
                <IconEntrar className="w-4 h-4 shrink-0" />
              </Link>
            )}
          </div>
        </div>

        {hayInfoSecundaria && (
          <div className="hidden lg:block border-t border-crema/10">
            <div className="px-5 py-1.5 pl-[4.5rem] md:pl-[17.5rem] flex flex-wrap items-center gap-x-4 gap-y-0.5 font-mono text-[11px] text-crema/50">
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
        className={`fixed top-28 md:top-20 bottom-0 left-0 z-30 w-64 bg-petrol-dark text-crema flex flex-col
          transition-transform duration-200 ease-out
          ${menuAbierto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="flex flex-col items-center gap-1.5 px-4 pt-6 pb-4 border-b border-crema/10 shrink-0">
          <div className="w-11 h-11 rounded-full border border-gold-soft/50 flex items-center justify-center text-gold-soft">
            <IconLogo className="w-6 h-6" />
          </div>
          <p className="font-display text-[13px] leading-tight text-center text-crema/90 max-w-[9rem]">
            {nombreMostrado || config?.nombre || t('layout.inicio')}
          </p>
        </div>

        <nav ref={navRef} className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={cerrarMenu}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-mono transition-colors ${
                  isActive
                    ? 'bg-crema/10 text-gold-soft'
                    : 'text-crema/75 hover:bg-crema/5 hover:text-crema'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}

          {ENLACES_GESTION.length > 0 && (
            <div className="mt-3 pt-3 border-t border-crema/10 flex flex-col gap-0.5">
              {ENLACES_GESTION.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={cerrarMenu}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-xs font-mono transition-colors ${
                      isActive ? 'text-gold-soft' : 'text-crema/50 hover:text-crema/80'
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
      <main className="flex-1 w-full pt-20 md:pl-64">
        <div className="max-w-4xl mx-auto px-5 py-8">
          <Outlet />
        </div>
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
