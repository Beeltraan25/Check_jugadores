import { useState, type FormEvent } from 'react';
import { iniciarSesion } from '../datos/sesion';

/** Acceso para el personal (las cuentas se crean en Supabase → Authentication → Users). */
export function Login() {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(await iniciarSesion(email.trim(), contrasena));
    setEnviando(false);
  };

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={entrar} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-xl">
        <div className="text-center">
          <img src="/icono.svg" alt="" className="mx-auto h-14 w-14" />
          <h1 className="mt-3 text-2xl font-black text-campo-900">Ritmo de juego</h1>
          <p className="text-sm text-slate-500">Acceso del personal</p>
        </div>
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-slate-300 px-3"
          />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            required
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-slate-300 px-3"
          />
        </label>
        {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="min-h-12 w-full rounded-xl bg-campo-700 font-bold text-white shadow hover:bg-campo-800 disabled:opacity-60"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
