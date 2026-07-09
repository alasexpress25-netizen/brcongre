import { useEffect, useMemo, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'
import { supabase } from '../lib/supabaseClient'

const vacio = {
  numero: '',
  ultima_predicacion: '',
  notas: '',
  link_territorio: '',
  link_mapa: '',
}

function formatearFecha(f, locale) {
  if (!f) return ''
  return new Date(f + 'T00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Territorios() {
  const { puedeEditar } = useAuth()
  const { t, locale } = useI18n()
  const esEditor = puedeEditar('predicacion')

  const [territorios, setTerritorios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacio)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function cargar() {
    setCargando(true)
    const { data } = await supabase.from('territorios').select('*').order('numero')
    setTerritorios(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function editar(terr) {
    setForm({
      numero: terr.numero ?? '',
      ultima_predicacion: terr.ultima_predicacion || '',
      notas: terr.notas || '',
      link_territorio: terr.link_territorio || '',
      link_mapa: terr.link_mapa || '',
    })
    setEditandoId(terr.id)
    setError('')
    setMostrarForm(true)
  }

  function nuevo() {
    setForm(vacio)
    setEditandoId(null)
    setError('')
    setMostrarForm(true)
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setError('')

    const payload = {
      numero: form.numero === '' ? null : Number(form.numero),
      ultima_predicacion: form.ultima_predicacion || null,
      notas: form.notas || null,
      link_territorio: form.link_territorio || null,
      link_mapa: form.link_mapa || null,
    }

    const { error: err } = editandoId
      ? await supabase.from('territorios').update(payload).eq('id', editandoId)
      : await supabase.from('territorios').insert(payload)

    setGuardando(false)
    if (err) {
      setError(err.message.includes('duplicate') ? t('territorios.numeroDuplicado') : err.message)
      return
    }
    setMostrarForm(false)
    setForm(vacio)
    setEditandoId(null)
    cargar()
  }

  async function eliminar() {
    if (!editandoId) return
    if (!confirm(t('territorios.confirmarEliminar'))) return
    const { error: err } = await supabase.from('territorios').delete().eq('id', editandoId)
    if (err) {
      alert(t('territorios.noSePudoEliminar') + err.message)
      return
    }
    setMostrarForm(false)
    setForm(vacio)
    setEditandoId(null)
    cargar()
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return territorios
    return territorios.filter(
      (terr) => String(terr.numero).includes(q) || terr.notas?.toLowerCase().includes(q)
    )
  }, [territorios, busqueda])

  return (
    <Layout>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl font-semibold">{t('territorios.titulo')}</h1>
        {esEditor && (
          <button onClick={nuevo} className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark transition-colors">
            {t('comun.nuevo')}
          </button>
        )}
      </div>
      <p className="text-sm text-ink-soft mb-6">{territorios.length} {t('territorios.totalTerritorios')}</p>

      {mostrarForm && (
        <form onSubmit={guardar} className="mb-6 border border-ink/10 rounded-lg bg-white p-4 flex flex-col gap-3">
          {error && <p className="text-sm text-clay">{error}</p>}
          <div className="flex gap-3">
            <input
              required
              type="number"
              placeholder={t('territorios.numero')}
              value={form.numero}
              onChange={(e) => setForm({ ...form, numero: e.target.value })}
              className="w-32 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
            <div className="flex-1">
              <label className="text-xs text-ink-soft font-mono block mb-1">{t('territorios.ultimaVezPredicado')}</label>
              <input
                type="date"
                value={form.ultima_predicacion}
                onChange={(e) => setForm({ ...form, ultima_predicacion: e.target.value })}
                className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
              />
            </div>
          </div>
          <input
            placeholder={t('territorios.linkTerritorio')}
            value={form.link_territorio}
            onChange={(e) => setForm({ ...form, link_territorio: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <input
            placeholder={t('territorios.linkMapa')}
            value={form.link_mapa}
            onChange={(e) => setForm({ ...form, link_mapa: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <textarea
            placeholder={t('territorios.notas')}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            rows={2}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="bg-petrol text-paper rounded-md px-4 py-2 text-sm hover:bg-petrol-dark transition-colors disabled:opacity-50">
              {guardando ? t('territorios.guardando') : t('comun.guardar')}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-ink-soft text-sm px-4 py-2 hover:text-ink">
              {t('comun.cancelar')}
            </button>
            {editandoId && (
              <button type="button" onClick={eliminar} className="text-clay text-sm px-4 py-2 hover:text-clay/80 ml-auto">
                {t('territorios.borrarTerritorio')}
              </button>
            )}
          </div>
        </form>
      )}

      <input
        placeholder={t('territorios.buscar')}
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-petrol"
      />

      {cargando && <p className="text-ink-soft text-sm">{t('comun.cargando')}</p>}
      {!cargando && filtrados.length === 0 && <p className="text-ink-soft text-sm">{t('territorios.sinTerritorios')}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtrados.map((terr) => (
          <div key={terr.id} className="border border-ink/10 rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">{t('territorios.territorioNumero')} {terr.numero}</h3>
                {terr.ultima_predicacion && (
                  <p className="font-mono text-xs text-gold mt-0.5">{t('territorios.ultimaPredicacion')}: {formatearFecha(terr.ultima_predicacion, locale())}</p>
                )}
              </div>
              {esEditor && (
                <button onClick={() => editar(terr)} className="font-mono text-xs text-ink-soft hover:text-petrol shrink-0">
                  {t('comun.editar')}
                </button>
              )}
            </div>
            {terr.notas && <p className="text-sm text-ink-soft mt-2">{terr.notas}</p>}
            <div className="flex gap-3 mt-3 font-mono text-xs">
              {terr.link_territorio && (
                <a href={terr.link_territorio} target="_blank" rel="noreferrer" className="text-petrol underline hover:text-petrol-dark">
                  {t('territorios.verTerritorio')}
                </a>
              )}
              {terr.link_mapa && (
                <a href={terr.link_mapa} target="_blank" rel="noreferrer" className="text-petrol underline hover:text-petrol-dark">
                  {t('territorios.verMapa')}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  )
}
