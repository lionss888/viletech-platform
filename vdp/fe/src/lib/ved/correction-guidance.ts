/** Guidance for client on form_waiting_corrections from reject mark/text. */

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

/** User-facing correction hints from reject payload. */
export function correctionHints(mark?: string, text?: string): CorrectionHint[] {
  const hints: CorrectionHint[] = [];
  const markTrim = (mark ?? "").trim();
  const textTrim = (text ?? "").trim();
  if (markTrim) {
    hints.push({
      id: "mark",
      title: markTrim,
      section: isRateCorrection(markTrim) ? "rate" : "general",
    });
  }
  if (textTrim && textTrim !== markTrim) {
    hints.push({
      id: "text",
      title: textTrim,
      section: isRateCorrection(undefined, textTrim) ? "rate" : "general",
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
