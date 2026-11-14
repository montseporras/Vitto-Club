import { inflateSync } from 'node:zlib';

// Texto de un PDF generado por PDFKit (para los tests): descomprime los streams y decodifica los textos hexadecimales
// de las fuentes estándar. Sirve para comprobar QUÉ dice el reporte, no cómo se ve.
export function pdfText(buffer: Buffer): string {
  const raw = buffer.toString('latin1');
  const texts: string[] = [];
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let content: string;
    try {
      content = inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
    } catch {
      continue;
    }
    for (const hex of content.matchAll(/<([0-9a-fA-F]+)>/g)) {
      texts.push(Buffer.from(hex[1], 'hex').toString('latin1'));
    }
  }
  // PDFKit parte el texto en trozos (kerning): se vuelven a unir sin separador
  return texts.join('');
}

export function pdfPageCount(buffer: Buffer): number {
  return Number(/\/Count (\d+)/.exec(buffer.toString('latin1'))?.[1] ?? 0);
}
