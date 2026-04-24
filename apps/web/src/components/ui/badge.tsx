export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  const map = {
    neutral: "bg-slate-800 text-slate-200 border-slate-600",
    success: "bg-emerald-900/60 text-emerald-200 border-emerald-700",
    warning: "bg-amber-900/50 text-amber-100 border-amber-700",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}
