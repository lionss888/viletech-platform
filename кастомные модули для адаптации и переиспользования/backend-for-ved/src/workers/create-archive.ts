import { parentPort, workerData } from 'worker_threads';
import archiver from 'archiver';
import fs from 'fs';

const { archivePath, files } = workerData.data;

const output = fs.createWriteStream(archivePath);
const archive = archiver('zip', { zlib: { level: 9 } });

archive.pipe(output);

output.on('close', async () => {
  parentPort.postMessage({});
});

archive.on('error', function (err) {
  throw err;
});

for (const file of files) {
  archive.append(Buffer.from(file.content, 'base64'), { name: file.originalName });
}

archive.finalize();
