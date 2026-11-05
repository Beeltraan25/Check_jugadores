/**
 * Saca el texto de un PDF línea a línea con pdf.js (la librería de PDF de Firefox).
 * Se carga solo cuando hace falta, para no hacer más pesada la app del Marshal.
 *
 * Los PDF no guardan "líneas", sino trozos de texto con su posición. Aquí se agrupan los
 * trozos que están a la misma altura y, cuando hay un hueco grande entre dos trozos
 * (cambio de columna), se separan con varios espacios para que el intérprete lo note.
 */

interface TrozoTexto {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

const esTrozo = (item: unknown): item is TrozoTexto =>
  typeof item === 'object' && item !== null && 'str' in item && 'transform' in item;

export async function leerLineasPdf(archivo: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  const { default: urlWorker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = urlWorker;

  const tarea = pdfjs.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()), enableXfa: false });
  const documento = await tarea.promise;
  const lineas: string[] = [];
  try {
    for (let n = 1; n <= documento.numPages; n++) {
      const pagina = await documento.getPage(n);
      const contenido = await pagina.getTextContent();
      const trozos: TrozoTexto[] = [];
      for (const item of contenido.items) if (esTrozo(item) && item.str.trim() !== '') trozos.push(item);

      // Agrupar por altura (y). En PDF la y crece hacia arriba.
      const filas: { y: number; alto: number; trozos: TrozoTexto[] }[] = [];
      for (const t of trozos) {
        const y = t.transform[5];
        const alto = Math.abs(t.height) || Math.hypot(t.transform[2], t.transform[3]) || 10;
        const fila = filas.find((f) => Math.abs(f.y - y) < Math.max(f.alto, alto) * 0.5);
        if (fila) fila.trozos.push(t);
        else filas.push({ y, alto, trozos: [t] });
      }
      filas.sort((a, b) => b.y - a.y);

      for (const fila of filas) {
        fila.trozos.sort((a, b) => a.transform[4] - b.transform[4]);
        let texto = '';
        let finAnterior: number | null = null;
        for (const t of fila.trozos) {
          const x = t.transform[4];
          if (finAnterior !== null) {
            const hueco = x - finAnterior;
            if (hueco > fila.alto * 0.9) texto += '   ';
            else if (hueco > fila.alto * 0.12 && !texto.endsWith(' ') && !t.str.startsWith(' ')) texto += ' ';
          }
          texto += t.str;
          finAnterior = x + t.width;
        }
        if (texto.trim()) lineas.push(texto.trimEnd());
      }
      pagina.cleanup();
    }
  } finally {
    await tarea.destroy();
  }
  return lineas;
}
