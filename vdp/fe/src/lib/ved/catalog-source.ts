import type { ComplianceToolRecord, CountryRecord } from "./reference";
import type { ProviderRecord, CurrencyRecord, HsCodeRecord } from "./reference";
import {
  buildComplianceToolSeed,
  buildCountrySeed,
  buildCurrencySeed,
  buildHsCodeSeed,
  buildProviderSeed,
} from "./reference-seed";

export type CatalogSourceMode = "demo" | "api" | "static-fallback";

export type CatalogBundle = {
  providers: ProviderRecord[];
  currencies: CurrencyRecord[];
  hsCodes: HsCodeRecord[];
  countries: CountryRecord[];
  complianceTools: ComplianceToolRecord[];
};

const STATIC_SEED: CatalogBundle = {
  providers: buildProviderSeed(),
  currencies: buildCurrencySeed(),
  hsCodes: buildHsCodeSeed(),
  countries: buildCountrySeed(),
  complianceTools: buildComplianceToolSeed(),
};

/**
 * Resolves catalog rows for the UI.
 * Demo: full static seed. App/API: providers = API only (no mock bleed);
 * currencies/HS fall back to platform reference seed; countries/tools stay reference.
 */
export function resolveCatalogBundle(
  mode: CatalogSourceMode,
  api: Partial<CatalogBundle>,
): CatalogBundle {
  if (mode === "demo") {
    return STATIC_SEED;
  }
  return {
    providers: api.providers ?? [],
    currencies: (api.currencies?.length ?? 0) > 0 ? api.currencies! : STATIC_SEED.currencies,
    hsCodes: (api.hsCodes?.length ?? 0) > 0 ? api.hsCodes! : STATIC_SEED.hsCodes,
    countries: STATIC_SEED.countries,
    complianceTools: STATIC_SEED.complianceTools,
  };
}

/** VED helper: staticCatalogSeed. */
export function staticCatalogSeed(): CatalogBundle {
  return STATIC_SEED;
}
