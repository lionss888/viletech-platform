import { describe, expect, it } from "vitest";

import { filterAgencyContractActions, shouldOfferAgencyContractUpload } from "./agency-contract-ux";
import { planContractConfirm } from "./manager-contract";

describe("agency-contract-ux", () => {
  it("hides upload when org already has accepted agency", () => {
    expect(
      shouldOfferAgencyContractUpload({
        status: "contract_waiting",
        orgHasAcceptedAgency: true,
      }),
    ).toBe(false);
  });

  it("offers upload on first deal waiting without accepted agency", () => {
    expect(
      shouldOfferAgencyContractUpload({
        status: "contract_waiting",
        orgHasAcceptedAgency: false,
      }),
    ).toBe(true);
  });

  it("filters upload_contract from action list when reuse applies", () => {
    const filtered = filterAgencyContractActions(
      [{ id: "upload_contract" }, { id: "cancel_form" }],
      { status: "contract_waiting", orgHasAcceptedAgency: true },
    );
    expect(filtered.map((a) => a.id)).toEqual(["cancel_form"]);
  });
});

describe("planContractConfirm wave3", () => {
  it("accept_then_send_order when contract linked on verification", () => {
    expect(planContractConfirm("contract_verification", "ctr-1")).toEqual({
      kind: "accept_then_send_order",
      contractId: "ctr-1",
    });
  });
});
