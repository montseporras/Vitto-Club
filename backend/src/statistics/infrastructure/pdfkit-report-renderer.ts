import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { ReportRenderer } from '../domain/port/report-renderer.js';
import type { ReportBlock, ReportModel } from '../domain/report-model.js';

// Marrón de la marca (S5-54) y gris de los textos secundarios
const BRAND = '#a9532b';
const DARK = '#4a2414';
const TEXT = '#2b2b2b';
const MUTED = '#777777';
const LINE = '#d9cfc9';
const HEADER_BACKGROUND = '#f5ece6';

const FONT = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';
const ROW_HEIGHT = 18;
const LOGO_SIZE = 56;

// El logo fijo de Vitto Club (S5-35): vive en src/assets y Nest lo copia a dist/assets al compilar. Desde src y
// desde dist la ruta relativa a este archivo es la misma.
const LOGO_PATH = fileURLToPath(new URL('../../assets/logo-vitto.png', import.meta.url));

// PDFKit usa fuentes estándar (WinAnsi): acentos y "ñ" salen bien, pero no los símbolos como ▲ ▼ ≥. Los textos
// del modelo ya no los traen.
@Injectable()
export class PdfKitReportRenderer implements ReportRenderer {
  private logo: Buffer | null | undefined;

  render(model: ReportModel): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: { Title: model.title, Author: 'Vitto Club' },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        this.draw(doc, model);
        doc.end();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private draw(doc: PDFKit.PDFDocument, model: ReportModel): void {
    this.drawHeader(doc, model);
    for (const section of model.sections) {
      this.ensureSpace(doc, 80);
      doc.moveDown(1);
      // Con lineBreak: false PDFKit no baja el cursor: la posición del título y de la línea se calcula a mano
      const titleY = doc.y;
      doc.font(FONT_BOLD).fontSize(14).fillColor(BRAND).text(section.title.toUpperCase(), this.left(doc), titleY, { lineBreak: false });
      const y = titleY + 14 + 8;
      doc.moveTo(this.left(doc), y).lineTo(this.right(doc), y).lineWidth(1).strokeColor(BRAND).stroke();
      doc.y = y + 8;
      for (const block of section.blocks) {
        this.drawBlock(doc, block);
      }
    }
  }

  private drawHeader(doc: PDFKit.PDFDocument, model: ReportModel): void {
    const top = doc.page.margins.top;
    const logo = this.loadLogo();
    if (logo) {
      doc.image(logo, this.left(doc), top - 10, { fit: [LOGO_SIZE, LOGO_SIZE] });
    }
    const textX = this.left(doc) + LOGO_SIZE + 12;
    doc.font(FONT_BOLD).fontSize(20).fillColor(DARK).text(model.title.toUpperCase(), textX, top + 2, { lineBreak: false });
    doc.font(FONT).fontSize(11).fillColor(TEXT).text(`Período: ${model.periodLabel}`, textX, top + 28, { lineBreak: false });
    doc
      .font(FONT)
      .fontSize(9)
      .fillColor(MUTED)
      .text(`Generado: ${model.generatedAt}`, this.left(doc), top - 20, {
        width: this.width(doc),
        align: 'right',
        lineBreak: false,
      });
    const y = top + LOGO_SIZE + 4;
    doc.moveTo(this.left(doc), y).lineTo(this.right(doc), y).lineWidth(0.5).strokeColor(LINE).stroke();
    doc.y = y + 6;
  }

  private drawBlock(doc: PDFKit.PDFDocument, block: ReportBlock): void {
    switch (block.type) {
      case 'rows':
        for (const [label, value] of block.rows) {
          this.ensureSpace(doc, ROW_HEIGHT);
          const y = doc.y;
          doc.font(FONT).fontSize(10.5).fillColor(TEXT).text(label, this.left(doc), y, { lineBreak: false });
          doc.font(FONT_BOLD).text(value, this.left(doc), y, { width: this.width(doc), align: 'right', lineBreak: false });
          doc.y = y + ROW_HEIGHT;
        }
        doc.y += 4;
        break;
      case 'subtitle':
        this.ensureSpace(doc, ROW_HEIGHT * 3);
        doc.y += 6;
        doc.font(FONT_BOLD).fontSize(11).fillColor(DARK).text(block.text, this.left(doc), doc.y, { lineBreak: false });
        doc.y += ROW_HEIGHT;
        break;
      case 'note':
        this.ensureSpace(doc, ROW_HEIGHT * 2);
        doc.font(FONT).fontSize(8.5).fillColor(MUTED).text(block.text, this.left(doc), doc.y, { width: this.width(doc) });
        doc.y += 6;
        break;
      case 'table':
        this.drawTable(doc, block);
        break;
    }
  }

  private drawTable(doc: PDFKit.PDFDocument, table: Extract<ReportBlock, { type: 'table' }>): void {
    const widths = table.widths.map((fraction) => fraction * this.width(doc));
    const drawRow = (cells: string[], bold: boolean, background: boolean): void => {
      const y = doc.y;
      if (background) {
        doc.rect(this.left(doc), y, this.width(doc), ROW_HEIGHT).fillColor(HEADER_BACKGROUND).fill();
      }
      let x = this.left(doc);
      cells.forEach((cell, index) => {
        doc
          .font(bold ? FONT_BOLD : FONT)
          .fontSize(9.5)
          .fillColor(TEXT)
          .text(cell, x + 4, y + 5, { width: widths[index] - 8, height: ROW_HEIGHT - 5, align: table.align[index], ellipsis: true });
        x += widths[index];
      });
      doc.moveTo(this.left(doc), y + ROW_HEIGHT).lineTo(this.right(doc), y + ROW_HEIGHT).lineWidth(0.5).strokeColor(LINE).stroke();
      doc.y = y + ROW_HEIGHT;
    };

    // El encabezado se repite si la tabla sigue en otra hoja
    this.ensureSpace(doc, ROW_HEIGHT * 3);
    drawRow(table.headers, true, true);
    for (const row of table.rows) {
      if (this.ensureSpace(doc, ROW_HEIGHT)) {
        drawRow(table.headers, true, true);
      }
      drawRow(row, false, false);
    }
    doc.y += 6;
  }

  // Salta de hoja si lo que sigue no entra. Devuelve true si saltó.
  private ensureSpace(doc: PDFKit.PDFDocument, height: number): boolean {
    if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      return true;
    }
    return false;
  }

  private left(doc: PDFKit.PDFDocument): number {
    return doc.page.margins.left;
  }

  private right(doc: PDFKit.PDFDocument): number {
    return doc.page.width - doc.page.margins.right;
  }

  private width(doc: PDFKit.PDFDocument): number {
    return this.right(doc) - this.left(doc);
  }

  // Si el archivo del logo no está, el reporte sale igual, sin imagen (el título queda a la izquierda del logo)
  private loadLogo(): Buffer | null {
    if (this.logo === undefined) {
      try {
        this.logo = readFileSync(LOGO_PATH);
      } catch {
        this.logo = null;
      }
    }
    return this.logo;
  }
}
