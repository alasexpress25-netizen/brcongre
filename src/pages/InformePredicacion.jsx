import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useI18n } from '../lib/i18n/I18nContext'
import { supabase } from '../lib/supabaseClient'

function mesesDisponibles(locale) {
  const opciones = []
  const hoy = new Date()
  for (let i = -1; i <= 0; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1)
    opciones.push({
      mes: d.getMonth() + 1,
      anio: d.getFullYear(),
      label: d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    })
  }
  return opciones.reverse()
}

export default function InformePredicacion() {
  const { t, locale } = useI18n()
  const [publicadores, setPublicadores] = useState([])
  const meses = mesesDisponibles(locale())

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
      .from('publicadores')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => setPublicadores(data || []))
  }, [])

  async function enviar(e) {
    e.preventDefault()
    if (!form.publicador_id) {
      setError(t('informePredicacion.elegiNombre'))
      return
    }
    setError('')
    setEnviando(true)
    const [mes, anio] = form.mesAnio.split('-').map(Number)
    const { error: err } = await supabase.rpc('enviar_informe_predicacion', {
      p_publicador_id: form.publicador_id,
      p_mes: mes,
      p_anio: anio,
      p_precursor_auxiliar: form.precursor_auxiliar,
      p_participo: form.participo,
      p_cursos_biblicos: Number(form.cursos_biblicos) || 0,
      p_comentarios: form.comentarios || null,
    })
    setEnviando(false)
    if (err) {
      console.error('Error al enviar informe de predicación:', err)
      setError(
        err.code === '42501' || err.message?.toLowerCase().includes('row-level security')
          ? t('informePredicacion.sinPermiso')
          : `${t('informePredicacion.errorGenerico')} ${err.message || t('informePredicacion.probaDeNuevo')}`
      )
      return
    }
    setEnviado(true)
  }

  return (
    <Layout>
      <h1 className="font-display text-2xl font-semibold mb-6">{t('informePredicacion.titulo')}</h1>

      {enviado ? (
        <div className="border border-petrol/20 rounded-lg bg-petrol/5 p-6 text-center">
          <p className="text-lg mb-2">{t('informePredicacion.enviadoTitulo')}</p>
          <p className="text-sm text-ink-soft">{t('informePredicacion.enviadoTexto')}</p>
          <button
            onClick={() => setEnviado(false)}
            className="mt-4 font-mono text-xs text-petrol underline decoration-petrol/40 hover:text-petrol-dark"
          >
            {t('informePredicacion.enviarOtro')}
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} className="border border-ink/10 rounded-lg bg-white p-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm text-ink-soft mb-1">{t('informePredicacion.nombre')}</label>
            <select
              required
              value={form.publicador_id}
              onChange={(e) => setForm({ ...form, publicador_id: e.target.value })}
              className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            >
              <option value="">{t('informePredicacion.seleccione')}</option>
              {publicadores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-ink-soft mb-1">{t('informePredicacion.mes')}</label>
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
            <span className="text-sm">{t('informePredicacion.precursorAuxiliar')}</span>
            <input
              type="checkbox"
              checked={form.precursor_auxiliar}
              onChange={(e) => setForm({ ...form, precursor_auxiliar: e.target.checked })}
              className="w-5 h-5 accent-petrol"
            />
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm">{t('informePredicacion.marqueSiParticipo')}</span>
            <input
              type="checkbox"
              checked={form.participo}
              onChange={(e) => setForm({ ...form, participo: e.target.checked })}
              className="w-5 h-5 accent-petrol shrink-0"
            />
          </label>

          <div>
            <label className="block text-sm font-medium mb-1">{t('informePredicacion.cursosBiblicos')}</label>
            <input
              type="number"
              min="0"
              value={form.cursos_biblicos}
              onChange={(e) => setForm({ ...form, cursos_biblicos: e.target.value })}
              className="w-full border border-ink/15 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-petrol"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-soft mb-1">{t('informePredicacion.comentarios')}</label>
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
            {enviando ? t('informePredicacion.enviando') : t('informePredicacion.enviar')}
          </button>
        </form>
      )}
    </Layout>
  )
}
