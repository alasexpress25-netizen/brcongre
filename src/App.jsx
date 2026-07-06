import { Routes, Route } from 'react-router-dom'
import Index from './pages/Index'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Admin from './pages/Admin'
import MisAsignaciones from './pages/MisAsignaciones'
import Predicacion from './pages/Predicacion'
import VidaMinisterio from './pages/VidaMinisterio'
import ReunionPublica from './pages/ReunionPublica'
import Limpieza from './pages/Limpieza'
import Anuncios from './pages/Anuncios'
import Calendario from './pages/Calendario'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/mis-asignaciones" element={<MisAsignaciones />} />
      <Route path="/predicacion" element={<Predicacion />} />
      <Route path="/vida-ministerio" element={<VidaMinisterio />} />
      <Route path="/reunion-publica" element={<ReunionPublica />} />
      <Route path="/limpieza" element={<Limpieza />} />
      <Route path="/anuncios" element={<Anuncios />} />
      <Route path="/calendario" element={<Calendario />} />
    </Routes>
  )
}
