import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Queue, Job } from 'bull';
import { IFormPaymentExcelService } from './form-payment-excel.service.interface';
import { FormPaymentPattern, FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import { IFormPaymentService } from './form-payment.service.interface';
import { ITemplateService } from 'modules/template/service/template.service.interface';
import { IFileService } from 'modules/file/service/file.service.interface';
import { IS3Service } from 'lib/modules/s3/s3.service.interface';
import { FORM_PAYMENT_SERVICE } from '../form-payment.constants';
import { JobQueueName } from 'lib/enums/models/job-queue.enums';
import { IFile } from 'lib/interfaces/models/file.interface';
import { FileParseStatus } from 'lib/enums/models/file.enums';
import { EXCEL_LIMITS, bytesToMB, getMaxFileSizeBytes } from 'lib/constants/excel.constants';
import { File } from 'modules/file/service/file.schema';

@Injectable()
export class FormPaymentExcelService implements IFormPaymentExcelService {
  private readonly logger: Logger = new Logger(FormPaymentExcelService.name);

  constructor(
    @InjectQueue(JobQueueName.FORM_PAYMENT_QUEUE) private readonly formPaymentQueue: Queue,
    @InjectModel(File.name) private readonly fileModel: Model<File>,
    @Inject(FORM_PAYMENT_SERVICE) private readonly formPaymentService: IFormPaymentService,
    @Inject('ITemplateService') private readonly templateService: ITemplateService,
    @Inject('IFileService') private readonly fileService: IFileService,
    @Inject('IS3Service') private readonly s3Service: IS3Service,
  ) {}

  async importFromExcel(
    formPaymentId: string,
    fileId: string,
    templateId: string,
    accountId: string,
  ): Promise<{ jobId: string }> {
    await this.validateImportRequest(formPaymentId, fileId, templateId, accountId);
    await this.preventDuplicateImport(fileId, templateId);
    await this.atomicSetPending(fileId);
    const jobId = await this.createImportJob(formPaymentId, fileId, templateId, accountId);

    this.logger.log(
      `Excel import started: form=${formPaymentId}, file=${fileId}, template=${templateId}, account=${accountId}, job=${jobId}`,
    );

    return { jobId };
  }

  private async validateImportRequest(
    formPaymentId: string,
    fileId: string,
    templateId: string,
    accountId: string,
  ): Promise<void> {
    const formPayment = await this.formPaymentService.findOne({ _id: formPaymentId });
    if (!formPayment) {
      throw new NotFoundException('FormPayment not found');
    }

    if (String(formPayment.account) !== accountId) {
      throw new BadRequestException('FormPayment does not belong to current account');
    }

    const ALLOWED_STATUSES = [FormPaymentStatus.DRAFT, FormPaymentStatus.FORM_WAITING_CORRECTIONS];
    if (!ALLOWED_STATUSES.includes(formPayment.status)) {
      throw new BadRequestException(
        `Cannot parse Excel in status ${formPayment.status}. Allowed: ${ALLOWED_STATUSES.join(', ')}`,
      );
    }

    await this.validateTemplate(templateId);
    await this.validateFile(fileId, accountId);
  }

  private async validateTemplate(templateId: string): Promise<void> {
    const template = await this.templateService.findOne(templateId);
    if (!template) {
      throw new BadRequestException('Template not found');
    }
    if (!template.isActive) {
      throw new BadRequestException('Template is not active');
    }

    const cellCount = Object.keys(template.mapping?.cells || {}).length;
    if (cellCount > EXCEL_LIMITS.MAX_TEMPLATE_CELLS) {
      this.logger.error(
        `Template ${templateId} has ${cellCount} cells, exceeds limit ${EXCEL_LIMITS.MAX_TEMPLATE_CELLS}`,
      );
      throw new BadRequestException(
        `Template configuration error: too many cells (${cellCount}). Maximum allowed: ${EXCEL_LIMITS.MAX_TEMPLATE_CELLS}`,
      );
    }
  }

  private async validateFile(fileId: string, accountId: string): Promise<void> {
    const file = await this.fileService.findOne({ _id: fileId });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const fileSizeMB = bytesToMB(file.size);
    if (file.size > getMaxFileSizeBytes()) {
      throw new BadRequestException(
        `Excel file too large (${fileSizeMB.toFixed(1)}MB). Maximum allowed: ${EXCEL_LIMITS.MAX_FILE_SIZE_MB}MB`,
      );
    }

    if (file.account && String(file.account) !== accountId) {
      this.logger.warn(
        `File ownership mismatch: file=${fileId}, file.account=${file.account}, request.account=${accountId}`,
      );
      throw new BadRequestException('Cannot import file that belongs to another account');
    }

    if (!file.account) {
      this.logger.warn(
        `File ${fileId} has no account field - legacy file. Consider running migration to populate file.account`,
      );
    }
  }

  private async preventDuplicateImport(fileId: string, templateId: string): Promise<void> {
    // Проверка Bull queue (fallback для уже созданных jobs)
    const jobIdToCreate = `parse-excel-${fileId}-${templateId}`;
    const existingJob = await this.formPaymentQueue.getJob(jobIdToCreate);

    if (existingJob) {
      const state = await existingJob.getState();
      if (state !== 'completed' && state !== 'failed') {
        throw new BadRequestException(
          'Import already in progress for this file and template. Please wait for the current import to complete.',
        );
      }
    }
  }

  private async atomicSetPending(fileId: string): Promise<void> {
    // Атомарная операция MongoDB: установить parseStatus=PENDING только если он НЕ pending
    // Это предотвращает race condition между concurrent requests
    const result = await this.fileModel.updateOne(
      {
        _id: fileId,
        parseStatus: { $ne: FileParseStatus.PENDING },
      },
      {
        $set: {
          parseStatus: FileParseStatus.PENDING,
          parsedValue: null,
          parseError: null,
        },
      },
    );

    if (result.matchedCount === 0) {
      throw new BadRequestException(
        'Import already in progress for this file. Please wait for the current import to complete.',
      );
    }
  }

  private async createImportJob(
    formPaymentId: string,
    fileId: string,
    templateId: string,
    accountId: string,
  ): Promise<string> {
    // parseStatus уже установлен атомарно в atomicSetPending()
    const jobIdToCreate = `parse-excel-${fileId}-${templateId}`;
    const job = await this.formPaymentQueue.add(
      FormPaymentPattern.PARSE_EXCEL,
      { formPaymentId, fileId, templateId, accountId },
      {
        jobId: jobIdToCreate,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        timeout: EXCEL_LIMITS.PARSE_TIMEOUT_MS,
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    return job.id.toString();
  }

  async findActiveParseJob(fileId: string): Promise<Job | null> {
    const waitingJobs = await this.formPaymentQueue.getWaiting();
    const waitingJob = waitingJobs.find(
      (job) => job.name === FormPaymentPattern.PARSE_EXCEL && job.data.fileId === fileId,
    );

    if (waitingJob) return waitingJob;

    const activeJobs = await this.formPaymentQueue.getActive();
    return activeJobs.find((job) => job.name === FormPaymentPattern.PARSE_EXCEL && job.data.fileId === fileId) || null;
  }

  async stopParsingJob(fileId: string): Promise<boolean> {
    const [waitingJobs, activeJobs] = await Promise.all([
      this.formPaymentQueue.getWaiting(),
      this.formPaymentQueue.getActive(),
    ]);
    const allJobs = [...waitingJobs, ...activeJobs];

    const jobsToStop = allJobs.filter(
      (job) => job.name === FormPaymentPattern.PARSE_EXCEL && job.data.fileId === fileId,
    );

    if (jobsToStop.length === 0) {
      this.logger.debug(`No active parsing jobs found for file ${fileId}`);
      return false;
    }

    this.logger.log(`Stopping ${jobsToStop.length} parsing job(s) for file ${fileId}`);
    let failedRemovals = 0;
    for (const job of jobsToStop) {
      try {
        await job.remove();
      } catch (error) {
        failedRemovals++;
        this.logger.debug(`Could not remove job ${job.id}: ${error.message}`);
      }
    }

    if (failedRemovals > 0) {
      this.logger.warn(
        `Failed to remove ${failedRemovals}/${jobsToStop.length} jobs for file ${fileId}. Active jobs will complete soon.`,
      );
    }

    return true;
  }

  async deleteFileAndStopJob(
    formPaymentId: string,
    fileId: string,
    accountId: string,
  ): Promise<{ jobStopped: boolean }> {
    const formPayment = await this.formPaymentService.findOne({ _id: formPaymentId });
    if (!formPayment) {
      throw new NotFoundException('FormPayment not found');
    }

    if (String(formPayment.account) !== accountId) {
      throw new BadRequestException('FormPayment does not belong to current account');
    }

    const file = await this.fileService.findOne({ _id: fileId });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.account && String(file.account) !== accountId) {
      this.logger.warn(
        `File ownership mismatch during deletion: file=${fileId}, file.account=${file.account}, request.account=${accountId}`,
      );
      throw new BadRequestException('Cannot delete file that belongs to another account');
    }

    const jobStopped = await this.stopJobForFile(fileId);
    await this.clearImportFileIfMatch(formPayment, fileId);
    await this.deleteFileRecord(fileId);
    await this.deleteFileFromS3(fileId);

    this.logger.log(
      `File deleted: form=${formPaymentId}, file=${fileId}, jobStopped=${jobStopped}, account=${accountId}`,
    );

    return { jobStopped };
  }

  private async stopJobForFile(fileId: string): Promise<boolean> {
    return this.stopParsingJob(fileId);
  }

  private async clearImportFileIfMatch(
    formPayment: { _id: string; importFile?: string | IFile },
    fileId: string,
  ): Promise<void> {
    const importFileId =
      typeof formPayment.importFile === 'string' ? formPayment.importFile : formPayment.importFile?._id?.toString();

    if (importFileId === fileId) {
      await this.formPaymentService.updateOne({ _id: formPayment._id }, { importFile: null });
    }
  }

  private async deleteFileRecord(fileId: string): Promise<void> {
    try {
      await this.fileService.deleteOne({ _id: fileId });
    } catch (error) {
      this.logger.error(`Failed to delete file DB record ${fileId}: ${error.message}`);
      throw new BadRequestException('Failed to delete file metadata.');
    }
  }

  private async deleteFileFromS3(fileId: string): Promise<void> {
    const pathName = `fea/documents/${fileId}`;
    try {
      await this.s3Service.deleteFile(pathName);
    } catch (error) {
      this.logger.warn(`S3 deletion failed for ${fileId}: ${error.message}. File metadata removed, S3 cleanup needed.`);
    }
  }
}
