import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [permisos, setPermisos] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) cargarPerfil(data.session.user.id)
      else setCargando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) cargarPerfil(newSession.user.id)
      else {
        setPerfil(null)
        setPermisos(null)
        setCargando(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function cargarPerfil(userId) {
    const [{ data: perfilData }, { data: permisosData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('permisos').select('*').eq('user_id', userId).single(),
    ])
    setPerfil(perfilData)
    setPermisos(permisosData)
    setCargando(false)
  }

  async function registrarse(nombre, email, password) {
    return supabase.auth.signUp({ email, password, options: { data: { nombre } } })
  }

  async function iniciarSesion(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  async function recargar() {
    if (session) await cargarPerfil(session.user.id)
  }

  const esAdmin = perfil?.rol === 'admin'

  function puedeEditar(seccion) {
    if (esAdmin) return true
    if (!perfil?.aprobado || !permisos) return false
    return !!permisos[seccion]
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        perfil,
        permisos,
        cargando,
        registrarse,
        iniciarSesion,
        cerrarSesion,
        recargar,
        esAdmin,
        puedeEditar,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
