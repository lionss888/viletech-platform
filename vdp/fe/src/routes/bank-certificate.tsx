import { createFileRoute } from "@tanstack/react-router";

import { BankCertificatePage } from "@/components/ved/pages/bank-certificate-page";

export const Route = createFileRoute("/bank-certificate")({
  head: () => ({
    meta: [{ title: "Справка о совершении сделки — ⚡ Веди ВЭД ₽" }],
  }),
  component: BankCertificatePage,
});
