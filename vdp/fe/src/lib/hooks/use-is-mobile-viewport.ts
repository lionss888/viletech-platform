import { useEffect, useState } from "react";

/**
 * True when viewport matches mobile breakpoint (max-width 639px).
 * Shared by file pick and extraction review shell.
 */
export function useIsMobileViewport(): boolean {
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
