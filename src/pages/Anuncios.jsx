import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useI18n } from '../lib/i18n/I18nContext'
import { useSemana } from '../lib/SemanaContext'
import { supabase } from '../lib/supabaseClient'

const vacio = { titulo: '', descripcion: '', link_url: '', fecha_publicacion: '' }

export default function Anuncios() {
  const { puedeEditar } = useAuth()
  const { t } = useI18n()
  const semana = useSemana()
  const esEditor = puedeEditar('anuncios')
  const [anuncios, setAnuncios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacio)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  async function cargar() {
    setCargando(true)
    // Igual que en Vida y Ministerio: mostramos los anuncios publicados en la
    // semana elegida con las flechas del encabezado, no todos los activos.
    const { data } = await supabase
      .from('anuncios')
      .select('*')
      .eq('activo', true)
      .gte('fecha_publicacion', semana.lunesISO)
      .lte('fecha_publicacion', semana.domingoISO)
      .order('orden', { ascending: true })
      .order('fecha_publicacion', { ascending: false })
    setAnuncios(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [semana.lunesISO, semana.domingoISO])

  function editar(a) {
    setForm({ titulo: a.titulo, descripcion: a.descripcion || '', link_url: a.link_url || '', fecha_publicacion: a.fecha_publicacion || '' })
    setEditandoId(a.id)
    setMostrarForm(true)
  }

  function nuevo() {
    setForm({ ...vacio, fecha_publicacion: semana.lunesISO })
    setEditandoId(null)
    setMostrarForm(true)
  }

  async function guardar(e) {
    e.preventDefault()
    const payload = { ...form, fecha_publicacion: form.fecha_publicacion || null }
    if (editandoId) {
      await supabase.from('anuncios').update(payload).eq('id', editandoId)
    } else {
      await supabase.from('anuncios').insert(payload)
    }
    setMostrarForm(false)
    setForm(vacio)
    setEditandoId(null)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm(t('anuncios.confirmarEliminar'))) return
    await supabase.from('anuncios').update({ activo: false }).eq('id', id)
    cargar()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">{t('anuncios.titulo')}</h1>
        {esEditor && (
          <button
            onClick={nuevo}
            className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark transition-colors"
          >
            {t('comun.nuevo')}
          </button>
        )}
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} className="mb-6 border border-ink/10 rounded-lg bg-white p-4 flex flex-col gap-3">
          <input
            required
            placeholder={t('anuncios.tituloCampo')}
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <textarea
            placeholder={t('anuncios.descripcionOpcional')}
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            rows={2}
          />
          <input
            placeholder={t('anuncios.linkDocumento')}
            value={form.link_url}
            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <div>
            <label className="text-xs text-ink-soft font-mono block mb-1.5">{t('anuncios.fechaPublicacion')}</label>
            <input
              required
              type="date"
              value={form.fecha_publicacion}
              onChange={(e) => setForm({ ...form, fecha_publicacion: e.target.value })}
              className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-petrol text-paper rounded-md px-4 py-2 text-sm hover:bg-petrol-dark transition-colors">
              {t('comun.guardar')}
            </button>
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="text-ink-soft text-sm px-4 py-2 hover:text-ink transition-colors"
            >
              {t('comun.cancelar')}
            </button>
          </div>
        </form>
      )}

      {cargando && <p className="text-ink-soft text-sm">{t('comun.cargando')}</p>}
      {!cargando && anuncios.length === 0 && (
        <p className="text-ink-soft text-sm">{t('anuncios.sinAnuncios')}</p>
      )}

      <div className="flex flex-col gap-3">
        {anuncios.map((a) => (
          <div key={a.id} className="border border-ink/10 rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-semibold">{a.titulo}</h3>
              {esEditor && (
                <div className="flex gap-2 font-mono text-xs text-ink-soft shrink-0">
                  <button onClick={() => editar(a)} className="hover:text-petrol">
                    {t('comun.editar')}
                  </button>
                  <button onClick={() => eliminar(a.id)} className="hover:text-clay">
                    {t('comun.borrar')}
                  </button>
                </div>
              )}
            </div>
            {a.descripcion && <p className="text-sm text-ink-soft mt-1">{a.descripcion}</p>}
            {a.link_url && (
              <a
                href={a.link_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-2 font-mono text-xs text-petrol underline decoration-gold/50 hover:text-petrol-dark"
              >
                {t('comun.verDocumento')}
              </a>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
