import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n/I18nContext'

const CLAVE_DESCARTADO = 'instalarApp:descartadoHasta'
const DIAS_ESPERA = 7

function yaEstaInstalada() {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari expone esto cuando la PWA ya fue agregada a inicio.
  if (window.navigator.standalone) return true
  return false
}

function esIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function fueDescartadoRecientemente() {
  const hasta = localStorage.getItem(CLAVE_DESCARTADO)
  if (!hasta) return false
  return Date.now() < Number(hasta)
}

function descartar() {
  const hasta = Date.now() + DIAS_ESPERA * 24 * 60 * 60 * 1000
  localStorage.setItem(CLAVE_DESCARTADO, String(hasta))
}

export default function InstalarAppBanner() {
  const { t } = useI18n()
  const [eventoInstalacion, setEventoInstalacion] = useState(null)
  const [mostrarIOS, setMostrarIOS] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (yaEstaInstalada() || fueDescartadoRecientemente()) return

    function alDetectarPrompt(e) {
      e.preventDefault()
      setEventoInstalacion(e)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', alDetectarPrompt)

    // iOS no dispara beforeinstallprompt: mostramos instrucciones manuales.
    if (esIOS()) {
      setMostrarIOS(true)
      setVisible(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', alDetectarPrompt)
  }, [])

  if (!visible) return null

  async function instalar() {
    if (!eventoInstalacion) return
    eventoInstalacion.prompt()
    await eventoInstalacion.userChoice
    setVisible(false)
  }

  function cerrar() {
    descartar()
    setVisible(false)
  }

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 z-50 rounded-lg border border-petrol/20 bg-white shadow-lg px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">📲</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{t('instalarApp.titulo')}</p>
          {mostrarIOS ? (
            <p className="text-xs text-ink-soft mt-1">{t('instalarApp.descripcionIOS')}</p>
          ) : (
            <p className="text-xs text-ink-soft mt-1">{t('instalarApp.descripcionAndroid')}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {!mostrarIOS && (
              <button
                onClick={instalar}
                className="font-mono text-xs bg-petrol text-paper rounded px-3 py-1.5 hover:opacity-90 transition-opacity"
              >
                {t('instalarApp.instalar')}
              </button>
            )}
            <button
              onClick={cerrar}
              className="font-mono text-xs text-ink-soft hover:text-petrol transition-colors px-2 py-1.5"
            >
              {t('instalarApp.ahoraNo')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
