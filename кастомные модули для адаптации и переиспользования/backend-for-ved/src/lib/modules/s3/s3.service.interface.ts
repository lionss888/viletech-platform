export interface IS3Service {
  upload(buffer, fileId);

  getFile(fileName: string);

  getFileString(fileName: string);

  getFileStream(fileName: string);

  listObjects(params: IListObjects);

  deleteFile(pathName: string): Promise<void>;
}

export interface IListObjects {
  prefix?: string;
  limit?: number;
  delimiter?: string;
  nextToken?: string;
}
