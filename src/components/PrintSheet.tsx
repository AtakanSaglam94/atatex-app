import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface Props {
  /** titre du document (= en-tête que le navigateur imprime en marge) */
  docTitle: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Feuille plein écran imprimable (ou « Enregistrer en PDF » via la boîte
 * d'impression du navigateur). Fonctionne sur PC, tablette et téléphone.
 */
export function PrintSheet({ docTitle, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.title;
    document.title = docTitle;
    return () => {
      document.removeEventListener('keydown', onKey);
      document.title = prev;
    };
  }, [onClose, docTitle]);

  return createPortal(
    <div className="print-overlay">
      <div className="print-toolbar">
        <button className="btn btn--ghost" onClick={onClose}>
          <Icon name="x" size={16} /> Fermer
        </button>
        <button className="btn btn--primary" onClick={() => window.print()}>
          <Icon name="invoices" size={16} /> Imprimer / Enregistrer en PDF
        </button>
      </div>
      <div className="print-sheet">{children}</div>
      <style>{css}</style>
    </div>,
    document.body,
  );
}

const css = `
.print-overlay {
  position: fixed; inset: 0; z-index: 3000; background: #6b6051;
  overflow-y: auto; padding: 24px 12px 60px;
}
.print-toolbar {
  max-width: 800px; margin: 0 auto 16px; display: flex; justify-content: space-between; gap: 10px;
}
.print-sheet {
  max-width: 800px; margin: 0 auto; background: #fff; color: #1c1712;
  padding: 40px 44px; border-radius: 4px; font-size: 13px; line-height: 1.5;
  font-family: 'Inter', system-ui, sans-serif;
}
.print-sheet h1 { font-family: 'Fraunces', Georgia, serif; }
.print-sheet table { width: 100%; border-collapse: collapse; }
.print-sheet .r { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.ps-brand { display: flex; align-items: center; gap: 10px; }
.ps-logo { color: #9a5a2c; }
.ps-title { font-family: 'Fraunces', Georgia, serif; font-size: 20px; font-weight: 600; }
.ps-soft { color: #6b6051; }
.ps-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b6051; padding: 7px 8px; border-bottom: 1.5px solid #cebfa4; }
.ps-table td { padding: 7px 8px; border-bottom: 1px solid #eadfce; vertical-align: top; }
.ps-table tfoot td { font-weight: 600; border-top: 1.5px solid #1c1712; border-bottom: none; }
.ps-kv { display: flex; justify-content: space-between; padding: 5px 0; }
.ps-kv.big { font-family: 'Fraunces', Georgia, serif; font-size: 16px; font-weight: 600; border-top: 1.5px solid #1c1712; padding-top: 8px; margin-top: 4px; }

@media print {
  #root { display: none !important; }
  .print-overlay { position: static !important; inset: auto !important; background: #fff !important; padding: 0 !important; overflow: visible !important; }
  .print-toolbar { display: none !important; }
  .print-sheet { max-width: none; margin: 0; padding: 0; border-radius: 0; }
  @page { size: A4; margin: 16mm; }
}
`;
