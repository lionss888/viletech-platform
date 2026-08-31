import { createFileRoute, redirect } from "@tanstack/react-router";

/** Quick role picker lives under /demo — keep app /start from mixing mock session into JWT contour. */
export const Route = createFileRoute("/start")({
  beforeLoad: () => {
    throw redirect({ to: "/demo/start" });
  },
});
