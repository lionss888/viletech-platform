import { useMemo } from "react";

import { usePlatformBasePath } from "./platform-mode";

/** Path helpers for app vs demo route trees. */
export function useVedPaths() {
  const base = usePlatformBasePath();
  return useMemo(
    () => ({
      dashboard: `${base}/dashboard`,
      forms: `${base}/forms`,
      formsNew: `${base}/forms/new`,
      organizations: `${base}/organizations`,
      documents: `${base}/documents`,
      counterparties: `${base}/counterparties`,
      admin: `${base}/admin`,
      providers: `${base}/providers`,
      codes: `${base}/codes`,
      currencies: `${base}/currencies`,
      countries: `${base}/countries`,
      complianceTools: `${base}/compliance-tools`,
      testing: `${base}/testing`,
      profile: `${base}/profile`,
      chats: `${base}/chats`,
      formDetail: (id: string) => `${base}/forms/${id}`,
    }),
    [base],
  );
}
