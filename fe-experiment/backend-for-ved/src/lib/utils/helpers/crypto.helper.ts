import * as crypto from 'crypto';
import { BinaryToTextEncoding } from 'crypto';

export const base64encode = (data) => {
  return Buffer.from(data).toString('base64');
};

export const base64decode = (data) => {
  return Buffer.from(data, 'base64').toString();
};

export const createSalt = (size: number = 16) => crypto.randomBytes(size);

export const encrypt = (
  iv: crypto.BinaryLike,
  key: crypto.CipherKey,
  data: string,
  algorithm: string = 'aes-256-ctr',
) => {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return encrypted.toString('hex');
};

export const decrypt = (
  iv: crypto.BinaryLike,
  key: crypto.CipherKey,
  hash: string,
  algorithm: string = 'aes-256-ctr',
) => {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(hash, 'hex')), decipher.final()]);
  return decrypted.toString();
};

export const createHash = (data: crypto.BinaryLike, algorithm = 'sha256', encoding: BinaryToTextEncoding = 'hex') =>
  crypto.createHash(algorithm).update(data).digest(encoding);
