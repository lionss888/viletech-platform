import { IsString } from 'class-validator';

export class FormPaymentImportDto {
  @IsString()
  formPaymentId: string;

  @IsString()
  fileId: string;

  @IsString()
  templateId: string;
}
