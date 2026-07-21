import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'
import { useSemana } from '../lib/SemanaContext'
import { supabase } from '../lib/supabaseClient'

const vacio = { titulo: '', descripcion: '', fecha_inicio: '', ubicacion: '' }

function formatearFecha(iso, locale) {
  return new Date(iso).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Calendario() {
  const { puedeEditar } = useAuth()
  const { t, locale } = useI18n()
  const semana = useSemana()
  const esEditor = puedeEditar('calendario')
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacio)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  async function cargar() {
    setCargando(true)
    // Igual que en Vida y Ministerio: mostramos los eventos que empiezan en la
    // semana elegida con las flechas del encabezado, no todos los futuros.
    const { data } = await supabase
      .from('eventos_calendario')
      .select('*')
      .gte('fecha_inicio', `${semana.lunesISO}T00:00:00`)
      .lt('fecha_inicio', `${semana.domingoISO}T23:59:59.999`)
      .order('fecha_inicio', { ascending: true })
    setEventos(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [semana.lunesISO, semana.domingoISO])

  function editar(e) {
    setForm({
      titulo: e.titulo,
      descripcion: e.descripcion || '',
      fecha_inicio: e.fecha_inicio?.slice(0, 16) || '',
      ubicacion: e.ubicacion || '',
    })
    setEditandoId(e.id)
    setMostrarForm(true)
  }

  function nuevo() {
    setForm({ ...vacio, fecha_inicio: `${semana.lunesISO}T19:00` })
    setEditandoId(null)
    setMostrarForm(true)
  }

  async function guardar(e) {
    e.preventDefault()
    const payload = { ...form, fecha_inicio: new Date(form.fecha_inicio).toISOString() }
    if (editandoId) await supabase.from('eventos_calendario').update(payload).eq('id', editandoId)
    else await supabase.from('eventos_calendario').insert(payload)
    setMostrarForm(false)
    setForm(vacio)
    setEditandoId(null)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm(t('calendario.confirmarEliminar'))) return
    await supabase.from('eventos_calendario').delete().eq('id', id)
    cargar()
  }

  function linkGoogleCalendar(e) {
    const inicio = new Date(e.fecha_inicio)
    const fin = e.fecha_fin ? new Date(e.fecha_fin) : new Date(inicio.getTime() + 60 * 60000)
    const fmt = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '')
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: e.titulo,
      dates: `${fmt(inicio)}/${fmt(fin)}`,
      details: e.descripcion || '',
      location: e.ubicacion || '',
    })
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">{t('calendario.titulo')}</h1>
        {esEditor && (
          <button
            onClick={nuevo}
            className="font-mono text-xs bg-petrol text-crema px-3 py-1.5 rounded-md hover:bg-petrol-dark transition-colors"
          >
            {t('comun.nuevo')}
          </button>
        )}
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} className="mb-6 border border-ink/10 rounded-lg bg-surface p-4 flex flex-col gap-3">
          <input
            required
            placeholder={t('calendario.tituloEvento')}
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            required
            type="datetime-local"
            value={form.fecha_inicio}
            onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            placeholder={t('calendario.ubicacion')}
            value={form.ubicacion}
            onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <textarea
            placeholder={t('calendario.descripcion')}
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            rows={2}
          />
          <div className="flex gap-2">
            <button type="submit" className="bg-petrol text-crema rounded-md px-4 py-2 text-sm hover:bg-petrol-dark transition-colors">
              {t('comun.guardar')}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-ink-soft text-sm px-4 py-2 hover:text-ink">
              {t('comun.cancelar')}
            </button>
          </div>
        </form>
      )}

      {cargando && <p className="text-ink-soft text-sm">{t('comun.cargando')}</p>}
      {!cargando && eventos.length === 0 && <p className="text-ink-soft text-sm">{t('calendario.sinEventos')}</p>}

      <div className="flex flex-col gap-3">
        {eventos.map((e) => (
          <div key={e.id} className="border border-ink/10 rounded-lg bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">{e.titulo}</h3>
                <p className="font-mono text-xs text-gold mt-0.5">{formatearFecha(e.fecha_inicio, locale())}</p>
              </div>
              {esEditor && (
                <div className="flex gap-2 font-mono text-xs text-ink-soft shrink-0">
                  <button onClick={() => editar(e)} className="hover:text-petrol">{t('comun.editar')}</button>
                  <button onClick={() => eliminar(e.id)} className="hover:text-clay">{t('comun.borrar')}</button>
                </div>
              )}
            </div>
            {e.ubicacion && <p className="text-sm text-ink-soft mt-1">📍 {e.ubicacion}</p>}
            {e.descripcion && <p className="text-sm text-ink-soft mt-1">{e.descripcion}</p>}
            <a
              href={linkGoogleCalendar(e)}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-2 font-mono text-xs text-petrol underline decoration-gold/50 hover:text-petrol-dark"
            >
              {t('calendario.agregarGoogleCalendar')}
            </a>
          </div>
        ))}
      </div>
    </>
  )
}
