import { useEffect, useState } from "react";

/**
 * True when viewport matches mobile breakpoint (max-width 639px).
 * Shared by file pick and extraction review shell.
 * Pass `refreshKey` (e.g. dialog `open`) to re-sample when media change events may be missed.
 */
export function useIsMobileViewport(refreshKey?: unknown): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [refreshKey]);
  return mobile;
}
