/** Sesión de usuario: con Supabase hay que iniciar sesión; en modo demo no. */
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type EstadoSesion =
  | { estado: 'cargando' }
  | { estado: 'sin_sesion' }
  | { estado: 'con_sesion'; usuario: string };

const nombreUsuario = (sesion: Session) =>
  (sesion.user.user_metadata?.nombre as string | undefined) ?? sesion.user.email ?? 'Usuario';

export function useSesion(): EstadoSesion {
  const [sesion, setSesion] = useState<EstadoSesion>(() =>
    supabase ? { estado: 'cargando' } : { estado: 'con_sesion', usuario: 'Marshal (demo)' },
  );

  useEffect(() => {
    if (!supabase) return;
    const actualizar = (s: Session | null) =>
      setSesion(s ? { estado: 'con_sesion', usuario: nombreUsuario(s) } : { estado: 'sin_sesion' });
    void supabase.auth.getSession().then(({ data }) => actualizar(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => actualizar(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return sesion;
}

export async function iniciarSesion(email: string, contrasena: string): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase.auth.signInWithPassword({ email, password: contrasena });
  if (!error) return null;
  // 400 = credenciales malas; cualquier otra cosa suele ser falta de conexión o servidor caído.
  return error.status === 400 ? 'Email o contraseña incorrectos.' : 'No se pudo conectar con el servidor. Revisa la conexión.';
}

export async function cerrarSesion() {
  // La copia para abrir sin cobertura lleva nombres de jugadores: no se deja en el dispositivo.
  try {
    localStorage.removeItem('ritmo-golf:copia-datos');
  } catch {
    /* nada */
  }
  await supabase?.auth.signOut();
}
