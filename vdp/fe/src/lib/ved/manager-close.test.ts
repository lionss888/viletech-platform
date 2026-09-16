import { describe, expect, it } from "vitest";

import { actionsFor } from "./actions";
import { resolveDemoAction } from "./action-bridge";
import { isActive } from "./health";

describe("manager report/close bridge", () => {
  it("maps report and shipment transitions", () => {
    expect(resolveDemoAction("mgr_report_signing")).toEqual({
      kind: "transition",
      coreAction: "report_signing",
    });
    expect(resolveDemoAction("upload_report")).toEqual({
      kind: "file_then_transition",
      coreAction: "report_upload",
      docKind: "report",
    });
    expect(resolveDemoAction("mgr_report_start")).toEqual({
      kind: "transition",
      coreAction: "report_start",
    });
    expect(resolveDemoAction("mgr_report_accept")).toEqual({
      kind: "transition",
      coreAction: "report_accept",
    });
    expect(resolveDemoAction("mgr_shipment_waiting")).toEqual({
      kind: "transition",
      coreAction: "shipment_waiting",
    });
    expect(resolveDemoAction("upload_shipment")).toEqual({
      kind: "file_then_transition",
      coreAction: "shipment_upload",
      docKind: "shipment",
    });
    expect(resolveDemoAction("mgr_shipment_start")).toEqual({
      kind: "transition",
      coreAction: "shipment_start",
    });
    expect(resolveDemoAction("mgr_completed")).toEqual({
      kind: "transition",
      coreAction: "complete",
    });
    expect(resolveDemoAction("mgr_shipment_stop")).toEqual({
      kind: "transition",
      coreAction: "shipment_stop",
    });
  });

  it("exposes manager CTAs for report and shipment stages", () => {
    expect(actionsFor("manager", "payment_sent").map((a) => a.id)).toContain("mgr_report_signing");
    const paymentSent = actionsFor("manager", "payment_sent");
    const reportPrimary = paymentSent.find((a) => a.id === "mgr_report_signing");
    expect(reportPrimary?.tone).toBe("accent");
    const shipmentQuiet = paymentSent.find((a) => a.id === "mgr_shipment_waiting");
    expect(shipmentQuiet?.tone).toBe("quiet");

    const reportQueue = actionsFor("manager", "report_waiting_verification").map((a) => a.id);
    expect(reportQueue).toContain("mgr_report_start");

    const reportReview = actionsFor("manager", "report_verification");
    expect(reportReview.map((a) => a.id)).toContain("mgr_report_accept");
    const accept = reportReview.find((a) => a.id === "mgr_report_accept");
    expect(accept?.label).toBe("Подтвердить отчет и завершить сделку");
    expect(accept?.nextStatus).toBe("completed");

    const afterReport = actionsFor("manager", "report_accepted").map((a) => a.id);
    expect(afterReport).toContain("mgr_completed");
    expect(afterReport).toContain("mgr_shipment_waiting");
    const complete = actionsFor("manager", "report_accepted").find((a) => a.id === "mgr_completed");
    expect(complete?.tone).toBe("accent");

    const shipmentReview = actionsFor("manager", "shipment_verification").map((a) => a.id);
    expect(shipmentReview).toContain("mgr_completed");
    expect(shipmentReview).toContain("mgr_shipment_reject");
    expect(shipmentReview).toContain("mgr_shipment_stop");
  });

  it("exposes user upload CTAs for report and shipment", () => {
    expect(actionsFor("user", "report_waiting").map((a) => a.id)).toContain("upload_report");
    expect(actionsFor("user", "shipment_waiting").map((a) => a.id)).toContain("upload_shipment");
  });
});

describe("completed forms and dashboard stuck count", () => {
  it("treats completed as inactive for stuck metrics", () => {
    const closed = {
      id: "f1",
      status: "completed",
      updatedAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    } as import("./types").PaymentForm;
    expect(isActive(closed)).toBe(false);
  });
});
