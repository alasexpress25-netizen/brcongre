import { Routes, Route, Navigate } from 'react-router-dom'
import GateIdentificacion from './components/GateIdentificacion'
import PantallaInstalacion from './components/PantallaInstalacion'
import { SemanaProvider } from './lib/SemanaContext'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Admin from './pages/Admin'
import Configuracion from './pages/Configuracion'
import MiCuenta from './pages/MiCuenta'
import Publicadores from './pages/Publicadores'
import MisAsignaciones from './pages/MisAsignaciones'
import Predicacion from './pages/Predicacion'
import Territorios from './pages/Territorios'
import VidaMinisterio from './pages/VidaMinisterio'
import ReunionPublica from './pages/ReunionPublica'
import Limpieza from './pages/Limpieza'
import Anuncios from './pages/Anuncios'
import Calendario from './pages/Calendario'
import InformePredicacion from './pages/InformePredicacion'
import PrecursorAuxiliar from './pages/PrecursorAuxiliar'
import Informes from './pages/Informes'

export default function App() {
  return (
    <PantallaInstalacion>
      <GateIdentificacion>
        <SemanaProvider>
          <Routes>
          <Route path="/" element={<MisAsignaciones />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/mi-cuenta" element={<MiCuenta />} />
          <Route path="/publicadores" element={<Publicadores />} />
          <Route path="/mis-asignaciones" element={<Navigate to="/" replace />} />
          <Route path="/predicacion" element={<Predicacion />} />
          <Route path="/territorios" element={<Territorios />} />
          <Route path="/vida-ministerio" element={<VidaMinisterio />} />
          <Route path="/reunion-publica" element={<ReunionPublica />} />
          <Route path="/limpieza" element={<Limpieza />} />
          <Route path="/anuncios" element={<Anuncios />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/informe-predicacion" element={<InformePredicacion />} />
          <Route path="/precursor-auxiliar" element={<PrecursorAuxiliar />} />
          <Route path="/informes" element={<Informes />} />
          </Routes>
        </SemanaProvider>
      </GateIdentificacion>
    </PantallaInstalacion>
  )
}
