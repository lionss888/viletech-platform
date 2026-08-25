import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { IFormPaymentInvoice } from 'lib/interfaces/models/form-payment.interface';
import { IHsCodeSnapshot } from 'lib/interfaces/models/hs-code.interface';
import { FormPaymentKind } from 'lib/enums/models/form-payment.enums';
import { HsCodeLoyalty } from 'lib/enums/models/hs-code.enums';

const HS_CODE_REQUIRED_ERROR = 'Invoices of kind "good" must have at least one HS code';

@Injectable()
export class HsCodeIntegrationService {
  private readonly logger = new Logger(HsCodeIntegrationService.name);

  validateInvoicesHaveCodes(invoices: IFormPaymentInvoice[]): void {
    if (!invoices || invoices.length === 0) {
      this.logger.debug('No invoices provided for validation');
      return;
    }

    // Only validate goods invoices - services don't require HS codes
    const goodsInvoices = invoices.filter((inv) => inv.kind === FormPaymentKind.GOOD);

    const goodsInvoicesWithoutCodes = goodsInvoices.filter((inv) => !inv.hsCodes || inv.hsCodes.length === 0);

    if (goodsInvoicesWithoutCodes.length > 0) {
      const invoiceRefs = goodsInvoicesWithoutCodes.map((inv) => inv.invoiceNumber || 'unknown').join(', ');

      this.logger.warn(`Validation failed: goods invoices without HS codes: ${invoiceRefs}`);

      throw new BadRequestException(HS_CODE_REQUIRED_ERROR);
    }

    const servicesCount = invoices.length - goodsInvoices.length;
    this.logger.debug(
      `Validation passed: ${goodsInvoices.length} goods invoices have HS codes` +
        (servicesCount > 0 ? `, ${servicesCount} service invoices excluded` : ''),
    );
  }

  extractUniqueHsCodes(invoices: IFormPaymentInvoice[]): string[] {
    if (!invoices || invoices.length === 0) {
      return [];
    }

    const codeSet = new Set<string>();
    let totalCodes = 0;
    let okCodesCount = 0;

    // Only extract codes from goods invoices (services don't have HS codes)
    const goodsInvoices = invoices.filter((inv) => inv.kind === FormPaymentKind.GOOD);

    for (const invoice of goodsInvoices) {
      if (invoice.hsCodes) {
        for (const snapshot of invoice.hsCodes) {
          if (snapshot.code) {
            totalCodes++;

            // Only include codes with loyalty='ok' for provider matching
            // Codes with not_quite_ok or not_ok should NOT be used for provider selection
            if (snapshot.loyalty === HsCodeLoyalty.OK) {
              codeSet.add(snapshot.code);
              okCodesCount++;
            }
          }
        }
      }
    }

    const codes = Array.from(codeSet);
    const servicesCount = invoices.length - goodsInvoices.length;
    const filteredOutCount = totalCodes - okCodesCount;

    this.logger.debug(
      `Extracted ${codes.length} unique OK HS codes from ${goodsInvoices.length} goods invoices` +
        (filteredOutCount > 0 ? ` (filtered out ${filteredOutCount} non-OK codes)` : '') +
        (servicesCount > 0 ? `, ${servicesCount} service invoices excluded` : ''),
    );

    return codes;
  }

  getHsCodeSnapshots(invoices: IFormPaymentInvoice[]): IHsCodeSnapshot[] {
    if (!invoices || invoices.length === 0) {
      return [];
    }

    const snapshots: IHsCodeSnapshot[] = [];

    // Only collect snapshots from goods invoices (services don't have HS codes)
    const goodsInvoices = invoices.filter((inv) => inv.kind === FormPaymentKind.GOOD);

    for (const invoice of goodsInvoices) {
      if (invoice.hsCodes) {
        snapshots.push(...invoice.hsCodes);
      }
    }

    const servicesCount = invoices.length - goodsInvoices.length;
    this.logger.debug(
      `Collected ${snapshots.length} HS code snapshots from ${goodsInvoices.length} goods invoices` +
        (servicesCount > 0 ? `, ${servicesCount} service invoices excluded` : ''),
    );

    return snapshots;
  }

  updateInvoiceSnapshot(
    invoices: IFormPaymentInvoice[],
    code: string,
    newSnapshot: IHsCodeSnapshot,
  ): IFormPaymentInvoice[] {
    const updated = invoices.map((invoice) => {
      if (!invoice.hsCodes) {
        return invoice;
      }

      return {
        ...invoice,
        hsCodes: invoice.hsCodes.map((snapshot) => (snapshot.code === code ? newSnapshot : snapshot)),
      };
    });

    this.logger.debug(`Updated snapshot for HS code: ${code}`);
    return updated;
  }
}
