import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'

const vacio = { titulo: '', descripcion: '', link_url: '' }

export default function Anuncios() {
  const { puedeEditar } = useAuth()
  const esEditor = puedeEditar('anuncios')
  const [anuncios, setAnuncios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacio)
  const [editandoId, setEditandoId] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  async function cargar() {
    setCargando(true)
    const { data } = await supabase
      .from('anuncios')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('fecha_publicacion', { ascending: false })
    setAnuncios(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  function editar(a) {
    setForm({ titulo: a.titulo, descripcion: a.descripcion || '', link_url: a.link_url || '' })
    setEditandoId(a.id)
    setMostrarForm(true)
  }

  function nuevo() {
    setForm(vacio)
    setEditandoId(null)
    setMostrarForm(true)
  }

  async function guardar(e) {
    e.preventDefault()
    if (editandoId) {
      await supabase.from('anuncios').update(form).eq('id', editandoId)
    } else {
      await supabase.from('anuncios').insert(form)
    }
    setMostrarForm(false)
    setForm(vacio)
    setEditandoId(null)
    cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este anuncio?')) return
    await supabase.from('anuncios').update({ activo: false }).eq('id', id)
    cargar()
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold">Anuncios</h1>
        {esEditor && (
          <button
            onClick={nuevo}
            className="font-mono text-xs bg-petrol text-paper px-3 py-1.5 rounded-md hover:bg-petrol-dark transition-colors"
          >
            + nuevo
          </button>
        )}
      </div>

      {mostrarForm && (
        <form onSubmit={guardar} className="mb-6 border border-ink/10 rounded-lg bg-white p-4 flex flex-col gap-3">
          <input
            required
            placeholder="Título"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <textarea
            placeholder="Descripción (opcional)"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            rows={2}
          />
          <input
            placeholder="Link al documento (Drive, PDF, etc.)"
            value={form.link_url}
            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
            className="border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
          />
          <div className="flex gap-2">
            <button type="submit" className="bg-petrol text-paper rounded-md px-4 py-2 text-sm hover:bg-petrol-dark transition-colors">
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="text-ink-soft text-sm px-4 py-2 hover:text-ink transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando && <p className="text-ink-soft text-sm">Cargando…</p>}
      {!cargando && anuncios.length === 0 && (
        <p className="text-ink-soft text-sm">No hay anuncios publicados por el momento.</p>
      )}

      <div className="flex flex-col gap-3">
        {anuncios.map((a) => (
          <div key={a.id} className="border border-ink/10 rounded-lg bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-semibold">{a.titulo}</h3>
              {esEditor && (
                <div className="flex gap-2 font-mono text-xs text-ink-soft shrink-0">
                  <button onClick={() => editar(a)} className="hover:text-petrol">
                    editar
                  </button>
                  <button onClick={() => eliminar(a.id)} className="hover:text-clay">
                    borrar
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
                ver documento →
              </a>
            )}
          </div>
        ))}
      </div>
    </Layout>
  )
}
