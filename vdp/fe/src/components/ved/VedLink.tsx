import { Link, type LinkProps } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import { usePlatformBasePath } from "@/lib/ved/platform-mode";

type VedLinkProps = Omit<LinkProps, "to"> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "children"> & {
    segment: string;
    children: ReactNode;
  };

/** Link with `/demo` prefix in demo mode, root paths in app mode. */
export function VedLink({ segment, children, ...rest }: VedLinkProps) {
  const base = usePlatformBasePath();
  const to = `${base}${segment}` as "/forms";
  return (
    <Link to={to} {...rest}>
      {children}
    </Link>
  );
}

/** Typed link to form detail card. */
export function VedFormLink({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const base = usePlatformBasePath();
  const to = `${base}/forms/$id` as "/forms/$id";
  return (
    <Link to={to} params={{ id }} className={className}>
      {children}
    </Link>
  );
}
