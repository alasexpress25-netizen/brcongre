// Set de íconos de línea, dibujados a mano en SVG, para el menú lateral.
// Todos usan currentColor para heredar el color del texto/estado activo.

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function IconVidaMinisterio(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5.5c-1.4-1.1-3.4-1.6-5.2-1.3-.7.1-1.3.7-1.3 1.4v11c0 .9.8 1.5 1.6 1.4 1.7-.3 3.6.2 4.9 1.2m0-13.7c1.4-1.1 3.4-1.6 5.2-1.3.7.1 1.3.7 1.3 1.4v11c0 .9-.8 1.5-1.6 1.4-1.7-.3-3.6.2-4.9 1.2m0-13.7v13.7" />
    </svg>
  )
}

export function IconReunionPublica(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v2.2M8.5 6.4a3.5 3.5 0 1 1 7 0c0 2.2-1.6 3-2.3 4.4-.3.6-.2 1.2-.2 1.9" />
      <path d="M8 12.8h8l1.4 6.4c.1.5-.3 1-.8 1H7.4c-.5 0-.9-.5-.8-1z" />
      <path d="M9.8 15.3h4.4" />
    </svg>
  )
}

export function IconPredicacion(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 10.5 12 5l7 5.5" />
      <path d="M6.5 9.3V18a1 1 0 0 0 1 1H10v-4.2c0-.6.5-1 1-1h2c.6 0 1 .4 1 1V19h2.5a1 1 0 0 0 1-1V9.3" />
      <path d="m15.2 9.6.9-2.6" />
    </svg>
  )
}

export function IconAnuncios(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 10v3.4a1 1 0 0 0 1 1h1.4l1.8 3.7c.3.6 1 .8 1.6.5l.4-.2c.5-.3.7-.9.5-1.5l-1-2.5H14V6.5L6.9 9H5a1 1 0 0 0-1 1Z" />
      <path d="M14 6.5c2.6-1 4.8-1 6-1v9c-1.2 0-3.4 0-6-1" />
      <path d="M17.5 9.7h2.3M17.2 6.6l1.9-1.3M17.2 12.8l1.9 1.3" />
    </svg>
  )
}

export function IconCalendario(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="5.3" width="16" height="14.5" rx="1.6" />
      <path d="M4 9.3h16M8 3.5v3M16 3.5v3" />
      <path d="M7.8 13h2.2v2.1H7.8zM12 13h2.2v2.1H12z" />
    </svg>
  )
}

export function IconLimpieza(props) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 3.7 17.5 6.7 9.3 15c-.4.4-1 .6-1.6.5l-2-.3-.3-2c-.1-.6.1-1.2.5-1.6z" />
      <path d="M12.7 5.5l2 2M5 19.5c.6-2 1.7-3 3.6-3.4" />
      <path d="M3.7 19.7c1.4.6 3 .6 4.3-.2" />
    </svg>
  )
}

export function IconMisAsignaciones(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5.5" y="4.5" width="13" height="16" rx="1.6" />
      <path d="M9 4.5V3.8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.7" />
      <path d="m8.7 12.3 1.9 1.9 3.7-4" />
      <path d="M8.5 17h7" />
    </svg>
  )
}

export function IconInforme(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3.8h7.3L18 7.5v12.7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.8a1 1 0 0 1 1-1Z" />
      <path d="M14 3.8v3.4a.5.5 0 0 0 .5.5H18" />
      <path d="M8.7 12.2h6.6M8.7 14.7h6.6M8.7 17.2h4.2" />
    </svg>
  )
}

export function IconPrecursorAuxiliar(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.4 13.7 8l4.8.4-3.6 3.2 1.1 4.7L12 14l-4 2.3 1.1-4.7-3.6-3.2L10.3 8Z" />
    </svg>
  )
}

export function IconEntrar(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 4.5H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h3.5" />
      <path d="M13.5 8.2 17.3 12l-3.8 3.8M17 12H8.5" />
    </svg>
  )
}

export function IconCambiarIdentidad(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 7a3.3 3.3 0 1 1 0 6.6A3.3 3.3 0 0 1 12 7Z" />
      <path d="M5.5 19c.8-2.8 3.2-4.4 6.5-4.4s5.7 1.6 6.5 4.4" />
      <path d="M18.5 4.7 19.8 6l-1.3 1.3M19.6 5.9h-3.4" />
    </svg>
  )
}

// Logo diamante para la cabecera del menú lateral (estilo del boceto).
export function IconLogo(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 2.2 21 12l-9 9.8L3 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 6.6 16.8 12 12 17.5 7.2 12Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

// Gráfico decorativo para el pie del menú lateral (librito abierto con destellos).
export function DecoracionLateral(props) {
  return (
    <svg viewBox="0 0 96 70" fill="none" {...props}>
      <path
        d="M48 16c-5-5-13-7-20-6-1.6.3-2.8 1.7-2.8 3.3v34c0 2.1 1.9 3.6 3.9 3.3 6-1 13.4.6 19 4.4M48 16c5-5 13-7 20-6 1.6.3 2.8 1.7 2.8 3.3v34c0 2.1-1.9 3.6-3.9 3.3-6-1-13.4.6-19 4.4M48 16v39"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M48 4v5M40 6.5l2.5 4.2M56 6.5 53.5 10.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="14" cy="12" r="1.4" fill="currentColor" opacity="0.5" />
      <circle cx="83" cy="20" r="1.8" fill="currentColor" opacity="0.4" />
      <circle cx="8" cy="40" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="88" cy="46" r="1.4" fill="currentColor" opacity="0.5" />
    </svg>
  )
}
