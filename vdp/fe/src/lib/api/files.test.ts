import { describe, expect, it } from "vitest";

import { assertFileSize, formatUploadError, MAX_UPLOAD_BYTES, UploadError } from "./files";

describe("file upload helpers", () => {
  it("formatUploadError maps 413 to Russian limit message", () => {
    expect(formatUploadError(413)).toBe("Файл слишком большой (максимум 15 МБ)");
  });

  it("assertFileSize rejects files over 15 MB", () => {
    const big = new File([new ArrayBuffer(MAX_UPLOAD_BYTES + 1)], "big.pdf", { type: "application/pdf" });
    expect(() => assertFileSize(big)).toThrow(UploadError);
  });

  it("assertFileSize allows files at limit", () => {
    const ok = new File([new ArrayBuffer(1024)], "ok.pdf", { type: "application/pdf" });
    expect(() => assertFileSize(ok)).not.toThrow();
  });
});
