import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Единое модальное окно для всех системных диалогов интерфейса. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | undefined;
  children?: ReactNode | undefined;
  footer?: ReactNode | undefined;
  wide?: boolean | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={wide ? "sm:max-w-2xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter className="gap-2">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

export function ModalButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "danger" | "quiet" | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}) {
  const cls =
    variant === "danger"
      ? "bg-destructive text-destructive-foreground"
      : variant === "quiet"
        ? "bg-card text-foreground shadow-[0_0_0_1px_var(--input)] hover:bg-muted"
        : "bg-primary text-primary-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 ${cls} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
