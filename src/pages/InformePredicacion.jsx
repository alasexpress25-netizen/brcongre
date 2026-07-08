import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'

function mesesDisponibles() {
  const opciones = []
  const hoy = new Date()
  for (let i = -1; i <= 0; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1)
    opciones.push({
      mes: d.getMonth() + 1,
      anio: d.getFullYear(),
      label: d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
    })
  }
  return opciones.reverse()
}

export default function InformePredicacion() {
  const [publicadores, setPublicadores] = useState([])
  const meses = mesesDisponibles()

  const [form, setForm] = useState({
    publicador_id: '',
    mesAnio: `${meses[0].mes}-${meses[0].anio}`,
    precursor_auxiliar: false,
    participo: false,
    cursos_biblicos: 0,
    comentarios: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, nombre')
      .order('nombre')
      .then(({ data }) => setPublicadores(data || []))
  }, [])

  async function enviar(e) {
    e.preventDefault()
    if (!form.publicador_id) {
      setError('Elegí tu nombre antes de enviar.')
      return
    }
    setError('')
    setEnviando(true)
    const [mes, anio] = form.mesAnio.split('-').map(Number)
    const { error: err } = await supabase.from('informes_predicacion').upsert(
      {
        publicador_id: form.publicador_id,
        mes,
        anio,
        precursor_auxiliar: form.precursor_auxiliar,
        participo: form.participo,
        cursos_biblicos: Number(form.cursos_biblicos) || 0,
        comentarios: form.comentarios || null,
      },
      { onConflict: 'publicador_id,mes,anio' }
    )
    setEnviando(false)
    if (err) {
      setError('No se pudo enviar el informe. Probá de nuevo.')
      return
    }
    setEnviado(true)
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold mb-6">Informe de Predicación</h1>

      {enviado ? (
        <div className="border border-petrol/20 rounded-lg bg-petrol/5 p-6 text-center">
          <p className="text-lg mb-2">✅ ¡Informe enviado!</p>
          <p className="text-sm text-ink-soft">Gracias por completar tu informe de predicación.</p>
          <button
            onClick={() => setEnviado(false)}
            className="mt-4 font-mono text-xs text-petrol underline decoration-petrol/40 hover:text-petrol-dark"
          >
            enviar otro informe
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} className="border border-ink/10 rounded-lg bg-white p-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm text-ink-soft mb-1">Nombre</label>
            <select
              required
              value={form.publicador_id}
              onChange={(e) => setForm({ ...form, publicador_id: e.target.value })}
              className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            >
              <option value="">-Seleccione-</option>
              {publicadores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-ink-soft mb-1">Mes</label>
            <select
              value={form.mesAnio}
              onChange={(e) => setForm({ ...form, mesAnio: e.target.value })}
              className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol capitalize"
            >
              {meses.map((m) => (
                <option key={`${m.mes}-${m.anio}`} value={`${m.mes}-${m.anio}`} className="capitalize">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm">Precursor auxiliar</span>
            <input
              type="checkbox"
              checked={form.precursor_auxiliar}
              onChange={(e) => setForm({ ...form, precursor_auxiliar: e.target.checked })}
              className="w-5 h-5 accent-petrol"
            />
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm">Marque la casilla si participó en alguna faceta de la predicación durante el mes</span>
            <input
              type="checkbox"
              checked={form.participo}
              onChange={(e) => setForm({ ...form, participo: e.target.checked })}
              className="w-5 h-5 accent-petrol shrink-0"
            />
          </label>

          <div>
            <label className="block text-sm font-medium mb-1">Cursos Bíblicos</label>
            <input
              type="number"
              min="0"
              value={form.cursos_biblicos}
              onChange={(e) => setForm({ ...form, cursos_biblicos: e.target.value })}
              className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-soft mb-1">Comentarios</label>
            <textarea
              placeholder="..."
              value={form.comentarios}
              onChange={(e) => setForm({ ...form, comentarios: e.target.value })}
              className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-clay">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="bg-petrol text-paper rounded-md px-4 py-2.5 text-sm font-medium hover:bg-petrol-dark transition-colors disabled:opacity-60"
          >
            {enviando ? 'Enviando…' : 'Enviar'}
          </button>
        </form>
      )}
    </Layout>
  )
}
