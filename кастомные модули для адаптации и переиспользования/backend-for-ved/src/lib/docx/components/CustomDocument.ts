import { Document } from 'docx';

export class CustomDocument extends Document {
  constructor(options) {
    super({
      ...options,
    });
  }
}
