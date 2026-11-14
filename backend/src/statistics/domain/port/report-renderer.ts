import type { ReportModel } from '../report-model.js';

// Dibuja el reporte en un PDF (S5 §3.9.5). La implementación es PDFKit (S5-11).
export abstract class ReportRenderer {
  abstract render(model: ReportModel): Promise<Buffer>;
}
