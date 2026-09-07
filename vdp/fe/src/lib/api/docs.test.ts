import { describe, expect, it } from "vitest";

import { previewPrivatePath } from "./docs";

describe("docs preview helpers", () => {
  it("builds private preview path for file id", () => {
    const path = previewPrivatePath("file-abc");
    expect(path).toContain("/api/v1/file-store/preview/private/file-abc");
  });

  it("keeps uuid-style file ids intact in the path", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(previewPrivatePath(id)).toContain(`/preview/private/${id}`);
  });
});
