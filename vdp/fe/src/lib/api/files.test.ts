import { afterEach, describe, expect, it, vi } from "vitest";

import { assertFileSize, formatUploadError, MAX_UPLOAD_BYTES, uploadFile, UploadError } from "./files";

vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return {
    ...actual,
    loadAuthTokens: vi.fn(() => ({
      token: "expired",
      refresh_token: "refresh",
      account_id: "a1",
      role: "user",
    })),
    refreshTokens: vi.fn(async () => ({
      token: "fresh",
      refresh_token: "refresh",
      account_id: "a1",
      role: "user",
    })),
    newRequestId: () => "fe-test",
  };
});

describe("file upload helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("formatUploadError maps 413 to Russian limit message", () => {
    expect(formatUploadError(413)).toBe("Файл слишком большой (максимум 15 МБ)");
  });

  it("formatUploadError maps 401 to session copy", () => {
    expect(formatUploadError(401)).toContain("Сессия истекла");
  });

  it("assertFileSize rejects files over 15 MB", () => {
    const big = new File([new ArrayBuffer(MAX_UPLOAD_BYTES + 1)], "big.pdf", { type: "application/pdf" });
    expect(() => assertFileSize(big)).toThrow(UploadError);
  });

  it("assertFileSize allows files at limit", () => {
    const ok = new File([new ArrayBuffer(1024)], "ok.pdf", { type: "application/pdf" });
    expect(() => assertFileSize(ok)).not.toThrow();
  });

  it("uploadFile retries once after 401 when refresh succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401, statusText: "Unauthorized" }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "file-1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const file = new File([new ArrayBuffer(64)], "ok.pdf", { type: "application/pdf" });
    const meta = await uploadFile("form-1", file);
    expect(meta.id).toBe("file-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
