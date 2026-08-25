/**
 * Smoke: User login → POST /file-store/upload/pdf → GET preview/private/:_id.
 * Requires Nest on :30000 and MinIO (start-local / compose).
 *
 * Usage:
 *   cd fe-experiment/backend-for-ved
 *   node scripts/smoke-bdui-upload.js
 */

const DEFAULT_BASE = process.env.BDUI_API_BASE || 'http://127.0.0.1:30000/api/1.0';
const USER_EMAIL = process.env.BDUI_USER_EMAIL || 'user@bdui.local';
const USER_PASSWORD = process.env.BDUI_USER_PASSWORD || 'BduiUser2024!';

/** Minimal valid PDF bytes (no PII). */
const MINIMAL_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n' +
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n' +
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>endobj\n' +
    'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
    'trailer<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF\n',
  'utf8',
);

async function login() {
  const response = await fetch(`${DEFAULT_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }),
  });
  const json = await response.json().catch(() => ({}));
  if ((response.status !== 200 && response.status !== 201) || !json.accessToken) {
    throw new Error(`login failed → ${response.status} ${JSON.stringify(json).slice(0, 200)}`);
  }
  return json.accessToken;
}

async function main() {
  console.log(`Smoke BDUI upload against ${DEFAULT_BASE}\n`);
  const token = await login();
  const form = new FormData();
  form.append('file', new Blob([MINIMAL_PDF], { type: 'application/pdf' }), 'bdui-smoke.pdf');
  const uploadResponse = await fetch(`${DEFAULT_BASE}/file-store/upload/pdf`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploadText = await uploadResponse.text();
  let uploadJson;
  try {
    uploadJson = uploadText ? JSON.parse(uploadText) : undefined;
  } catch {
    uploadJson = undefined;
  }
  if ((uploadResponse.status !== 200 && uploadResponse.status !== 201) || !uploadJson?._id) {
    console.error(`FAIL upload/pdf → ${uploadResponse.status} ${uploadText.slice(0, 400)}`);
    process.exit(1);
  }
  const fileId = String(uploadJson._id);
  console.log(`OK  upload/pdf → fileId=${fileId}`);
  const previewResponse = await fetch(`${DEFAULT_BASE}/file-store/preview/private/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (previewResponse.status !== 200) {
    const previewText = await previewResponse.text();
    console.error(`FAIL preview/private/${fileId} → ${previewResponse.status} ${previewText.slice(0, 200)}`);
    process.exit(1);
  }
  const previewBytes = Buffer.from(await previewResponse.arrayBuffer());
  if (previewBytes.length < 8 || previewBytes.subarray(0, 5).toString('utf8') !== '%PDF-') {
    console.error(`FAIL preview body is not PDF (len=${previewBytes.length})`);
    process.exit(1);
  }
  console.log(`OK  preview/private/${fileId} → ${previewBytes.length} bytes PDF`);
  console.log('\nSmoke upload passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
