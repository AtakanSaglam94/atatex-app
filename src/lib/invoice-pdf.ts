import type { TDocumentDefinitions, CustomTableLayout, TableCell } from 'pdfmake/interfaces';
import type { Company, OrderWithRelations } from '@/types';
import type { OrderTotals } from './order-totals';
import { eur, num } from './money';
import { fmtDate } from './format';

// pdfmake (+ polices embarquées) pèse ~2 Mo : chargé à la demande, uniquement
// quand on génère réellement une facture.
type VfsShape = {
  vfs?: Record<string, string>;
  pdfMake?: { vfs?: Record<string, string> };
  default?: VfsShape;
};
function resolveVfs(m: VfsShape): Record<string, string> | undefined {
  return m.vfs ?? m.pdfMake?.vfs ?? (m.default ? resolveVfs(m.default) : undefined);
}

let pdfMakePromise: Promise<{ createPdf: (doc: TDocumentDefinitions) => { download: (name: string) => void; open: () => void } }> | null = null;

function getPdfMake() {
  if (!pdfMakePromise) {
    pdfMakePromise = Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ]).then(([mod, fonts]) => {
      const pdfMake = ((mod as unknown as { default?: unknown }).default ?? mod) as {
        vfs?: Record<string, string>;
        createPdf: (doc: TDocumentDefinitions) => { download: (name: string) => void; open: () => void };
      };
      const vfs = resolveVfs(fonts as unknown as VfsShape);
      if (vfs) pdfMake.vfs = vfs;
      return pdfMake;
    });
  }
  return pdfMakePromise;
}

const COGNAC = '#9a5a2c';
const INK = '#2a2018';
const SOFT = '#6b6051';

interface InvoiceInput {
  order: OrderWithRelations;
  company: Company;
  totals: OrderTotals;
  invoiceNumber: string;
}

export async function buildInvoicePdf({ order, company, totals, invoiceNumber }: InvoiceInput) {
  const pdfMake = await getPdfMake();
  const client = order.client;

  const headerRow: TableCell[] = [
    { text: 'Désignation', style: 'th' },
    { text: 'Qté', style: 'th', alignment: 'right' },
    { text: 'P.U.', style: 'th', alignment: 'right' },
    { text: 'Montant', style: 'th', alignment: 'right' },
  ];

  const itemRows: TableCell[][] = order.items.map((it) => [
    {
      text: [
        { text: it.label + '\n', bold: true },
        it.is_confection
          ? {
              text: `Largeur ${num(it.largeur ?? 0, 0, 2)} m · ${num(it.metrage ?? 0, 0, 2)} m de tissu · confection ${eur(it.frais_confection ?? 0)}/m`,
              fontSize: 8,
              color: SOFT,
            }
          : '',
      ],
    },
    { text: num(it.qty, 0, 2) + (it.unit === 'm' ? ' m' : ''), alignment: 'right' },
    { text: eur(it.unit_price), alignment: 'right' },
    { text: eur(it.line_total), alignment: 'right' },
  ]);

  const totalsRows: [string, string][] = [['Sous-total HT', eur(totals.subtotalHT)]];
  if (totals.discountAmount > 0) totalsRows.push(['Remise', '− ' + eur(totals.discountAmount)]);
  totalsRows.push([`TVA ${num(totals.vatRate)} %`, eur(totals.tva)]);
  if (totals.roundingDelta !== 0) totalsRows.push(['Arrondi', eur(totals.roundingDelta)]);
  totalsRows.push(['Total TTC', eur(totals.totalDue)]);
  if (totals.deposit > 0) {
    totalsRows.push(['Acompte versé', '− ' + eur(totals.deposit)]);
    totalsRows.push(['Solde à payer', eur(totals.balanceDue)]);
  }

  const doc: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [48, 56, 48, 64],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: INK, lineHeight: 1.3 },
    footer: {
      text: [
        company.name,
        company.vat && ` · TVA ${company.vat}`,
        company.iban && ` · IBAN ${company.iban}`,
      ]
        .filter(Boolean)
        .join(''),
      alignment: 'center',
      fontSize: 8,
      color: SOFT,
      margin: [48, 20, 48, 0],
    },
    content: [
      {
        columns: [
          [
            { text: company.name || 'ATA-TEX', fontSize: 18, bold: true, color: COGNAC },
            { text: company.address || '', color: SOFT, margin: [0, 2, 0, 0] },
            company.vat ? { text: 'TVA : ' + company.vat, color: SOFT } : '',
            company.phone ? { text: 'Tél : ' + company.phone, color: SOFT } : '',
            company.email ? { text: company.email, color: SOFT } : '',
          ],
          [
            { text: 'FACTURE', fontSize: 16, bold: true, alignment: 'right' },
            { text: invoiceNumber, alignment: 'right', color: SOFT, margin: [0, 2, 0, 0] },
            { text: 'Date : ' + fmtDate(order.order_date), alignment: 'right', color: SOFT },
            { text: 'Commande : ' + order.order_number, alignment: 'right', color: SOFT },
          ],
        ],
      },
      {
        text: 'Facturé à',
        margin: [0, 26, 0, 4],
        fontSize: 8,
        bold: true,
        color: SOFT,
        characterSpacing: 0.5,
      },
      { text: client?.name || 'Client', bold: true },
      client?.address ? { text: client.address, color: SOFT } : '',
      client?.vat ? { text: 'TVA : ' + client.vat, color: SOFT } : '',

      {
        margin: [0, 22, 0, 0],
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [headerRow, ...itemRows],
        },
        layout: {
          hLineWidth: (i, node) =>
            i === 0 || i === 1 || i === node.table.body.length ? 0.7 : 0.3,
          vLineWidth: () => 0,
          hLineColor: () => '#cebfa4',
          paddingTop: () => 6,
          paddingBottom: () => 6,
        } as CustomTableLayout,
      },

      {
        margin: [0, 16, 0, 0],
        columns: [
          { text: '', width: '*' },
          {
            width: 'auto',
            table: {
              body: totalsRows.map(([k, v], i): TableCell[] => {
                const strong = i === totalsRows.length - 1 || k === 'Total TTC';
                return [
                  { text: k, alignment: 'right', bold: strong, color: SOFT },
                  { text: v, alignment: 'right', bold: strong, color: k === 'Total TTC' ? COGNAC : INK },
                ];
              }),
            },
            layout: 'noBorders',
          },
        ],
      },

      {
        text: company.invoice_terms || 'Paiement à réception de la facture.',
        margin: [0, 28, 0, 0],
        color: SOFT,
        fontSize: 9,
      },
      company.iban
        ? { text: 'Paiement par virement : ' + company.iban, color: SOFT, fontSize: 9 }
        : '',
    ],
    styles: {
      th: { fontSize: 8, bold: true, color: SOFT, characterSpacing: 0.4 },
    },
  };

  return pdfMake.createPdf(doc);
}
