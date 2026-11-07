import { Route, Routes } from 'react-router';
import { DatosProvider } from './datos/DatosProvider';
import { useSesion } from './datos/sesion';
import { AvisoFlotante } from './componentes/AvisoFlotante';
import { Inicio } from './paginas/Inicio';
import { Login } from './paginas/Login';
import { MarshalLista } from './paginas/MarshalLista';
import { MarshalPartida } from './paginas/MarshalPartida';
import { Oficina } from './paginas/Oficina';
import { Calibrar } from './paginas/Calibrar';
import { Torneos } from './paginas/Torneos';
import { ImportarTorneo } from './paginas/ImportarTorneo';
import { InformeTorneo } from './paginas/InformeTorneo';
import { InformeRitmo } from './paginas/InformeRitmo';
import { Organizadores } from './paginas/Organizadores';

export function App() {
  const sesion = useSesion();

  if (sesion.estado === 'cargando') {
    return <p className="p-8 text-center text-slate-500">Cargando…</p>;
  }
  if (sesion.estado === 'sin_sesion') return <Login />;

  return (
    <DatosProvider usuario={sesion.usuario}>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/marshal" element={<MarshalLista />} />
        <Route path="/marshal/:id" element={<MarshalPartida />} />
        <Route path="/oficina" element={<Oficina />} />
        <Route path="/calibrar" element={<Calibrar />} />
        <Route path="/torneos" element={<Torneos />} />
        <Route path="/torneos/importar" element={<ImportarTorneo />} />
        <Route path="/torneos/:id" element={<InformeTorneo />} />
        <Route path="/torneos/:id/ritmo" element={<InformeRitmo />} />
        <Route path="/organizadores" element={<Organizadores />} />
        <Route path="*" element={<Inicio />} />
      </Routes>
      <AvisoFlotante />
    </DatosProvider>
  );
}
