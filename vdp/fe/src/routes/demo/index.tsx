import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/demo/")({
  component: () => <Navigate to="/demo/dashboard" />,
});
