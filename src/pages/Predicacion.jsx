import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'
import { useSemana } from '../lib/SemanaContext'
import { supabase } from '../lib/supabaseClient'

const vacioSalida = { grupo_id: '', fecha: '', hora: '', punto_encuentro: '', encargado_id: '', notas: '', territorio_ids: [] }

function formatearFecha(f, locale) {
  return new Date(f + 'T00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })
}

// Lunes de la semana a la que pertenece una fecha YYYY-MM-DD dada
function lunesDeFecha(fechaISO) {
  const f = new Date(fechaISO + 'T00:00')
  const dia = (f.getDay() + 6) % 7
  const lunes = new Date(f)
  lunes.setDate(f.getDate() - dia)
  return lunes.toISOString().slice(0, 10)
}

function formatearRangoSemana(lunesISO, locale) {
  const inicio = new Date(lunesISO + 'T00:00')
  const fin = new Date(inicio)
  fin.setDate(inicio.getDate() + 6)
  const opciones = { day: 'numeric', month: 'short' }
  return `${inicio.toLocaleDateString(locale, opciones)} — ${fin.toLocaleDateString(locale, opciones)}`
}

// Agrupa las salidas por semana (lunes a domingo), ordenadas cronológicamente
function agruparPorSemana(lista) {
  const grupos = new Map()
  for (const s of lista) {
    const lunes = lunesDeFecha(s.fecha)
    if (!grupos.has(lunes)) grupos.set(lunes, [])
    grupos.get(lunes).push(s)
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([lunes, salidasSemana]) => ({
      lunes,
      salidas: salidasSemana.sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1
        return (a.hora || '').localeCompare(b.hora || '')
      }),
    }))
}

export default function Predicacion() {
  const { puedeEditar } = useAuth()
  const { t, locale } = useI18n()
  const semana = useSemana()
  const esEditor = puedeEditar('predicacion')
  const esSecretario = puedeEditar('secretario')
  const [grupos, setGrupos] = useState([])
  const [publicadores, setPublicadores] = useState([])
  const [territoriosDisponibles, setTerritoriosDisponibles] = useState([])
  const [salidas, setSalidas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacioSalida)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nuevoGrupo, setNuevoGrupo] = useState('')

  async function cargar() {
    setCargando(true)
    const [{ data: g }, { data: p }, { data: te }, { data: s }] = await Promise.all([
      supabase.from('grupos').select('*').order('nombre'),
      supabase.from('publicadores').select('id, nombre').eq('activo', true).order('nombre'),
      supabase.rpc('territorios_numeros_publico'),
      supabase
        .from('salidas_predicacion')
        .select(
          '*, grupos(nombre), publicadores!salidas_predicacion_encargado_id_fkey(nombre), salidas_predicacion_territorios(territorio_id)'
        )
        .gte('fecha', semana.lunesISO)
        .lte('fecha', semana.domingoISO)
        .order('fecha', { ascending: true })
        .order('hora', { ascending: true }),
    ])
    setGrupos(g || [])
    setPublicadores(p || [])
    setTerritoriosDisponibles(te || [])
    setSalidas(s || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [semana.lunesISO, semana.domingoISO])

  async function agregarGrupo(e) {
    e.preventDefault()
    if (!nuevoGrupo.trim()) return
    await supabase.from('grupos').insert({ nombre: nuevoGrupo.trim() })
    setNuevoGrupo('')
    cargar()
  }

  function editar(s) {
    setForm({
      grupo_id: s.grupo_id || '',
      fecha: s.fecha,
      hora: s.hora || '',
      punto_encuentro: s.punto_encuentro || '',
      encargado_id: s.encargado_id || '',
      notas: s.notas || '',
      territorio_ids: (s.salidas_predicacion_territorios || []).map((st) => st.territorio_id),
    })
    setEditandoId(s.id)
    setMostrarForm(true)
  }

  function alternarTerritorio(id) {
    setForm((f) => ({
      ...f,
      territorio_ids: f.territorio_ids.includes(id)
        ? f.territorio_ids.filter((tid) => tid !== id)
        : [...f.territorio_ids, id],
    }))
  }

  function nueva() {
    setForm({ ...vacioSalida, fecha: semana.lunesISO })
    setEditandoId(null)
    setMostrarForm(true)
  }

  async function guardar(e) {
    e.preventDefault()
    const { territorio_ids, ...resto } = form
    const payload = { ...resto, grupo_id: form.grupo_id || null, encargado_id: form.encargado_id || null }

    let salidaId = editandoId
    if (editandoId) {
      await supabase.from('salidas_predicacion').update(payload).eq('id', editandoId)
    } else {
      const { data } = await supabase.from('salidas_predicacion').insert(payload).select('id').single()
      salidaId = data?.id
    }

    if (salidaId) {
      await supabase.from('salidas_predicacion_territorios').delete().eq('salida_id', salidaId)
      if (territorio_ids.length > 0) {
        await supabase.from('salidas_predicacion_territorios').insert(
          territorio_ids.map((territorio_id) => ({ salida_id: salidaId, territorio_id }))
        )
      }
    }

    setMostrarForm(false)
    setForm(vacioSalida)
    setEditandoId(null)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm(t('predicacion.confirmarEliminar'))) return
    await supabase.from('salidas_predicacion').delete().eq('id', id)
    cargar()
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">{t('predicacion.titulo')}</h1>
        {esEditor && (
          <button onClick={nueva} className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark transition-colors">
            {t('predicacion.nuevaSalida')}
          </button>
        )}
      </div>

      {esSecretario && (
        <details className="mb-6 border border-ink/10 rounded-lg bg-white p-4">
          <summary className="cursor-pointer font-mono text-xs text-ink-soft">{t('predicacion.gestionarGrupos')} ({grupos.length})</summary>
          <ul className="mt-3 flex flex-wrap gap-2">
            {grupos.map((g) => (
              <li key={g.id} className="text-sm bg-paper-dim rounded-full px-3 py-1">{g.nombre}</li>
            ))}
          </ul>
          <form onSubmit={agregarGrupo} className="mt-3 flex gap-2">
            <input
              placeholder={t('predicacion.nombreNuevoGrupo')}
              value={nuevoGrupo}
              onChange={(e) => setNuevoGrupo(e.target.value)}
              className="flex-1 border border-ink/15 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
            />
            <button className="bg-petrol text-paper text-sm rounded-md px-3 hover:bg-petrol-dark">{t('predicacion.agregar')}</button>
          </form>
        </details>
      )}

      {mostrarForm && (
        <form onSubmit={guardar} className="mb-6 border border-ink/10 rounded-lg bg-white p-4 flex flex-col gap-3">
          <select
            value={form.grupo_id}
            onChange={(e) => setForm({ ...form, grupo_id: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          >
            <option value="">{t('predicacion.sinGrupoAsignado')}</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nombre}</option>
            ))}
          </select>
          <div className="flex gap-3">
            <input
              required
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
            <input
              type="time"
              value={form.hora}
              onChange={(e) => setForm({ ...form, hora: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
          </div>
          <input
            placeholder={t('predicacion.puntoEncuentro')}
            value={form.punto_encuentro}
            onChange={(e) => setForm({ ...form, punto_encuentro: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <select
            value={form.encargado_id}
            onChange={(e) => setForm({ ...form, encargado_id: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          >
            <option value="">{t('predicacion.sinConductorAsignado')}</option>
            {publicadores.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <textarea
            placeholder={t('predicacion.notas')}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            rows={2}
          />
          <div>
            <label className="text-xs text-ink-soft font-mono block mb-1.5">
              {t('predicacion.territoriosAPredicar')} {territoriosDisponibles.length === 0 && t('predicacion.sinTerritoriosCargados')}
            </label>
            <div className="flex flex-wrap gap-2">
              {territoriosDisponibles.map((te) => {
                const seleccionado = form.territorio_ids.includes(te.id)
                return (
                  <button
                    type="button"
                    key={te.id}
                    onClick={() => alternarTerritorio(te.id)}
                    className={`font-mono text-xs rounded-full px-3 py-1 border transition-colors ${
                      seleccionado
                        ? 'bg-petrol text-paper border-petrol'
                        : 'bg-paper-dim text-ink-soft border-ink/15 hover:border-petrol/50'
                    }`}
                  >
                    {te.numero}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-petrol text-paper rounded-md px-4 py-2 text-sm hover:bg-petrol-dark transition-colors">
              {t('comun.guardar')}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-ink-soft text-sm px-4 py-2 hover:text-ink">
              {t('comun.cancelar')}
            </button>
          </div>
        </form>
      )}

      {cargando && <p className="text-ink-soft text-sm">{t('comun.cargando')}</p>}
      {!cargando && salidas.length === 0 && <p className="text-ink-soft text-sm">{t('predicacion.sinSalidas')}</p>}

      <div className="flex flex-col gap-6">
        {agruparPorSemana(salidas).map(({ lunes, salidas: salidasSemana }) => (
          <div key={lunes} className="flex flex-col gap-3">
            <h2 className="font-mono text-xs uppercase tracking-wider text-petrol border-b border-ink/10 pb-1.5">
              {t('predicacion.semanaDe', { rango: formatearRangoSemana(lunes, locale()) })}
            </h2>
            {salidasSemana.map((s) => (
              <div key={s.id} className="border border-ink/10 rounded-lg bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{s.grupos?.nombre || t('predicacion.grupoGeneral')}</h3>
                    <p className="font-mono text-xs text-gold mt-0.5">
                      {formatearFecha(s.fecha, locale())} {s.hora && `· ${s.hora.slice(0, 5)}`}
                    </p>
                  </div>
                  {esEditor && (
                    <div className="flex gap-2 font-mono text-xs text-ink-soft shrink-0">
                      <button onClick={() => editar(s)} className="hover:text-petrol">{t('comun.editar')}</button>
                      <button onClick={() => eliminar(s.id)} className="hover:text-clay">{t('comun.borrar')}</button>
                    </div>
                  )}
                </div>
                {s.punto_encuentro && <p className="text-sm text-ink-soft mt-1">📍 {s.punto_encuentro}</p>}
                {s.publicadores?.nombre && <p className="text-sm text-ink-soft mt-1">🚗 {t('predicacion.conductor')}: {s.publicadores.nombre}</p>}
                {s.salidas_predicacion_territorios?.length > 0 && (
                  <p className="text-sm text-ink-soft mt-1">
                    🗺️ {t('predicacion.territorios')}:{' '}
                    {s.salidas_predicacion_territorios
                      .map((st) => territoriosDisponibles.find((te) => te.id === st.territorio_id)?.numero)
                      .filter((n) => n !== undefined)
                      .join(', ')}
                  </p>
                )}
                {s.notas && <p className="text-sm text-ink-soft mt-1">{s.notas}</p>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Layout>
  )
}
