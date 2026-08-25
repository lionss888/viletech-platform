import { DOCX_FILES } from '../enums';
import { getAgentReportDocument } from './agent-report';
import { getSigningOrderDocument } from './signing-order';

export const generateDocxFile = (name: DOCX_FILES, data: any) => {
  switch (name) {
    case DOCX_FILES.AGENT_REPORT:
      return getAgentReportDocument(data);
    case DOCX_FILES.SIGNING_ORDER:
      return getSigningOrderDocument(data);
    default:
      throw new Error(`File pattern not found`);
  }
};
