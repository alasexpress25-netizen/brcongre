import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

function mesesDisponibles() {
  const opciones = []
  const hoy = new Date()
  // últimos 12 meses, el más reciente primero
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    opciones.push({
      mes: d.getMonth() + 1,
      anio: d.getFullYear(),
      label: d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
    })
  }
  return opciones
}

export default function Informes() {
  const { puedeEditar } = useAuth()
  const esEditor = puedeEditar('secretario')
  const meses = mesesDisponibles()

  const [mesAnio, setMesAnio] = useState(`${meses[0].mes}-${meses[0].anio}`)
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('todos') // todos | informaron | pendientes
  const [enviando, setEnviando] = useState(false)
  const [resultadoEnvio, setResultadoEnvio] = useState(null)
  const [error, setError] = useState('')

  const [mes, anio] = mesAnio.split('-').map(Number)

  async function cargar() {
    setCargando(true)
    setError('')
    setResultadoEnvio(null)
    const { data, error: err } = await supabase.rpc('informes_estado', { p_mes: mes, p_anio: anio })
    if (err) {
      console.error('Error al cargar informes_estado:', err)
      setError('No se pudo cargar el estado de los informes. ' + (err.message || ''))
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

  async function enviarRecordatorios() {
    if (pendientesConEmail === 0) return
    const confirmacion = confirm(
      `¿Enviar un recordatorio por correo a los ${pendientesConEmail} publicador(es) que todavía no informaron ${meses.find((m) => m.mes === mes && m.anio === anio)?.label}?`
    )
    if (!confirmacion) return

    setEnviando(true)
    setResultadoEnvio(null)
    setError('')
    const { data, error: err } = await supabase.rpc('enviar_recordatorios_informe', { p_mes: mes, p_anio: anio })
    setEnviando(false)
    if (err) {
      console.error('Error al enviar recordatorios:', err)
      setError('No se pudieron enviar los recordatorios. ' + (err.message || ''))
      return
    }
    setResultadoEnvio(data)
  }

  if (!esEditor) {
    return (
      <Layout>
        <p className="text-ink-soft text-sm">Esta sección es solo para quienes gestionan los datos de la congregación (secretario).</p>
      </Layout>
    )
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold mb-1">Informes de Predicación</h1>
      <p className="text-sm text-ink-soft mb-6">Estado de los informes mensuales por publicador.</p>

      <div className="flex flex-wrap items-center gap-3 mb-4">
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
            { key: 'todos', label: `todos (${filas.length})` },
            { key: 'informaron', label: `informaron (${totalInformaron})` },
            { key: 'pendientes', label: `pendientes (${totalPendientes})` },
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
        <div className="border border-gold/30 bg-gold/5 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            {totalPendientes} publicador(es) sin informe este mes
            {pendientesSinEmail > 0 && ` · ${pendientesSinEmail} sin email cargado (no se les puede avisar por correo)`}
          </p>
          <button
            onClick={enviarRecordatorios}
            disabled={enviando || pendientesConEmail === 0}
            className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark disabled:opacity-50 shrink-0"
          >
            {enviando ? 'enviando…' : `enviar recordatorio por email (${pendientesConEmail})`}
          </button>
        </div>
      )}

      {resultadoEnvio && (
        <p className="text-sm text-petrol mb-4">
          ✅ Recordatorio enviado a {resultadoEnvio.destinatarios ?? 0} publicador(es).
        </p>
      )}
      {error && <p className="text-sm text-clay mb-4">{error}</p>}

      {cargando && <p className="text-ink-soft text-sm">Cargando…</p>}
      {!cargando && filtradas.length === 0 && <p className="text-ink-soft text-sm">No hay publicadores para mostrar.</p>}

      <div className="flex flex-col gap-2">
        {filtradas.map((f) => (
          <div
            key={f.publicador_id}
            className={`border rounded-lg bg-white p-3.5 flex items-center justify-between gap-3 ${
              f.informado ? 'border-ink/10' : 'border-gold/40'
            }`}
          >
            <div>
              <p className="font-display font-medium">{f.nombre}</p>
              <p className="text-xs text-ink-soft mt-0.5">
                {f.email || <span className="text-clay">sin email</span>}
                {f.informado && (
                  <>
                    {f.precursor_auxiliar && ' · precursor auxiliar'}
                    {typeof f.horas === 'number' && ` · ${f.horas} hs`}
                    {typeof f.cursos_biblicos === 'number' && f.cursos_biblicos > 0 && ` · ${f.cursos_biblicos} curso(s) bíblico(s)`}
                  </>
                )}
              </p>
            </div>
            <span
              className={`font-mono text-xs px-2 py-1 rounded-full shrink-0 ${
                f.informado ? 'bg-petrol/10 text-petrol' : 'bg-gold/15 text-gold'
              }`}
            >
              {f.informado ? 'informó' : 'pendiente'}
            </span>
          </div>
        ))}
      </div>
    </Layout>
  )
}
