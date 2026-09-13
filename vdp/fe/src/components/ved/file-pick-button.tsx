import { useEffect, useRef, useState } from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Determines mobile viewport to open file picker via bottom sheet on small screens.
 */
function useIsMobileViewport(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export type FilePickButtonProps = {
  file: File | null;
  pickLabel: string;
  testId: string;
  onPick: (file: File | null) => void;
  /** MIME accept pattern, defaults to ".pdf,application/pdf" */
  accept?: string;
  /** Hint text shown when no file selected */
  hint?: string;
};

/**
 * Clickable zone for file upload with mobile bottom-sheet support.
 *
 * DOM invariant: input is a **sibling** of the clickable zone (not a child),
 * so programmatic `click()` does not bubble back through the zone's handler
 * and accidentally cancel the OS file dialog via `preventDefault`.
 *
 * testid contract: `${testId}`, `${testId}-zone`, `${testId}-button`, `${testId}-sheet-pick`.
 */
export function FilePickButton({
  file,
  pickLabel,
  testId,
  onPick,
  accept = ".pdf,application/pdf",
  hint = "PDF, до 15 МБ — нажмите в любом месте блока",
}: FilePickButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobileViewport();
  const [sheetOpen, setSheetOpen] = useState(false);

  function openPicker() {
    inputRef.current?.click();
  }

  function activate(e: React.MouseEvent | React.KeyboardEvent) {
    // Space scrolls the page unless prevented; mouse must not preventDefault —
    // a nested file-input click that bubbles here would cancel the OS dialog.
    if ("key" in e) e.preventDefault();
    e.stopPropagation();
    if (isMobile) setSheetOpen(true);
    else openPicker();
  }

  return (
    <>
      {/* Input lives outside the clickable zone so programmatic click() does not
          re-enter activate() via bubbling and cancel the file dialog. */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        data-testid={testId}
        className="sr-only"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label={file ? `${pickLabel}: ${file.name}` : pickLabel}
        data-testid={`${testId}-zone`}
        onClick={activate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") activate(e);
        }}
        className={cn(
          "flex cursor-pointer flex-wrap items-center gap-3 rounded-md border border-dashed px-3 py-3 transition-colors",
          "hover:border-primary/60 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          file ? "border-done/50 bg-done-soft/40" : "border-border bg-muted/30",
        )}
      >
        <span
          className="pointer-events-none rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          data-testid={`${testId}-button`}
        >
          {file ? "Заменить файл" : pickLabel}
        </span>
        <span
          className={cn(
            "pointer-events-none min-w-0 flex-1 truncate text-xs",
            file ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {file ? `✓ ${file.name}` : hint}
        </span>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader className="text-left">
            <SheetTitle>{pickLabel}</SheetTitle>
            <SheetDescription>{file ? file.name : hint.split(" — ")[0]}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid gap-2 pb-2">
            <button
              type="button"
              data-testid={`${testId}-sheet-pick`}
              className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              onClick={() => {
                setSheetOpen(false);
                setTimeout(openPicker, 120);
              }}
            >
              {file ? "Заменить файл" : "Выбрать файл"}
            </button>
            {file && (
              <button
                type="button"
                className="w-full rounded-md bg-destructive-soft px-4 py-3 text-sm font-semibold text-destructive"
                onClick={() => {
                  onPick(null);
                  setSheetOpen(false);
                }}
              >
                Убрать файл
              </button>
            )}
            <button
              type="button"
              className="w-full rounded-md bg-muted px-4 py-3 text-sm font-semibold text-foreground"
              onClick={() => setSheetOpen(false)}
            >
              Отмена
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
