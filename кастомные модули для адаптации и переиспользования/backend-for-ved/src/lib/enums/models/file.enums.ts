export enum FilePattern {
  FIND_ONE = 'fea360.file-store.file.find.one',
  FIND_ONE_FILE_STRING = 'fea360.file-store.file.find.one.file.string',
  FIND_MANY = 'fea360.file-store.file.find.many',
  FIND_WITH_PAGINATE = 'fea360.file-store.file.find.with.paginate',
  CREATE_ORDER = 'fea360.file-store.create.order',
  CREATE_REPORT = 'fea360.file-store.create.report',
  CREATE_ORDER_DOCX = 'fea360.file-store.create.order.docx',
  COMPRESS = 'fea360.file-store.compress',
  UPLOAD = 'fea360.file-store.upload',
  CREATE_PDF = 'fea360.file-store.create.pdf',
  CREATE_DOCX = 'fea360.file-store.create.docx',
  REQUEST_FILE_STREAM = 'fea360.file-store.request.stream',
}

export enum StaticsType {
  FONTS = 'fonts',
  IMAGES = 'images',
  DOCS = 'docs',
}

export enum FileParseStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}
