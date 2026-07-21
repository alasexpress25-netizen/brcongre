import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n/I18nContext'

const PASOS = [87.5, 100, 112.5, 125, 137.5]
const CLAVE_STORAGE = 'brcongre_tamano_fuente'

function indiceGuardado() {
  if (typeof window === 'undefined') return 1
  const guardado = Number(window.localStorage.getItem(CLAVE_STORAGE))
  const i = PASOS.indexOf(guardado)
  return i !== -1 ? i : 1
}

export default function AjusteFuente() {
  const { t } = useI18n()
  const [abierto, setAbierto] = useState(false)
  const [indice, setIndice] = useState(indiceGuardado)

  useEffect(() => {
    document.documentElement.style.fontSize = `${PASOS[indice]}%`
    window.localStorage.setItem(CLAVE_STORAGE, String(PASOS[indice]))
  }, [indice])

  return (
    <div className="md:hidden fixed bottom-24 left-4 z-40">
      {abierto && (
        <div className="mb-2 flex items-center gap-3 rounded-full border border-ink/10 bg-surface shadow-lg px-4 py-3">
          <span className="text-xs font-semibold text-ink-soft">A</span>
          <input
            type="range"
            min={0}
            max={PASOS.length - 1}
            step={1}
            value={indice}
            onChange={(e) => setIndice(Number(e.target.value))}
            aria-label={t('ajusteFuente.tamanoLetra')}
            className="w-28 accent-petrol"
          />
          <span className="text-lg font-semibold text-ink-soft">A</span>
        </div>
      )}
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label={t('ajusteFuente.ajustarTamanoLetra')}
        className="w-11 h-11 rounded-full bg-petrol text-paper shadow-lg flex items-center justify-center font-display text-lg"
      >
        A
      </button>
    </div>
  )
}
