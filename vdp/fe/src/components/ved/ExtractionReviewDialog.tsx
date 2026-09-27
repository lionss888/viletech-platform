import { Modal } from "@/components/ved/Modal";
import { ExtractionReviewPanel } from "@/components/ved/ExtractionReviewPanel";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobileViewport } from "@/lib/hooks/use-is-mobile-viewport";
import {
  extractionDialogTitle,
  extractionPanelMode,
  extractionShellVariant,
  parseExtractionResult,
} from "@/lib/ved/extraction";

export type ExtractionReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  invoiceJson?: string;
  role: string;
  status?: string;
  noDocuments?: boolean;
  hasDocuments?: boolean;
  canConfirm?: boolean;
  /** Test override for viewport branching. */
  forceMobile?: boolean;
  currencyOptions?: { value: string; label: string }[];
  hsOptions?: { value: string; label: string }[];
  formAmountMinor?: number;
  formCurrency?: string;
  documentKind?: string;
  onEnsureHsCode?: (code: string) => Promise<{ value: string; label: string } | null>;
};

/**
 * Extraction review surface: Modal on desktop, bottom Sheet on mobile.
 */
export function ExtractionReviewDialog({
  open,
  onOpenChange,
  formId,
  invoiceJson,
  role,
  status,
  noDocuments = false,
  hasDocuments = false,
  canConfirm = true,
  forceMobile,
  currencyOptions,
  hsOptions,
  formAmountMinor,
  formCurrency,
  documentKind,
  onEnsureHsCode,
}: ExtractionReviewDialogProps) {
  const mobileHook = useIsMobileViewport(open);
  const isMobile = forceMobile ?? mobileHook;
  const variant = extractionShellVariant(isMobile);
  const draft = parseExtractionResult(invoiceJson);
  const mode = extractionPanelMode({
    role,
    hasDraft: Boolean(draft),
    status,
    noDocuments,
    hasDocuments,
  });
  const title = extractionDialogTitle(mode);
  const description =
    mode === "review"
      ? "Проверьте позиции перед подтверждением. Статус заявки не меняется."
      : "Запуск и статус распознавания документов заявки.";

  const content = (
    <ExtractionReviewPanel
      formId={formId}
      invoiceJson={invoiceJson}
      role={role}
      status={status}
      noDocuments={noDocuments}
      hasDocuments={hasDocuments}
      canConfirm={canConfirm}
      currencyOptions={currencyOptions}
      hsOptions={hsOptions}
      formAmountMinor={formAmountMinor}
      formCurrency={formCurrency}
      documentKind={documentKind}
      onEnsureHsCode={onEnsureHsCode}
      embedded
      onConfirmed={() => onOpenChange(false)}
    />
  );

  if (variant === "sheet") {
    return (
      <div data-testid="extraction-review-sheet">
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-xl">
            <SheetHeader className="text-left">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </SheetHeader>
            <div className="mt-4 pb-2">{content}</div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div data-testid="extraction-review-modal">
      <Modal open={open} onOpenChange={onOpenChange} title={title} description={description} wide>
        {content}
      </Modal>
    </div>
  );
}
