import type { Company, OrderWithRelations } from '@/types';
import type { OrderTotals } from './order-totals';

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&apos;';
    }
  });
}

interface UBLInput {
  order: OrderWithRelations;
  company: Company;
  totals: OrderTotals;
  invoiceNumber: string;
}

/**
 * Génère une facture au format UBL 2.1 / EN 16931 (profil Peppol BIS 3.0).
 * À importer dans une plateforme d'envoi Peppol (Billit, Storecove, Recommand…).
 * Cette application ne se connecte pas directement au réseau Peppol.
 */
export function generateUBL({ order, company, totals, invoiceNumber }: UBLInput): string {
  const client = order.client;
  const lines = order.items
    .map((it, idx) => {
      const qty = Number(it.qty) || 1;
      const unitCode = it.unit === 'm' ? 'MTR' : 'C62';
      const lineTotal = Number(it.line_total).toFixed(2);
      const priceAmount = (qty ? Number(it.line_total) / qty : Number(it.line_total)).toFixed(2);
      return `  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${unitCode}">${qty}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${lineTotal}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Name>${esc(it.label)}</cbc:Name>
      <cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${totals.vatRate}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="EUR">${priceAmount}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`;
    })
    .join('\n');

  const allowance =
    totals.discountAmount > 0
      ? `  <cac:AllowanceCharge>
    <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
    <cbc:AllowanceChargeReason>Remise</cbc:AllowanceChargeReason>
    <cbc:Amount currencyID="EUR">${totals.discountAmount.toFixed(2)}</cbc:Amount>
    <cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${totals.vatRate}</cbc:Percent>
      <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory>
  </cac:AllowanceCharge>\n`
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${esc(invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${order.order_date}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyName><cbc:Name>${esc(company.name)}</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cbc:StreetName>${esc(company.address)}</cbc:StreetName>
      <cac:Country><cbc:IdentificationCode>BE</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyTaxScheme><cbc:CompanyID>${esc(company.vat)}</cbc:CompanyID>
      <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
    <cac:PartyLegalEntity><cbc:RegistrationName>${esc(company.name)}</cbc:RegistrationName>
      <cbc:CompanyID>${esc(company.vat)}</cbc:CompanyID></cac:PartyLegalEntity>
    <cac:Contact><cbc:ElectronicMail>${esc(company.email)}</cbc:ElectronicMail></cac:Contact>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyName><cbc:Name>${esc(client?.name)}</cbc:Name></cac:PartyName>
    <cac:PostalAddress><cbc:StreetName>${esc(client?.address_line || client?.address)}</cbc:StreetName>
      <cbc:CityName>${esc(client?.city)}</cbc:CityName>
      <cbc:PostalZone>${esc(client?.postal_code)}</cbc:PostalZone>
      <cac:Country><cbc:IdentificationCode>${esc(client?.country || 'BE')}</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    ${
      client?.vat
        ? `<cac:PartyTaxScheme><cbc:CompanyID>${esc(client.vat)}</cbc:CompanyID>
      <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>`
        : ''
    }
    <cac:PartyLegalEntity><cbc:RegistrationName>${esc(client?.name)}</cbc:RegistrationName></cac:PartyLegalEntity>
    <cac:Contact><cbc:ElectronicMail>${esc(client?.email)}</cbc:ElectronicMail></cac:Contact>
  </cac:Party></cac:AccountingCustomerParty>
${allowance}  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="EUR">${totals.tva.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="EUR">${totals.netHT.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="EUR">${totals.tva.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${totals.vatRate}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="EUR">${totals.subtotalHT.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="EUR">${totals.netHT.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="EUR">${totals.ttc.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="EUR">${totals.discountAmount.toFixed(2)}</cbc:AllowanceTotalAmount>
    <cbc:PrepaidAmount currencyID="EUR">${totals.deposit.toFixed(2)}</cbc:PrepaidAmount>
    <cbc:PayableRoundingAmount currencyID="EUR">${totals.roundingDelta.toFixed(2)}</cbc:PayableRoundingAmount>
    <cbc:PayableAmount currencyID="EUR">${totals.balanceDue.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines}
</Invoice>`;
}
