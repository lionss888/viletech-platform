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

/** Resolves catalog rows: API data when non-empty, else static seed (≥30 per registry). */
export function resolveCatalogBundle(
  mode: CatalogSourceMode,
  api: Partial<CatalogBundle>,
): CatalogBundle {
  if (mode === "demo") {
    return STATIC_SEED;
  }
  return {
    providers: (api.providers?.length ?? 0) > 0 ? api.providers! : STATIC_SEED.providers,
    currencies: (api.currencies?.length ?? 0) > 0 ? api.currencies! : STATIC_SEED.currencies,
    hsCodes: (api.hsCodes?.length ?? 0) > 0 ? api.hsCodes! : STATIC_SEED.hsCodes,
    countries: STATIC_SEED.countries,
    complianceTools: STATIC_SEED.complianceTools,
  };
}

export function staticCatalogSeed(): CatalogBundle {
  return STATIC_SEED;
}
