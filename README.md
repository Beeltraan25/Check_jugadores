# ⛳ Ritmo de juego

WebApp para controlar el ritmo de juego de un campo de golf en tiempo real.

- **Marshal** (móvil o tablet, en el campo): empieza la revisión de una partida, toca el hoyo y la posición (tee, 2º golpe, 3er golpe, green) y la app guarda la hora exacta y le dice al momento si van **en tiempo (verde)** o **lentos (ámbar/rojo)**. También apunta alquileres (carro eléctrico o buggy con su nº) y observaciones.
- **Caddy Master** (ordenador, en la oficina): ve en directo un **mapa del campo con un pin por partida**, indicadores del día, la lista de partidas y da de alta las salidas.
- **Torneos**: se importa el **PDF del horario de salidas** y cada torneo queda guardado con todo lo que se registró (avistamientos, alquileres, observaciones). Cada torneo tiene su **informe** (retraso por hoyo, partidas que llegaron a rojo…) y se exporta a **Excel**.

Regla de ritmo: **15 minutos por hoyo** desde la hora de salida (salida 10:00 → hoyo 1 terminado a las 10:15, hoyo 2 a las 10:30…). Colores: 🟢 hasta +5 min de retraso, 🟠 de +6 a +14 min, 🔴 desde +15 min. Admite salidas por el tee del 1 y del 10 y salidas a tiro (cada partida por un tee del 1 al 18).

📐 Arquitectura, base de datos y lógica del cálculo explicadas en **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)**.

## Probarlo en 1 minuto (modo demo, sin base de datos)

Necesitas [Node.js](https://nodejs.org) 22 o superior.

```bash
npm install
```

```bash
npm run dev
```

Abre http://localhost:5173. Sin configurar Supabase, la app arranca en **modo demo** con partidas de prueba generadas alrededor de la hora actual. Abre `/oficina` en una pestaña y `/marshal` en otra: lo que registres como Marshal aparece al instante en la oficina.

Para probarlo en el móvil dentro de tu red WiFi: `npm run dev -- --host` y abre la IP que aparece. (En modo demo cada dispositivo tiene sus propios datos. Para compartirlos entre dispositivos, conecta Supabase.)

## Conectar Supabase (tiempo real entre dispositivos)

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**. Opcional: ejecuta también [`supabase/datos-prueba.sql`](supabase/datos-prueba.sql).
3. **Authentication → Users → Add user**: crea una cuenta para cada Marshal y para la oficina (email + contraseña). Si quieres que se vea el nombre en el historial, añade `{"nombre": "Marshal Juan"}` en *User metadata*.
4. **Project Settings → API**: copia la URL y la clave pública (*anon* o *publishable*).
5. En la carpeta del proyecto copia `.env.example` como `.env.local` y rellénalo:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-publica
   ```

6. Reinicia `npm run dev`. Ahora la app pide iniciar sesión y todo se sincroniza en tiempo real entre todos los dispositivos.

> La clave pública puede ir en la web sin problema: la seguridad la ponen las políticas RLS del `schema.sql` (solo el personal con sesión iniciada puede leer y escribir). **Nunca** pongas la clave `service_role` en el frontend.

## Torneos: importar el PDF de salidas

1. **Torneos → Importar horario (PDF)** y elige el PDF del torneo.
2. La app saca el nombre, la fecha y las partidas (hora, tee y jugadores). Lee tanto listas de una columna como horarios con dos columnas de partidas en paralelo (como el de la Copa Corporate). Revisa la lista: puedes corregir nombres, horas o tees, añadir o quitar partidas. Si alguna línea parece un jugador sin partida, te avisa.
3. **Guardar torneo y usarlo**: pasa a ser el torneo en uso en la oficina y en los móviles de los Marshal.

Cada torneo guarda todo lo que se apunta durante el juego. Desde **Torneos** puedes:

- **Usar** otro torneo (cada dispositivo usa por defecto el torneo abierto más reciente).
- **Ver informe**: partidas, jugadores, avistamientos, retraso medio, partidas que llegaron a rojo, buggies y carros, retraso medio por hoyo y el historial completo de cada partida.
- **Exportar a Excel** (CSV): una hoja con una fila por partida y otra con todos los tiempos.
- **Cerrar** el torneo al acabar (sigue guardado) o **eliminarlo**.

Si el PDF es una foto escaneada (sin texto), no se puede leer: pega el texto en el recuadro de la misma pantalla o crea el torneo vacío y añade las partidas a mano.

## Salidas normales (días sin torneo)

Para medir también el ritmo del juego de cada día:

- En **Inicio** (o en *Torneos y salidas*) pulsa **Salidas normales de hoy**. Se crea la jornada del día (una por día) y pasa a ser lo que se usa en ese dispositivo. Si dos dispositivos lo pulsan a la vez, comparten la misma.
- Cada partida se apunta en dos toques: **+ Salida** (también desde el móvil del Marshal) y **Apuntar salida**. La hora es la actual, el tee el 1 y el nº de jugadores se elige con un toque; los nombres son opcionales.
- También se puede **importar el PDF** del horario de un día eligiendo «Salidas normales de un día».
- Si el mismo día hay torneo y juego normal, en Inicio se cambia de uno a otro con un botón.
- Las salidas tienen su **informe de ritmo** igual que un torneo y, en *Comparar organizadores*, aparecen aparte como **referencia** («un día de juego normal») para saber si un organizador juega más rápido o más lento que lo habitual.

No hay que cambiar nada en la base de datos: la jornada de salidas se guarda como un torneo con un identificador fijo para cada fecha (ver `src/lib/jornadas.ts`).

## Ronda de revisión del Marshal

1. En la pantalla del Marshal, pulsa **Empezar ronda de revisión** (una sola vez para todas las partidas).
2. Entra en una partida, elige el hoyo y **toca la posición**: se apunta la hora en ese momento. No hay que pulsar nada más.
3. Pulsa **Siguiente partida sin ver** para saltar a la siguiente (por orden de tee). En la lista, cada partida pone *✓ Vista en esta ronda* o *Falta por ver*, y arriba sale cuántas llevas.
4. Si te equivocas: **🗑 Borrar esta revisión** justo después de apuntarla, o la papelera de cualquier revisión en el historial de la partida.

La lista del Marshal se ordena por defecto **por tee: 1, 18, 17, 16… hasta el 2** (también se puede por hora o por urgencia).

## Otras ayudas del día a día

- **Aviso de partida en rojo (oficina):** cuando una vista nueva pone a una partida con 15 min o más de retraso, sale un aviso en pantalla con el botón *Ver partida*. Con el botón 🔔 de la cabecera, además suena.
- **Más urgentes primero (Marshal):** la lista se puede ordenar con las partidas rojas arriba y, después, las que llevan más tiempo sin que nadie las vea.
- **Corregir hora o tee:** en la ficha de cualquier partida. Los retrasos de las vistas ya registradas se recalculan solos.
- **Versión nueva:** si se publica una actualización con la app abierta, aparece un aviso con el botón *Actualizar*.

## Informes de ritmo sin nombres y comparativa de organizadores

Cada torneo tiene un **organizador** (empresa, agencia, club…). Se indica al importar el PDF o al crear el torneo, y se puede cambiar después desde la lista de torneos o desde cualquier informe. La app sugiere los organizadores ya usados para que se escriban siempre igual.

- **Informe de ritmo (sin nombres)** de cada torneo (Torneos → *Informe de ritmo*): cada partida sale como "Partida 05 · 09:30 · tee 4", sin jugadores. Incluye:
  - Conclusión automática: ritmo medio, cuánto se pasaron de las 4 h 30 min, partidas en rojo, avisos y hoyo con más retraso.
  - Indicadores, retraso medio por hoyo y partidas más lentas y más rápidas.
  - Tabla de todas las partidas: ritmo real (min/hoyo), duración de la vuelta, retraso medio, peor retraso, evolución (si fueron perdiendo o recuperando tiempo) y estado final.
  - Detalle de cada partida con **todas las vistas** del Marshal y sus **observaciones**. Los nombres que aparezcan en ellas se cambian por «[jugador]».
  - Botones para **imprimir o guardar en PDF** y **Excel** (partidas y todas las vistas).
- **Comparar organizadores** (Torneos → *Comparar organizadores*): junta todos los torneos de cada organizador y los ordena **del más rápido al más lento**, con ritmo medio, vuelta media, retraso final medio, % de partidas que llegaron a rojo y partidas avisadas. Se puede filtrar por fechas, imprimir y exportar a Excel.

Cómo se mide el ritmo de una partida: con la última vista del Marshal se compara el tiempo que llevaban jugando con el que deberían llevar para estar en ese punto del campo a 15 min por hoyo. Si la partida se marcó como terminada, se usa la duración real.

> **Si ya tenías la base de datos creada antes del 7/11/2026**, ejecuta una vez en Supabase → SQL Editor el archivo [`supabase/migraciones/2026-11-07_organizador.sql`](supabase/migraciones/2026-11-07_organizador.sql), que añade la columna `organizador`.

## El mapa del campo

Ya está puesto el mapa de Montealvar (`public/mapa-campo.png`), con el tee y el green de cada hoyo situados en [`src/config/campo.ts`](src/config/campo.ts) y los **par** de la tarjeta del campo (ida 36 + vuelta 36 = 72).

Para cambiar de imagen (por ejemplo, una con más resolución):

1. Copia la imagen en `public/` y cambia `MAPA.url` en `campo.ts` (y el nombre del club).
2. Abre la app en **`/calibrar`**: haz clic en el tee y en el green de cada hoyo, en orden. Al acabar, copia el código que te genera y sustituye el array `HOYOS`.

En hoyos con dogleg (ahora el 4 y el 11) los puntos del 2º y 3er golpe se fijan a mano con `segundo` y `tercero`; en el resto se calculan solos entre el tee y el green.

## Ajustar el ritmo

En [`src/lib/ritmo.ts`](src/lib/ritmo.ts), `CONFIG_RITMO`:

- `minutosPorHoyo`: 15 en todos los hoyos (puedes poner, por ejemplo, 12 en los par 3 y 17 en los par 5).
- `tramos`: qué parte del hoyo corresponde a tee, 2º golpe, 3er golpe y green.
- `limiteVerde` (5) y `limiteRojo` (15): **verde hasta +5 min, ámbar de +6 a +14 y rojo desde +15**. `margenAdelanto` (5): más de 5 min por delante se marca "adelantado" (también verde).

## En iPhone, iPad, Android y ordenador

Es la misma web para todos; se adapta a cada pantalla (probada en iPhone SE, iPhone 15 Pro, iPad mini, iPad y iPad Pro en horizontal, Android y ordenador). Se puede **instalar como una app**, con su icono en la pantalla de inicio y a pantalla completa:

| Dispositivo | Cómo instalarla |
| --- | --- |
| **iPhone / iPad** | Abre la web en Safari → botón **Compartir** (cuadrado con flecha ⬆) → **Añadir a pantalla de inicio**. |
| **Android** | En Chrome aparece el botón **Instalar** en la pantalla de inicio de la app (o menú ⋮ → *Instalar aplicación*). |
| **Ordenador de la oficina** | Chrome o Edge: icono de instalar en la barra de direcciones (o simplemente usarla en el navegador). |

Requisitos: iOS / iPadOS 15.4 o posterior, Android con Chrome actualizado y cualquier navegador moderno en el ordenador.

Detalles pensados para el móvil:

- En iPhone/iPad los campos no hacen zoom al tocarlos, se respetan el notch y la barra de inicio, y los botones responden al primer toque.
- El Excel del informe se **comparte** (correo, WhatsApp, Archivos…) en móvil y tablet, y se descarga en el ordenador.

## Sin cobertura en el campo

- **Abrir la app sin red:** una vez abierta con conexión, la app queda guardada en el dispositivo (service worker, `public/sw.js`) y vuelve a abrir sin cobertura. Con Supabase, además, muestra la última copia de las partidas del torneo; la copia se borra al cerrar sesión.
- **Apuntar sin red:** cada cambio del Marshal se guarda primero en el dispositivo y se envía en cuanto hay conexión. La cabecera muestra "Sin conexión" y "N sin enviar". La hora del avistamiento es la del momento del toque, aunque llegue más tarde a la oficina.

## Publicarlo

Es una web estática:

```bash
npm run build
```

Sube la carpeta `dist/` a [Vercel](https://vercel.com) o [Netlify](https://netlify.com) (importando el repositorio se detecta solo; ya incluye `vercel.json` y `public/_redirects`). Añade allí las dos variables `VITE_SUPABASE_…`. En la tablet, abre la web y usa **"Añadir a pantalla de inicio"** para tenerla como una app.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Tests de la lógica del ritmo, las operaciones, la importación del PDF y la exportación |
| `npm run typecheck` | Comprobación de tipos |
| `npm run build` | Versión para publicar en `dist/` |
