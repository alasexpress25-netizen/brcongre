import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'
import { supabase } from '../lib/supabaseClient'

function mesesDisponibles(locale) {
  const opciones = []
  const hoy = new Date()
  // últimos 12 meses, el más reciente primero
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    opciones.push({
      mes: d.getMonth() + 1,
      anio: d.getFullYear(),
      label: d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    })
  }
  return opciones
}

export default function Informes() {
  const { puedeEditar } = useAuth()
  const { t, locale } = useI18n()
  const esEditor = puedeEditar('secretario')
  const meses = mesesDisponibles(locale())

  const [mesAnio, setMesAnio] = useState(`${meses[0].mes}-${meses[0].anio}`)
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todos') // todos | informaron | pendientes
  const [enviando, setEnviando] = useState(false)
  const [resultadoEnvio, setResultadoEnvio] = useState(null)
  const [error, setError] = useState('')

  const [mes, anio] = mesAnio.split('-').map(Number)
  const labelMes = meses.find((m) => m.mes === mes && m.anio === anio)?.label || ''

  async function cargar() {
    setCargando(true)
    setError('')
    setResultadoEnvio(null)
    const { data, error: err } = await supabase.rpc('informes_estado', { p_mes: mes, p_anio: anio })
    if (err) {
      console.error('Error al cargar informes_estado:', err)
      setError(t('informes.errorCargarEstado') + ' ' + (err.message || ''))
      setFilas([])
    } else {
      setFilas(data || [])
    }
    setCargando(false)
  }

  useEffect(() => {
    if (esEditor) cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esEditor, mesAnio])

  const filtradas = useMemo(() => {
    return filas.filter((f) => {
      if (filtro === 'informaron') return f.informado
      if (filtro === 'pendientes') return !f.informado
      return true
    })
  }, [filas, filtro])

  const totalInformaron = filas.filter((f) => f.informado).length
  const totalPendientes = filas.filter((f) => !f.informado).length
  const pendientesConEmail = filas.filter((f) => !f.informado && f.email).length
  const pendientesSinEmail = filas.filter((f) => !f.informado && !f.email).length

  const gruposConFilas = useMemo(() => {
    const porGrupo = new Map()
    filtradas.forEach((f) => {
      const key = f.grupo_id || 'sin_grupo'
      const nombreGrupo = f.grupo_nombre || t('publicadores.sinGrupo')
      if (!porGrupo.has(key)) porGrupo.set(key, { id: key, nombre: nombreGrupo, items: [] })
      porGrupo.get(key).items.push(f)
    })
    const grupos = Array.from(porGrupo.values())
    grupos.sort((a, b) => {
      if (a.id === 'sin_grupo') return 1
      if (b.id === 'sin_grupo') return -1
      return a.nombre.localeCompare(b.nombre, 'es')
    })
    grupos.forEach((g) => g.items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')))
    return grupos
  }, [filtradas, t])

  function imprimir() {
    window.print()
  }

  async function enviarRecordatorios() {
    if (pendientesConEmail === 0) return
    const confirmacion = confirm(t('informes.confirmarEnvio', { cantidad: pendientesConEmail, mes: labelMes }))
    if (!confirmacion) return

    setEnviando(true)
    setResultadoEnvio(null)
    setError('')
    const { data, error: err } = await supabase.rpc('enviar_recordatorios_informe', { p_mes: mes, p_anio: anio })
    setEnviando(false)
    if (err) {
      console.error('Error al enviar recordatorios:', err)
      setError(t('informes.errorEnviarRecordatorios') + ' ' + (err.message || ''))
      return
    }
    setResultadoEnvio(data)
  }

  if (!esEditor) {
    return (
      <>
        <p className="text-ink-soft text-sm">{t('informes.soloSecretario')}</p>
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-1 no-print">
        <h1 className="font-display text-2xl font-semibold">{t('informes.titulo')}</h1>
        <button onClick={imprimir} className="font-mono text-xs border border-petrol/30 text-petrol px-3 py-1.5 rounded-md hover:bg-petrol/10 transition-colors">
          {t('informes.imprimir')}
        </button>
      </div>
      <p className="text-sm text-ink-soft mb-6 no-print">{t('informes.subtitulo')}</p>

      <div className="print-only mb-6">
        <h1 className="font-display text-2xl font-semibold capitalize">{t('informes.titulo')} — {labelMes}</h1>
        <p className="text-sm text-ink-soft">
          {filtradas.length} {t('informes.publicadoresLabel')} · {t('informes.agrupadosPor')} · {new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 no-print">
        <select
          value={mesAnio}
          onChange={(e) => setMesAnio(e.target.value)}
          className="border border-ink/15 rounded-md px-3 py-2 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-petrol"
        >
          {meses.map((m) => (
            <option key={`${m.mes}-${m.anio}`} value={`${m.mes}-${m.anio}`} className="capitalize">
              {m.label}
            </option>
          ))}
        </select>

        <div className="flex gap-1 font-mono text-xs">
          {[
            { key: 'todos', label: `${t('informes.todos')} (${filas.length})` },
            { key: 'informaron', label: `${t('informes.informaron')} (${totalInformaron})` },
            { key: 'pendientes', label: `${t('informes.pendientes')} (${totalPendientes})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-2.5 py-1.5 rounded-md border ${
                filtro === f.key ? 'bg-petrol text-paper border-petrol' : 'border-ink/15 text-ink-soft hover:border-petrol/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {totalPendientes > 0 && (
        <div className="border border-gold/30 bg-gold/5 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
          <p className="text-sm text-ink-soft">
            {totalPendientes} {t('informes.sinInformeEsteMes')}
            {pendientesSinEmail > 0 && ` · ${pendientesSinEmail} ${t('informes.sinEmailCargado')}`}
          </p>
          <button
            onClick={enviarRecordatorios}
            disabled={enviando || pendientesConEmail === 0}
            className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark disabled:opacity-50 shrink-0"
          >
            {enviando ? t('informes.enviando') : `${t('informes.enviarRecordatorio')} (${pendientesConEmail})`}
          </button>
        </div>
      )}

      {resultadoEnvio && (
        <p className="text-sm text-petrol mb-4 no-print">
          {t('informes.recordatorioEnviado', { cantidad: resultadoEnvio.destinatarios ?? 0 })}
        </p>
      )}
      {error && <p className="text-sm text-clay mb-4 no-print">{error}</p>}

      {cargando && <p className="text-ink-soft text-sm no-print">{t('comun.cargando')}</p>}
      {!cargando && gruposConFilas.length === 0 && <p className="text-ink-soft text-sm">{t('informes.sinPublicadores')}</p>}

      <div className="flex flex-col gap-6">
        {gruposConFilas.map((g) => (
          <div key={g.id} className="break-inside-avoid">
            <h2 className="font-mono text-xs uppercase tracking-wide text-petrol font-semibold border-b border-ink/10 pb-1 mb-3">
              {g.nombre} <span className="text-ink-soft normal-case">· {g.items.length}</span>
            </h2>
            <div className="flex flex-col gap-2">
              {g.items.map((f) => (
                <div
                  key={f.publicador_id}
                  className={`border rounded-lg bg-white p-3.5 flex items-center justify-between gap-3 ${
                    f.informado ? 'border-ink/10' : 'border-gold/40'
                  }`}
                >
                  <div>
                    <p className="font-display font-medium">{f.nombre}</p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {f.email || <span className="text-clay">{t('informes.sinEmail')}</span>}
                      {f.informado && (
                        <>
                          {f.precursor_auxiliar && ` · ${t('informes.precursorAuxiliar')}`}
                          {typeof f.horas === 'number' &&
                            (f.servicio === 'precursor_regular' || f.servicio === 'precursor_especial' || f.precursor_auxiliar) &&
                            ` · ${f.horas} ${t('informes.horasAbrev')}`}
                          {typeof f.cursos_biblicos === 'number' && f.cursos_biblicos > 0 && ` · ${f.cursos_biblicos} ${t('informes.cursosBiblicos')}`}
                        </>
                      )}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-xs px-2 py-1 rounded-full shrink-0 ${
                      f.informado ? 'bg-petrol/10 text-petrol' : 'bg-gold/15 text-gold'
                    }`}
                  >
                    {f.informado ? t('informes.informo') : t('informes.pendiente')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
