import { describe, expect, it } from "vitest";

import { canProviderDeleteDocuments, canUploadDocuments } from "./doc-upload-policy";

describe("doc-upload-policy", () => {
  it("allows upload outside terminal statuses for user/manager/root", () => {
    expect(canUploadDocuments("form_waiting_verification", "user")).toBe(true);
    expect(canUploadDocuments("payment_processing", "manager")).toBe(true);
    expect(canUploadDocuments("draft", "root")).toBe(true);
  });

  it("denies upload on completed/canceled", () => {
    expect(canUploadDocuments("completed", "user")).toBe(false);
    expect(canUploadDocuments("canceled_by_user", "user")).toBe(false);
    expect(canUploadDocuments("canceled_by_manager", "manager")).toBe(false);
  });

  it("denies upload for provider role", () => {
    expect(canUploadDocuments("payment_processing", "provider")).toBe(false);
  });

  it("allows provider delete only before sent", () => {
    expect(canProviderDeleteDocuments("payment_processing")).toBe(true);
    expect(canProviderDeleteDocuments("payment_sent")).toBe(false);
    expect(canProviderDeleteDocuments("completed")).toBe(false);
  });
});
