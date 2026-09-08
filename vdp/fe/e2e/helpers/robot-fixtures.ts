import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

export type RobotDealKind = "advance" | "shipment";

export type RobotPack = {
  pack_id: string;
  deal_kind: RobotDealKind;
  status?: string;
  organization: { name: string; inn: string; country: string };
  counterparty: { name: string; country: string; inn: string };
  provider: { seed_id: string; label: string };
  deal_fields: {
    currency: string;
    invoice_amount: string;
    contract_number: string;
    contract_date: string;
    hs_codes: string[];
    direction: string;
  };
  docs: {
    invoice_pdf: string;
    contract_pdf: string;
    order_pdf: string;
    report_pdf: string;
    shipment_pdf: string;
  };
};

type RootManifest = {
  default_pack: string;
  packs: Record<string, { path: string; label: string }>;
  forbidden_mock_names: string[];
};

/** Resolve robot-fixtures root (compose-playwright mounts /testdata). */
export function robotFixturesRoot(): string {
  if (process.env.VDP_ROBOT_FIXTURES_ROOT) {
    return resolve(process.env.VDP_ROBOT_FIXTURES_ROOT);
  }
  // fe/e2e/helpers → ../../../testdata/robot-fixtures (vdp root)
  const fromFe = resolve(__dirname, "../../../testdata/robot-fixtures");
  if (existsSync(fromFe)) {
    return fromFe;
  }
  const fromCwd = resolve(process.cwd(), "testdata/robot-fixtures");
  if (existsSync(fromCwd)) {
    return fromCwd;
  }
  throw new Error(
    "robot fixtures root not found; set VDP_ROBOT_FIXTURES_ROOT or run from vdp with testdata/robot-fixtures",
  );
}

export function activeRobotPackId(): string {
  const raw = (process.env.VDP_ROBOT_FIXTURE_PACK ?? "template").trim().toLowerCase();
  return raw === "customer" ? "customer" : "template";
}

export function loadRobotPack(packId = activeRobotPackId()): { pack: RobotPack; packDir: string } {
  const root = robotFixturesRoot();
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as RootManifest;
  const entry = manifest.packs[packId];
  if (!entry) {
    throw new Error(`unknown robot pack: ${packId}`);
  }
  const packDir = join(root, entry.path);
  const packPath = join(packDir, "pack.json");
  if (!existsSync(packPath)) {
    throw new Error(`missing pack.json for ${packId} at ${packPath}`);
  }
  const pack = JSON.parse(readFileSync(packPath, "utf8")) as RobotPack;
  if (packId === "customer" && pack.status === "awaiting_import") {
    throw new Error(
      "customer pack is awaiting_import — run scripts/robot-fixtures-import.sh or use VDP_ROBOT_FIXTURE_PACK=template",
    );
  }
  for (const forbidden of manifest.forbidden_mock_names) {
    const blob = JSON.stringify(pack);
    if (blob.includes(forbidden)) {
      throw new Error(`robot pack ${packId} contains forbidden mock name: ${forbidden}`);
    }
  }
  return { pack, packDir };
}

export function robotDocPath(packDir: string, relative: string): string {
  const full = join(packDir, relative);
  if (!existsSync(full)) {
    throw new Error(`missing robot doc: ${full}`);
  }
  return full;
}

export function readRobotPdf(packDir: string, relative: string): Buffer {
  return readFileSync(robotDocPath(packDir, relative));
}
