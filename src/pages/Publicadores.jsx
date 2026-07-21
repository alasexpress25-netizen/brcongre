import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'
import { supabase } from '../lib/supabaseClient'

const CLAVES_SERVICIOS = [
  'publicador',
  'precursor_auxiliar',
  'precursor_regular',
  'precursor_especial',
  'siervo_ministerial',
  'anciano',
]

const vacio = {
  nombre: '',
  email: '',
  telefono: '',
  direccion: '',
  numero_documento: '',
  cpf: '',
  servicio: 'publicador',
  grupo_id: '',
  activo: true,
  notas: '',
}

export default function Publicadores() {
  const { puedeEditar } = useAuth()
  const { t, locale } = useI18n()
  const esEditor = puedeEditar('secretario')

  function etiquetaServicio(valor) {
    return t(`publicadores.servicio_${valor}`) || valor
  }

  const [publicadores, setPublicadores] = useState([])
  const [grupos, setGrupos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacio)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState('')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function cargar() {
    setCargando(true)
    const [{ data }, { data: g }] = await Promise.all([
      supabase.from('publicadores').select('*, grupos!publicadores_grupo_id_fkey(nombre)').order('nombre'),
      supabase.from('grupos').select('*').order('nombre'),
    ])
    setPublicadores(data || [])
    setGrupos(g || [])
    setCargando(false)
  }

  useEffect(() => {
    if (esEditor) cargar()
  }, [esEditor])

  function editar(p) {
    setForm({
      nombre: p.nombre || '',
      email: p.email || '',
      telefono: p.telefono || '',
      direccion: p.direccion || '',
      numero_documento: p.numero_documento || '',
      cpf: p.cpf || '',
      servicio: p.servicio || 'publicador',
      grupo_id: p.grupo_id || '',
      activo: p.activo,
      notas: p.notas || '',
    })
    setEditandoId(p.id)
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
    const payload = { ...form }
    Object.keys(payload).forEach((k) => {
      if (payload[k] === '') payload[k] = null
    })
    payload.activo = !!form.activo

    const { error: err } = editandoId
      ? await supabase.from('publicadores').update(payload).eq('id', editandoId)
      : await supabase.from('publicadores').insert(payload)

    setGuardando(false)
    if (err) {
      setError(err.message)
      return
    }
    setMostrarForm(false)
    setForm(vacio)
    setEditandoId(null)
    cargar()
  }

  async function eliminar() {
    if (!editandoId) return
    if (!confirm(t('publicadores.confirmarEliminar'))) return
    const { error: err } = await supabase.from('publicadores').delete().eq('id', editandoId)
    if (err) {
      alert(t('publicadores.noSePudoEliminar') + err.message)
      return
    }
    setMostrarForm(false)
    setForm(vacio)
    setEditandoId(null)
    cargar()
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return publicadores
      .filter((p) => mostrarInactivos || p.activo)
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))
      .filter((p) => {
        if (!grupoFiltro) return true
        if (grupoFiltro === 'sin_grupo') return !p.grupo_id
        return p.grupo_id === grupoFiltro
      })
  }, [publicadores, busqueda, mostrarInactivos, grupoFiltro])

  const gruposConPublicadores = useMemo(() => {
    const porGrupo = new Map()
    grupos.forEach((g) => porGrupo.set(g.id, { id: g.id, nombre: g.nombre, items: [] }))
    porGrupo.set('sin_grupo', { id: 'sin_grupo', nombre: t('publicadores.sinGrupo'), items: [] })

    filtrados.forEach((p) => {
      const key = p.grupo_id || 'sin_grupo'
      if (!porGrupo.has(key)) porGrupo.set(key, { id: key, nombre: p.grupos?.nombre || t('publicadores.sinGrupo'), items: [] })
      porGrupo.get(key).items.push(p)
    })

    return Array.from(porGrupo.values()).filter((g) => g.items.length > 0)
  }, [filtrados, grupos, t])

  const sinEmail = publicadores.filter((p) => p.activo && !p.email).length

  const nombreGrupoFiltro = grupoFiltro === 'sin_grupo'
    ? t('publicadores.sinGrupo')
    : grupos.find((g) => g.id === grupoFiltro)?.nombre || ''

  function imprimir() {
    window.print()
  }

  if (!esEditor) {
    return (
      <>
        <p className="text-ink-soft text-sm">{t('publicadores.soloSecretario')}</p>
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-1 no-print">
        <h1 className="font-display text-2xl font-semibold">{t('publicadores.titulo')}</h1>
        <div className="flex gap-2">
          <button onClick={imprimir} className="font-mono text-xs border border-petrol/30 text-petrol px-3 py-1.5 rounded-md hover:bg-petrol/10 transition-colors">
            {t('publicadores.imprimir')}
          </button>
          <button onClick={nuevo} className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark transition-colors">
            {t('comun.nuevo')}
          </button>
        </div>
      </div>
      <p className="text-sm text-ink-soft mb-6 no-print">
        {publicadores.length} {t('publicadores.enTotal')}{sinEmail > 0 && ` · ${sinEmail} ${t('publicadores.activosSinEmail')}`}
      </p>

      <div className="print-only mb-6">
        <h1 className="font-display text-2xl font-semibold">{t('publicadores.titulo')}{nombreGrupoFiltro && ` — ${nombreGrupoFiltro}`}</h1>
        <p className="text-sm text-ink-soft">
          {filtrados.length} {t('publicadores.publicadoresLabel')} · {new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} className="no-print mb-6 border border-ink/10 rounded-lg bg-white p-4 flex flex-col gap-3">
          {error && <p className="text-sm text-clay">{error}</p>}
          <input
            required
            placeholder={t('publicadores.nombreCompleto')}
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <div className="flex gap-3">
            <input
              type="email"
              placeholder={t('publicadores.emailNotificaciones')}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
            <input
              placeholder={t('publicadores.telefono')}
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
          </div>
          <input
            placeholder={t('publicadores.direccion')}
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <div className="flex gap-3">
            <input
              placeholder={t('publicadores.numeroDocumento')}
              value={form.numero_documento}
              onChange={(e) => setForm({ ...form, numero_documento: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
            <input
              placeholder={t('publicadores.cpf')}
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
          </div>
          <div className="flex gap-3 items-center">
            <select
              value={form.servicio}
              onChange={(e) => setForm({ ...form, servicio: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            >
              {CLAVES_SERVICIOS.map((clave) => (
                <option key={clave} value={clave}>{t(`publicadores.servicio_${clave}`)}</option>
              ))}
            </select>
            <select
              value={form.grupo_id}
              onChange={(e) => setForm({ ...form, grupo_id: e.target.value })}
              className="flex-1 border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            >
              <option value="">{t('publicadores.sinGrupo')}</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-ink-soft shrink-0">
              <input type="checkbox" checked={!form.activo} onChange={(e) => setForm({ ...form, activo: !e.target.checked })} />
              {t('publicadores.inactivo')}
            </label>
          </div>
          <textarea
            placeholder={t('publicadores.notas')}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            rows={2}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="bg-petrol text-paper rounded-md px-4 py-2 text-sm hover:bg-petrol-dark transition-colors disabled:opacity-50">
              {guardando ? t('publicadores.guardando') : t('comun.guardar')}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)} className="text-ink-soft text-sm px-4 py-2 hover:text-ink">
              {t('comun.cancelar')}
            </button>
            {editandoId && (
              <button type="button" onClick={eliminar} className="text-clay text-sm px-4 py-2 hover:text-clay/80 ml-auto">
                {t('publicadores.borrarPublicador')}
              </button>
            )}
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4 no-print">
        <input
          placeholder={t('publicadores.buscar')}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 min-w-[200px] border border-ink/15 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
        />
        <select
          value={grupoFiltro}
          onChange={(e) => setGrupoFiltro(e.target.value)}
          className="border border-ink/15 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
        >
          <option value="">{t('publicadores.todosLosGrupos')}</option>
          <option value="sin_grupo">{t('publicadores.sinGrupo')}</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>{g.nombre}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-soft shrink-0">
          <input type="checkbox" checked={mostrarInactivos} onChange={(e) => setMostrarInactivos(e.target.checked)} />
          {t('publicadores.mostrarInactivos')}
        </label>
      </div>

      {cargando && <p className="text-ink-soft text-sm no-print">{t('comun.cargando')}</p>}
      {!cargando && gruposConPublicadores.length === 0 && <p className="text-ink-soft text-sm">{t('publicadores.sinPublicadores')}</p>}

      <div className="flex flex-col gap-6">
        {gruposConPublicadores.map((g) => (
          <div key={g.id} className="break-inside-avoid">
            <h2 className="font-mono text-xs uppercase tracking-wide text-petrol font-semibold border-b border-ink/10 pb-1 mb-3">
              {g.nombre} <span className="text-ink-soft normal-case">· {g.items.length}</span>
            </h2>
            <div className="flex flex-col gap-3">
              {g.items.map((p) => (
                <div key={p.id} className={`border rounded-lg bg-white p-4 ${p.activo ? 'border-ink/10' : 'border-ink/10 opacity-60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display font-semibold">
                        {p.nombre} <span className="font-mono text-xs text-ink-soft">· {etiquetaServicio(p.servicio)}</span>
                      </p>
                      <p className="text-sm text-ink-soft mt-0.5">
                        {p.email || <span className="text-clay">{t('publicadores.sinEmail')}</span>}
                        {p.telefono && ` · ${p.telefono}`}
                      </p>
                      {!p.activo && <p className="font-mono text-xs text-gold mt-0.5">{t('publicadores.inactivo')}</p>}
                    </div>
                    <div className="flex gap-2 font-mono text-xs text-ink-soft shrink-0 no-print">
                      <button onClick={() => editar(p)} className="hover:text-petrol">{t('comun.editar')}</button>
                    </div>
                  </div>
                  {p.notas && <p className="text-sm text-ink-soft mt-2">{p.notas}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
