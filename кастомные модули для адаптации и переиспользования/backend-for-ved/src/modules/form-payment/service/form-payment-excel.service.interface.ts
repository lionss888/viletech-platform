export interface IFormPaymentExcelService {
  importFromExcel(
    formPaymentId: string,
    fileId: string,
    templateId: string,
    accountId: string,
  ): Promise<{ jobId: string }>;

  deleteFileAndStopJob(formPaymentId: string, fileId: string, accountId: string): Promise<{ jobStopped: boolean }>;

  findActiveParseJob(fileId: string): Promise<unknown>;

  stopParsingJob(fileId: string): Promise<boolean>;
}
