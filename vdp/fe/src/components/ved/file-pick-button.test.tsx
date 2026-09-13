import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FilePickButton } from "./file-pick-button";

describe("FilePickButton", () => {
  const testId = "test-upload";
  const baseProps = {
    file: null,
    pickLabel: "Выбрать файл",
    testId,
    onPick: () => {},
  };

  it("exposes expected data-testid attributes", () => {
    const html = renderToStaticMarkup(<FilePickButton {...baseProps} />);
    expect(html).toContain(`data-testid="${testId}"`);
    expect(html).toContain(`data-testid="${testId}-zone"`);
    expect(html).toContain(`data-testid="${testId}-button"`);
  });

  it("contains file input with type=file", () => {
    const html = renderToStaticMarkup(<FilePickButton {...baseProps} />);
    expect(html).toContain('type="file"');
    expect(html).toContain('accept=".pdf,application/pdf"');
  });

  it("structural invariant: input[type=file] is NOT inside zone div", () => {
    const html = renderToStaticMarkup(<FilePickButton {...baseProps} />);
    // The input must appear BEFORE the zone div in the markup,
    // meaning input is a sibling (outside), not a child (inside).
    const inputPos = html.indexOf('type="file"');
    const zonePos = html.indexOf(`data-testid="${testId}-zone"`);
    expect(inputPos).toBeGreaterThan(-1);
    expect(zonePos).toBeGreaterThan(-1);
    // Input should come before zone in the markup (sibling order)
    expect(inputPos).toBeLessThan(zonePos);
  });

  it("shows pickLabel when no file selected", () => {
    const html = renderToStaticMarkup(<FilePickButton {...baseProps} />);
    expect(html).toContain("Выбрать файл");
  });

  it("shows file name when file is selected", () => {
    const file = new File([""], "invoice.pdf", { type: "application/pdf" });
    const html = renderToStaticMarkup(<FilePickButton {...baseProps} file={file} />);
    expect(html).toContain("invoice.pdf");
    expect(html).toContain("Заменить файл");
  });

  it("uses custom accept pattern when provided", () => {
    const html = renderToStaticMarkup(
      <FilePickButton {...baseProps} accept=".csv,text/csv" />,
    );
    expect(html).toContain('accept=".csv,text/csv"');
  });

  it("uses custom hint when provided", () => {
    const html = renderToStaticMarkup(
      <FilePickButton {...baseProps} hint="CSV, до 5 МБ" />,
    );
    expect(html).toContain("CSV, до 5 МБ");
  });
});
