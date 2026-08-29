import { describe, expect, it } from "vitest";

import { actionsFor } from "./actions";
import { resolveDemoAction } from "./action-bridge";
import {
  blocksPaymentStartWithoutProvider,
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
