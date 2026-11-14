// Este archivo es el modal "Exportar reporte PDF" (US-55, contrato S5 §3.9.7, S5-49): una casilla
// por sección (todas marcadas al abrir), "Deseleccionar todo" / "Seleccionar todo" y el botón
// "Descargar PDF", que se deshabilita si no queda ninguna sección elegida.
import { useEffect, useRef, useState } from 'react';
import { FormActions } from '@/shared/components/forms/FormActions';
import { Alert } from '@/shared/components/ui/Alert';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { useDownloadStatisticsReport } from '../api/statistics.queries';
import { monthLabel } from '../lib/period';
import { orderedSections, REPORT_SECTIONS } from '../lib/report';
import type { MonthParam, ReportSection } from '../types/statistics';

interface ExportReportModalProps {
  /** Mes del reporte ('YYYY-MM'). */
  month: MonthParam;
  onClose: () => void;
}

export function ExportReportModal({ month, onClose }: ExportReportModalProps) {
  // Todas marcadas al abrir
  const [selected, setSelected] = useState<Set<ReportSection>>(
    () => new Set(REPORT_SECTIONS.map((section) => section.value)),
  );
  const download = useDownloadStatisticsReport();
  const firstCheckbox = useRef<HTMLInputElement>(null);

  const allSelected = selected.size === REPORT_SECTIONS.length;
  const noneSelected = selected.size === 0;

  // Foco en la primera casilla al abrir
  useEffect(() => {
    firstCheckbox.current?.focus();
  }, []);

  // Escape cierra el modal
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const toggle = (value: ReportSection) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(REPORT_SECTIONS.map((section) => section.value)));

  const onDownload = () =>
    download.mutate(
      { month, sections: orderedSections(selected) },
      { onSuccess: onClose },
    );

  return (
    <Modal title="Exportar reporte PDF" onClose={onClose} className="max-w-[460px]">
      <p className="text-sm text-[#5c5249]">
        Elegí las secciones que van en el reporte de <strong>{monthLabel(month)}</strong>.
      </p>

      <div className="mt-3 mb-1.5 flex items-center justify-between">
        <span className="text-xs font-bold tracking-[0.04em] text-[#7e3e20] uppercase">
          Secciones
        </span>
        <Button type="button" variant="ghost" className="h-[30px] px-2.5 text-[13px]" onClick={toggleAll}>
          {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#f6d0b1]">
        {REPORT_SECTIONS.map((section, index) => (
          <label
            key={section.value}
            className="flex cursor-pointer items-center gap-2.5 border-b border-[#fbe6d4] bg-white px-3.5 py-2.5 text-[15px] last:border-b-0"
          >
            <input
              ref={index === 0 ? firstCheckbox : undefined}
              type="checkbox"
              checked={selected.has(section.value)}
              onChange={() => toggle(section.value)}
              className="size-[18px] accent-[#a8532a]"
            />
            <span className="flex-1">
              <strong className="font-semibold">{section.label}</strong>
              <span className="block text-xs text-[#7a6e63]">{section.description}</span>
            </span>
          </label>
        ))}
      </div>

      {noneSelected && (
        <p id="export-report-error" role="alert" className="mt-1.5 text-xs text-[#a8532a]">
          Elegí al menos una sección.
        </p>
      )}

      {download.isError && (
        <Alert variant="error" className="mt-3">
          No se pudo descargar el reporte. Intentá nuevamente.
        </Alert>
      )}

      <FormActions>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={onDownload}
          disabled={noneSelected || download.isPending}
          aria-describedby={noneSelected ? 'export-report-error' : undefined}
        >
          {download.isPending ? 'Descargando…' : 'Descargar PDF'}
        </Button>
      </FormActions>
    </Modal>
  );
}
