const OPCIONES_CORTAS = { day: 'numeric', month: 'short' }

export function lunesDe(fecha) {
  const d = new Date(fecha)
  const dia = (d.getDay() + 6) % 7 // lunes = 0
  d.setDate(d.getDate() - dia)
  d.setHours(0, 0, 0, 0)
  return d
}

export function sumarDias(fecha, dias) {
  const d = new Date(fecha)
  d.setDate(d.getDate() + dias)
  return d
}

export function toISO(d) {
  return d.toISOString().slice(0, 10)
}

export function formatearRango(lunes, domingo, locale) {
  return `${lunes.toLocaleDateString(locale, OPCIONES_CORTAS)} — ${domingo.toLocaleDateString(locale, OPCIONES_CORTAS)}`
}

export function formatearFechaCorta(f, locale) {
  return new Date(f + 'T00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })
}
