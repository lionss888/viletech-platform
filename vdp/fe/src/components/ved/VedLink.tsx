import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { usePlatformBasePath } from "@/lib/ved/platform-mode";

type VedLinkProps = Omit<LinkProps, "to"> & {
  segment: string;
  children: ReactNode;
};

/** Link with `/demo` prefix in demo mode, root paths in app mode. */
export function VedLink({ segment, children, ...rest }: VedLinkProps) {
  const base = usePlatformBasePath();
  const to = `${base}${segment}` as LinkProps["to"];
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
  const to = `${base}/forms/$id` as LinkProps["to"];
  return (
    <Link to={to} params={{ id }} className={className}>
      {children}
    </Link>
  );
}
