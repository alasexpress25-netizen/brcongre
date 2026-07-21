import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n/I18nContext'
import { useConfig } from '../lib/useConfig'

const CLAVE_OMITIDA = 'appInstallGate:omitida'

function yaEstaInstalada() {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari expone esto cuando la PWA ya fue agregada a inicio.
  if (window.navigator.standalone) return true
  return false
}

function esIOS() {
  const ua = window.navigator.userAgent
  // iPadOS 13+ se reporta como Mac, pero con soporte táctil.
  const esIpadOSComoMac = ua.includes('Macintosh') && navigator.maxTouchPoints > 1
  return /iphone|ipad|ipod/i.test(ua) || esIpadOSComoMac
}

function fueOmitida() {
  return localStorage.getItem(CLAVE_OMITIDA) === '1'
}

function marcarOmitida() {
  localStorage.setItem(CLAVE_OMITIDA, '1')
}

export default function PantallaInstalacion({ children }) {
  const { t } = useI18n()
  const { config } = useConfig()

  const [listo, setListo] = useState(false)
  const [omitir, setOmitir] = useState(false)
  const [eventoInstalacion, setEventoInstalacion] = useState(null)
  const [paso, setPaso] = useState('esperando') // esperando | inicio | ios | no_disponible | instalando | instalada

  useEffect(() => {
    if (yaEstaInstalada() || fueOmitida()) {
      setOmitir(true)
      setListo(true)
      return
    }

    if (esIOS()) {
      setPaso('ios')
      setListo(true)
      return
    }

    function alDetectarPrompt(e) {
      e.preventDefault()
      setEventoInstalacion(e)
      setPaso('inicio')
      setListo(true)
    }

    function alInstalar() {
      setPaso('instalada')
    }

    window.addEventListener('beforeinstallprompt', alDetectarPrompt)
    window.addEventListener('appinstalled', alInstalar)

    // Si el navegador no dispara beforeinstallprompt (Firefox, Safari desktop,
    // ya visitó e instaló antes, etc.), no bloqueamos: mostramos aviso breve
    // y dejamos pasar directo a la app.
    const espera = setTimeout(() => {
      setPaso((p) => (p === 'esperando' ? 'no_disponible' : p))
      setListo(true)
    }, 1200)

    return () => {
      window.removeEventListener('beforeinstallprompt', alDetectarPrompt)
      window.removeEventListener('appinstalled', alInstalar)
      clearTimeout(espera)
    }
  }, [])

  if (!listo) return null
  if (omitir) return children

  function continuarSinInstalar() {
    marcarOmitida()
    setOmitir(true)
  }

  async function instalar() {
    if (!eventoInstalacion) return
    setPaso('instalando')
    eventoInstalacion.prompt()
    const eleccion = await eventoInstalacion.userChoice
    if (eleccion.outcome !== 'accepted') {
      setPaso('inicio')
    }
    // Si acepta, esperamos el evento 'appinstalled' para pasar a 'instalada'.
  }

  function abrirApp() {
    marcarOmitida()
    // No existe una API web para forzar el foco de la ventana standalone ya
    // instalada desde esta pestaña. En escritorio, Chrome suele abrirla sola
    // apenas se acepta la instalación; en Android hay que abrirla desde el
    // ícono. De cualquier forma, dejamos seguir acá mismo.
    setOmitir(true)
  }

  const nombreApp = config?.nombre || t('instalarApp.titulo')

  return (
    <div className="min-h-screen flex items-center justify-center bg-petrol px-5">
      <div className="w-full max-w-sm text-center">
        <img
          src="/icons/icon-512.png"
          alt=""
          className="w-20 h-20 rounded-2xl mx-auto mb-5 shadow-lg"
        />
        <h1 className="font-display text-2xl font-semibold text-paper mb-2">{nombreApp}</h1>

        {paso === 'inicio' && (
          <>
            <p className="text-paper/70 text-sm mb-6">{t('instalarApp.bienvenidaSubtitulo')}</p>
            <button
              onClick={instalar}
              className="w-full bg-gold text-ink font-medium rounded-md py-3 hover:bg-gold-dark transition-colors mb-3"
            >
              {t('instalarApp.instalar')}
            </button>
            <button
              onClick={continuarSinInstalar}
              className="w-full text-paper/60 text-sm py-2 hover:text-paper transition-colors"
            >
              {t('instalarApp.continuarNavegador')}
            </button>
          </>
        )}

        {paso === 'instalando' && (
          <p className="text-paper/70 text-sm">{t('instalarApp.instalando')}</p>
        )}

        {paso === 'instalada' && (
          <>
            <p className="text-paper text-sm mb-1">{t('instalarApp.instalada')}</p>
            <p className="text-paper/60 text-xs mb-6">{t('instalarApp.abrirAppAyuda')}</p>
            <button
              onClick={abrirApp}
              className="w-full bg-gold text-ink font-medium rounded-md py-3 hover:bg-gold-dark transition-colors"
            >
              {t('instalarApp.abrirApp')}
            </button>
          </>
        )}

        {paso === 'ios' && (
          <>
            <p className="text-paper/70 text-sm mb-5">{t('instalarApp.bienvenidaSubtitulo')}</p>
            <ol className="text-left text-paper/80 text-sm flex flex-col gap-2 mb-6 bg-paper/10 rounded-lg p-4">
              <li>1. {t('instalarApp.iosPaso1')} <span className="inline-block">⬆️</span></li>
              <li>2. {t('instalarApp.iosPaso2')}</li>
              <li>3. {t('instalarApp.iosPaso3')}</li>
            </ol>
            <button
              onClick={continuarSinInstalar}
              className="w-full bg-gold text-ink font-medium rounded-md py-3 hover:bg-gold-dark transition-colors mb-3"
            >
              {t('instalarApp.iosListo')}
            </button>
            <button
              onClick={continuarSinInstalar}
              className="w-full text-paper/60 text-sm py-2 hover:text-paper transition-colors"
            >
              {t('instalarApp.continuarNavegador')}
            </button>
          </>
        )}

        {paso === 'no_disponible' && (
          <>
            <p className="text-paper/70 text-sm mb-6">{t('instalarApp.noDisponible')}</p>
            <button
              onClick={continuarSinInstalar}
              className="w-full bg-gold text-ink font-medium rounded-md py-3 hover:bg-gold-dark transition-colors"
            >
              {t('instalarApp.continuarNavegador')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
