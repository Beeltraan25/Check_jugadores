/**
 * Saca el texto de un PDF línea a línea con pdf.js (la librería de PDF de Firefox).
 * Se carga solo cuando hace falta, para no hacer más pesada la app del Marshal.
 * Se usa la versión "legacy" de pdf.js, que funciona también en navegadores no tan nuevos
 * (por ejemplo, el ordenador de la oficina o una tablet con unos años).
 */
import { construirLineas, type TrozoTexto } from './lineasPdf';

interface ItemPdf {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

const esItem = (item: unknown): item is ItemPdf =>
  typeof item === 'object' && item !== null && 'str' in item && 'transform' in item;

export async function leerLineasPdf(archivo: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { default: urlWorker } = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = urlWorker;

  const tarea = pdfjs.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()), enableXfa: false });
  const documento = await tarea.promise;
  const lineas: string[] = [];
  try {
    for (let n = 1; n <= documento.numPages; n++) {
      const pagina = await documento.getPage(n);
      const contenido = await pagina.getTextContent();
      const trozos: TrozoTexto[] = [];
      for (const item of contenido.items) {
        if (!esItem(item)) continue;
        trozos.push({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          ancho: item.width,
          alto: Math.abs(item.height) || Math.hypot(item.transform[2], item.transform[3]) || 10,
        });
      }
      lineas.push(...construirLineas(trozos));
      pagina.cleanup();
    }
  } finally {
    await tarea.destroy();
  }
  return lineas;
}
