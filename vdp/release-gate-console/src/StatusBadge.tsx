export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "promoting" || status === "rolling_back"
      ? "badge-work"
      : status === "healthy" || status === "ok"
        ? "badge-done"
        : status === "failed"
          ? "badge-return"
          : "badge-wait";
  return <span className={`badge ${tone}`}>{status || "unknown"}</span>;
}
