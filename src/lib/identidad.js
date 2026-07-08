const CLAVE = 'identidad_publicador'

export function getIdentidad() {
  try {
    const raw = localStorage.getItem(CLAVE)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setIdentidad(identidad) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(identidad))
  } catch {
    // localStorage puede fallar en modo privado; no es crítico
  }
}

export function limpiarIdentidad() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // no-op
  }
}
