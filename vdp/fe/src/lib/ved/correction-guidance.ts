/** Guidance for client on form_waiting_corrections from reject mark/text. */

import { isDocsCorrection } from "./counterparty-display";

export type CorrectionHint = {
  id: string;
  title: string;
  section: "params" | "documents" | "rate" | "general";
};

/** True when reject mark/text points at rate/commission fixes. */
export function isRateCorrection(mark?: string, text?: string): boolean {
  const blob = `${mark ?? ""} ${text ?? ""}`.toLowerCase();
  return /курс|rate|fx|обмен/.test(blob);
}

function hintSection(mark?: string, text?: string): CorrectionHint["section"] {
  if (isRateCorrection(mark, text)) return "rate";
  if (isDocsCorrection(mark, text)) return "documents";
  return "general";
}

/** User-facing correction hints from reject payload. */
export function correctionHints(mark?: string, text?: string): CorrectionHint[] {
  const hints: CorrectionHint[] = [];
  const markTrim = (mark ?? "").trim();
  const textTrim = (text ?? "").trim();
  if (markTrim) {
    hints.push({
      id: "mark",
      title: markTrim,
      section: hintSection(markTrim),
    });
  }
  if (textTrim && textTrim !== markTrim) {
    hints.push({
      id: "text",
      title: textTrim,
      section: hintSection(undefined, textTrim),
    });
  }
  if (hints.length === 0) {
    hints.push({
      id: "default",
      title: "Исправьте замечания проверяющего и отправьте заявку снова",
      section: "general",
    });
  }
  if (isRateCorrection(mark, text) && !hints.some((h) => h.section === "rate")) {
    hints.push({
      id: "rate",
      title: "Согласуйте курс в блоке ниже",
      section: "rate",
    });
  }
  if (isDocsCorrection(mark, text) && !hints.some((h) => h.section === "documents")) {
    hints.push({
      id: "docs",
      title: "Обновите или замените документы по замечанию — контрагент здесь ни при чём",
      section: "documents",
    });
  }
  return hints;
}

/** Wizard section title for a correction hint key. */
export function sectionLabel(section: CorrectionHint["section"]): string {
  switch (section) {
    case "params":
      return "Параметры заявки";
    case "documents":
      return "Документы";
    case "rate":
      return "Курс";
    default:
      return "Заявка";
  }
}
