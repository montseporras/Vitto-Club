import { PdfKitReportRenderer } from './pdfkit-report-renderer.js';
import type { ReportModel } from '../domain/report-model.js';

const sampleModel = (rows: number): ReportModel => ({
  title: 'Reporte Vitto Club',
  periodLabel: 'Noviembre 2026 (mes en curso)',
  generatedAt: '14/11/2026 15:30',
  sections: [
    {
      title: 'Clientes',
      blocks: [
        { type: 'rows', rows: [['Clientes activos', '184']] },
        { type: 'subtitle', text: 'Conversión de clientes nuevos' },
        {
          type: 'table',
          headers: ['Mes', 'Nuevos', '%'],
          rows: Array.from({ length: rows }, (_, index) => [`Mes ${index}`, 'Año y acentos: ñ é', '17,4 %']),
          widths: [0.4, 0.3, 0.3],
          align: ['left', 'right', 'right'],
        },
        { type: 'note', text: 'Una nota al pie.' },
      ],
    },
  ],
});

describe('PdfKitReportRenderer — US-55', () => {
  it('genera un PDF válido', async () => {
    const buffer = await new PdfKitReportRenderer().render(sampleModel(6));

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.subarray(-6).toString()).toContain('%%EOF');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('una tabla larga sigue en otra hoja sin fallar', async () => {
    const short = await new PdfKitReportRenderer().render(sampleModel(5));
    const long = await new PdfKitReportRenderer().render(sampleModel(120));

    expect(long.subarray(0, 5).toString()).toBe('%PDF-');
    expect(long.length).toBeGreaterThan(short.length);
    // PDFKit escribe "/Count N" con la cantidad de hojas
    const pages = Number(/\/Count (\d+)/.exec(long.toString('latin1'))?.[1]);
    expect(pages).toBeGreaterThan(1);
  });
});
