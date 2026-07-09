import { createContext, useContext, useEffect, useState } from 'react'
import { es } from './es'
import { pt } from './pt'

const DICCIONARIOS = { es, pt }
const LOCALES = { es: 'es-AR', pt: 'pt-BR' }
const CLAVE_STORAGE = 'idioma'

const I18nContext = createContext(null)

function detectarIdiomaInicial() {
  const guardado = localStorage.getItem(CLAVE_STORAGE)
  if (guardado === 'es' || guardado === 'pt') return guardado
  const navegador = navigator.language || 'es'
  return navegador.toLowerCase().startsWith('pt') ? 'pt' : 'es'
}

function buscar(diccionario, clave) {
  return clave.split('.').reduce((obj, parte) => (obj ? obj[parte] : undefined), diccionario)
}

export function I18nProvider({ children }) {
  const [idioma, setIdiomaState] = useState(detectarIdiomaInicial)

  useEffect(() => {
    localStorage.setItem(CLAVE_STORAGE, idioma)
    document.documentElement.lang = idioma === 'pt' ? 'pt-BR' : 'es'
  }, [idioma])

  function setIdioma(nuevo) {
    if (nuevo === 'es' || nuevo === 'pt') setIdiomaState(nuevo)
  }

  function t(clave, variables) {
    const valor = buscar(DICCIONARIOS[idioma], clave) ?? buscar(DICCIONARIOS.es, clave) ?? clave
    if (!variables) return valor
    return Object.entries(variables).reduce((str, [k, v]) => str.replaceAll(`{${k}}`, v), valor)
  }

  function locale() {
    return LOCALES[idioma]
  }

  return (
    <I18nContext.Provider value={{ idioma, setIdioma, t, locale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
