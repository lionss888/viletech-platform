import { describe, expect, it } from "vitest";

import { resolveDemoAction } from "./action-bridge";
import { actionsFor } from "./actions";
import { appActionsFor } from "./app-actions";
import {
  ADVANCE_SIGNING_NEEDS_RATE,
  blocksAdvanceSigningWithoutRate,
  blocksPaymentStartWithoutProvider,
  hidesPaymentStartForImportAdvance,
  IMPORT_ADVANCE_AWAITS_TREASURER,
  isImportAdvanceCoverageGate,
  isPostpayRateOnPP,
  isRateEmpty,
  PAYMENT_START_PROVIDER_LOCK,
} from "./manager-payment";

describe("blocksPaymentStartWithoutProvider", () => {
  it("blocks payment_start on payment_received without provider", () => {
    expect(blocksPaymentStartWithoutProvider("payment_received", "mgr_payment_start")).toBe(true);
    expect(blocksPaymentStartWithoutProvider("payment_received", "mgr_payment_start", "prov-1")).toBe(false);
  });

  it("does not block assign provider or payment_start on manager_checking", () => {
    expect(blocksPaymentStartWithoutProvider("payment_received", "mgr_assign_provider")).toBe(false);
    expect(blocksPaymentStartWithoutProvider("manager_checking", "mgr_payment_start")).toBe(false);
  });

  it("exports lock copy for ActionPanel", () => {
    expect(PAYMENT_START_PROVIDER_LOCK.length).toBeGreaterThan(10);
  });
});

describe("import advance treasurer gate", () => {
  it("treats import advance and empty method as coverage gate", () => {
    expect(isImportAdvanceCoverageGate({ condition: "advance", direction: "import" })).toBe(true);
    expect(isImportAdvanceCoverageGate({ direction: "import" })).toBe(true);
    expect(isImportAdvanceCoverageGate({ condition: "postPayment", direction: "import" })).toBe(false);
    expect(isImportAdvanceCoverageGate({ paymentMethod: "post_payment", direction: "import" })).toBe(false);
    expect(isImportAdvanceCoverageGate({ direction: "export" })).toBe(false);
  });

  it("hides manager and provider payment_start on payment_received for import advance", () => {
    expect(
      hidesPaymentStartForImportAdvance({
        status: "payment_received",
        actionId: "mgr_payment_start",
        condition: "advance",
        direction: "import",
      }),
    ).toBe(true);
    expect(
      hidesPaymentStartForImportAdvance({
        status: "payment_received",
        actionId: "prov_payment_start",
        condition: "advance",
        direction: "import",
      }),
    ).toBe(true);
    expect(
      hidesPaymentStartForImportAdvance({
        status: "payment_received",
        actionId: "mgr_assign_provider",
        condition: "advance",
        direction: "import",
      }),
    ).toBe(false);
    expect(
      hidesPaymentStartForImportAdvance({
        status: "payment_received",
        actionId: "mgr_payment_start",
        condition: "postPayment",
        direction: "import",
      }),
    ).toBe(false);
  });

  it("exposes treasurer confirm CTA and nest bridge", () => {
    const ids = actionsFor("treasurer", "payment_received").map((a) => a.id);
    expect(ids).toContain("treas_confirm_payment");
    expect(appActionsFor("treasurer", "payment_received").map((a) => a.id)).toContain("treas_confirm_payment");
    expect(resolveDemoAction("treas_confirm_payment")).toEqual({ kind: "nest_confirm_payment" });
    expect(IMPORT_ADVANCE_AWAITS_TREASURER.length).toBeGreaterThan(10);
  });
});

describe("postpay RATE_ON_PP rate gate (IMP5)", () => {
  it("detects POSTPAY_RATE_ON_PP and rate_on_provider", () => {
    expect(isPostpayRateOnPP({ platformPostpayMode: "POSTPAY_RATE_ON_PP" })).toBe(true);
    expect(isPostpayRateOnPP({ rateOnProvider: true })).toBe(true);
    expect(isPostpayRateOnPP({ platformPostpayMode: "LEGACY" })).toBe(false);
    expect(isPostpayRateOnPP({})).toBe(false);
  });

  it("treats blank rate as empty", () => {
    expect(isRateEmpty(undefined)).toBe(true);
    expect(isRateEmpty({})).toBe(true);
    expect(isRateEmpty({ value: "  " })).toBe(true);
    expect(isRateEmpty({ value: "95.5" })).toBe(false);
  });

  it("blocks mgr_advance_signing on payment_sent without rate for RATE_ON_PP", () => {
    expect(
      blocksAdvanceSigningWithoutRate({
        status: "payment_sent",
        actionId: "mgr_advance_signing",
        platformPostpayMode: "POSTPAY_RATE_ON_PP",
        rate: {},
      }),
    ).toBe(true);
    expect(
      blocksAdvanceSigningWithoutRate({
        status: "payment_sent",
        actionId: "mgr_advance_signing",
        rateOnProvider: true,
        rate: { value: "90" },
      }),
    ).toBe(false);
    expect(
      blocksAdvanceSigningWithoutRate({
        status: "payment_sent",
        actionId: "mgr_report_signing",
        platformPostpayMode: "POSTPAY_RATE_ON_PP",
        rate: {},
      }),
    ).toBe(false);
    expect(
      blocksAdvanceSigningWithoutRate({
        status: "payment_sent",
        actionId: "mgr_advance_signing",
        platformPostpayMode: "LEGACY",
        rate: {},
      }),
    ).toBe(false);
    expect(ADVANCE_SIGNING_NEEDS_RATE.length).toBeGreaterThan(10);
  });

  it("exposes mgr_advance_signing on payment_sent for manager", () => {
    const ids = actionsFor("manager", "payment_sent").map((a) => a.id);
    expect(ids).toContain("mgr_advance_signing");
  });
});

describe("manager payment/refund bridge", () => {
  it("maps provider assign and payment transitions", () => {
    expect(resolveDemoAction("mgr_assign_provider")).toEqual({ kind: "assign_provider" });
    expect(resolveDemoAction("mgr_payment_received")).toEqual({
      kind: "transition",
      coreAction: "payment_received",
    });
    expect(resolveDemoAction("mgr_payment_start")).toEqual({
      kind: "transition",
      coreAction: "payment_start",
    });
  });

  it("maps refund side effects to refund API", () => {
    expect(resolveDemoAction("mgr_refund_init")).toEqual({ kind: "refund_init" });
    expect(resolveDemoAction("mgr_refund_start")).toEqual({ kind: "refund_start" });
    expect(resolveDemoAction("mgr_refund_file")).toEqual({ kind: "refund_file" });
    expect(resolveDemoAction("mgr_refund_sent")).toEqual({ kind: "refund_sent" });
    expect(resolveDemoAction("mgr_refund_cancel")).toEqual({ kind: "refund_cancel" });
  });

  it("exposes payment_received and refund CTAs for manager", () => {
    const paymentReceived = actionsFor("manager", "payment_received").map((a) => a.id);
    expect(paymentReceived).toContain("mgr_assign_provider");
    expect(paymentReceived).toContain("mgr_assign_deadline");
    expect(paymentReceived).toContain("mgr_payment_start");
    expect(paymentReceived).toContain("mgr_refund_init");

    const refundWaiting = actionsFor("manager", "payment_refund_waiting").map((a) => a.id);
    expect(refundWaiting).toContain("mgr_refund_start");

    const refundProcessing = actionsFor("manager", "payment_refund_processing").map((a) => a.id);
    expect(refundProcessing).toContain("mgr_refund_file");
    expect(refundProcessing).toContain("mgr_refund_sent");
  });

  it("exposes manager_checking after provider return", () => {
    const checking = actionsFor("manager", "manager_checking").map((a) => a.id);
    expect(checking).toContain("mgr_payment_start");
    expect(checking).toContain("mgr_cancel");
  });

  it("exposes provider payment execution CTAs", () => {
    const processing = actionsFor("provider", "payment_processing").map((a) => a.id);
    expect(processing).toContain("prov_payment_sent");
    expect(processing).toContain("prov_payment_return");
  });
});
