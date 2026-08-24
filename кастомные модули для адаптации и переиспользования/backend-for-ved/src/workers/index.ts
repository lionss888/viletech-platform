import { Worker } from 'worker_threads';
import path from 'path';

export const runWorkerCreateArchive = (workerData): Promise<void> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(require.resolve(path.join(__dirname, './create-archive')), {
      execArgv: process.env.NODE_ENV === 'development' ? ['-r', 'ts-node/register/transpile-only'] : undefined,
      workerData,
    });
    worker.on('error', reject);
    worker.on('message', resolve);
  });
};
