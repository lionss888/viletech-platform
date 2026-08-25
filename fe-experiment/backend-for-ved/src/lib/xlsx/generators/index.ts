import { XLSX_FILES } from '../enums';
import { getFormPaymentsDocument } from './form-payments';
import { IFormPaymentForXlsx } from '../../../modules/form-payment/service/form-payment.service.interface';

export const generateXlsxFile = (name: XLSX_FILES, data: IFormPaymentForXlsx[]) => {
  switch (name) {
    case XLSX_FILES.FORM_PAYMENTS:
      return getFormPaymentsDocument(data);
    default:
      throw new Error(`File pattern not found`);
  }
};
