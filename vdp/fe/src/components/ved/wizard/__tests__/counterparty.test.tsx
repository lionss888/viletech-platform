import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CounterpartyCreateFields } from "../CounterpartyCreateFields";

describe("CounterpartyCreateFields", () => {
  it("renders optional registration number and legal address fields", () => {
    const html = renderToStaticMarkup(
      <CounterpartyCreateFields value={{}} onChange={() => {}} showIdentity={false} />,
    );
    expect(html).toContain('data-testid="counterparty-registration-number-input"');
    expect(html).toContain('data-testid="counterparty-legal-address-input"');
    expect(html).toContain("необязательно");
  });

  it("binds registrationNumber and legalAddress values", () => {
    const html = renderToStaticMarkup(
      <CounterpartyCreateFields
        value={{ registrationNumber: "1234567890", legalAddress: "123 Main St, Moscow" }}
        onChange={() => {}}
        showIdentity={false}
      />,
    );
    expect(html).toContain("1234567890");
    expect(html).toContain("123 Main St, Moscow");
  });

  it("renders identity fields when showIdentity is true", () => {
    const html = renderToStaticMarkup(
      <CounterpartyCreateFields
        value={{ name: "Supplier LLC", country: "CN" }}
        onChange={() => {}}
        showIdentity
      />,
    );
    expect(html).toContain('data-testid="counterparty-name-input"');
    expect(html).toContain("Supplier LLC");
  });
});
