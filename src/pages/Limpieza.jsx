import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'
import { useSemana } from '../lib/SemanaContext'
import { supabase } from '../lib/supabaseClient'
import { notificar } from '../lib/notificar'

const vacio = { grupo_id: '', fecha_inicio: '', fecha_fin: '', notas: '' }

function formatearRango(inicio, fin, locale) {
  const opciones = { day: 'numeric', month: 'short' }
  return `${new Date(inicio + 'T00:00').toLocaleDateString(locale, opciones)} — ${new Date(fin + 'T00:00').toLocaleDateString(locale, opciones)}`
}

export default function Limpieza() {
  const { puedeEditar } = useAuth()
  const { t, locale } = useI18n()
  const semana = useSemana()
  const esEditor = puedeEditar('limpieza')
  const [turnos, setTurnos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacio)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  async function cargar() {
    setCargando(true)
    // Igual que en Vida y Ministerio: mostramos los turnos que se cruzan con la
    // semana elegida con las flechas del encabezado (un turno puede durar más
    // de una semana, por eso comparamos el rango completo, no solo el inicio).
    const [{ data: tu }, { data: g }] = await Promise.all([
      supabase
        .from('turnos_limpieza')
        .select('*, grupos(nombre)')
        .lte('fecha_inicio', semana.domingoISO)
        .gte('fecha_fin', semana.lunesISO)
        .order('fecha_inicio', { ascending: true }),
      supabase.from('grupos').select('*').order('nombre'),
    ])
    setTurnos(tu || [])
    setGrupos(g || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [semana.lunesISO, semana.domingoISO])

  function editar(tu) {
    setForm({ grupo_id: tu.grupo_id || '', fecha_inicio: tu.fecha_inicio, fecha_fin: tu.fecha_fin, notas: tu.notas || '' })
    setEditandoId(tu.id)
    setMostrarForm(true)
  }

  function nuevo() {
    setForm({ ...vacio, fecha_inicio: semana.lunesISO, fecha_fin: semana.domingoISO })
    setEditandoId(null)
    setMostrarForm(true)
  }

  async function guardar(e) {
    e.preventDefault()
    const payload = { ...form, grupo_id: form.grupo_id || null }
    if (editandoId) await supabase.from('turnos_limpieza').update(payload).eq('id', editandoId)
    else await supabase.from('turnos_limpieza').insert(payload)

    if (payload.grupo_id) {
      // El grupo de cada persona ahora se carga en Publicadores, no en profiles.
      const { data: miembros } = await supabase
        .from('publicadores')
        .select('id')
        .eq('grupo_id', payload.grupo_id)
        .eq('activo', true)
        .not('email', 'is', null)
      const grupoNombre = grupos.find((g) => g.id === payload.grupo_id)?.nombre || t('limpieza.tuGrupo')
      const desde = new Date(payload.fecha_inicio + 'T00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long' })
      const hasta = new Date(payload.fecha_fin + 'T00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long' })
      notificar(
        miembros?.map((m) => m.id),
        t('limpieza.notifTitulo', { grupo: grupoNombre }),
        t('limpieza.notifCuerpo', { desde, hasta })
      )
    }

    setMostrarForm(false)
    setForm(vacio)
    setEditandoId(null)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm(t('limpieza.confirmarEliminar'))) return
    await supabase.from('turnos_limpieza').delete().eq('id', id)
    cargar()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">{t('limpieza.titulo')}</h1>
        {esEditor && (
          <button onClick={nuevo} className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark transition-colors">
            {t('comun.nuevo')}
          </button>
        )}
      </div>

      {esEditor && grupos.length === 0 && (
        <p className="text-sm text-clay mb-4">{t('limpieza.sinGrupos')}</p>
      )}

      {mostrarForm && (
        <form onSubmit={guardar} className="mb-6 border border-ink/10 rounded-lg bg-white p-4 flex flex-col gap-3">
          <select
            required
            value={form.grupo_id}
            onChange={(e) => setForm({ ...form, grupo_id: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          >
            <option value="">{t('limpieza.seleccionarGrupo')}</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nombre}</option>
            ))}
          </select>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-ink-soft">{t('limpieza.desde')}</label>
              <input
                required
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-ink-soft">{t('limpieza.hasta')}</label>
              <input
                required
                type="date"
                value={form.fecha_fin}
                onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
              />
            </div>
          </div>
          <textarea
            placeholder={t('limpieza.notasOpcional')}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            rows={2}
          />
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
      {!cargando && turnos.length === 0 && <p className="text-ink-soft text-sm">{t('limpieza.sinTurnos')}</p>}

      <div className="flex flex-col gap-3">
        {turnos.map((tu) => (
          <div key={tu.id} className="border border-ink/10 rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">{tu.grupos?.nombre || t('limpieza.grupoSinAsignar')}</h3>
                <p className="font-mono text-xs text-gold mt-0.5">{formatearRango(tu.fecha_inicio, tu.fecha_fin, locale())}</p>
              </div>
              {esEditor && (
                <div className="flex gap-2 font-mono text-xs text-ink-soft shrink-0">
                  <button onClick={() => editar(tu)} className="hover:text-petrol">{t('comun.editar')}</button>
                  <button onClick={() => eliminar(tu.id)} className="hover:text-clay">{t('comun.borrar')}</button>
                </div>
              )}
            </div>
            {tu.notas && <p className="text-sm text-ink-soft mt-1">{tu.notas}</p>}
          </div>
        ))}
      </div>
    </>
  )
}
