import { describe, expect, it } from "vitest";

import { previewPrivatePath } from "./docs";

describe("docs preview helpers", () => {
  it("builds private preview path for file id", () => {
    const path = previewPrivatePath("file-abc");
    expect(path).toContain("/api/v1/file-store/preview/private/file-abc");
  });
});
