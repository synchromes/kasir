import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Pill delta persentase (naik/turun) — dipakai kartu statistik di dashboard
// desktop & halaman Laporan. invert=true membalik makna warna (mis. kenaikan
// pengeluaran dianggap buruk, jadi merah).
export function DeltaPill({ value, invert = false, compact = false }: { value: number | null; invert?: boolean; compact?: boolean }) {
  if (value === null) {
    return <span className="rounded-full border border-outline-variant px-2.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">-</span>;
  }
  const good = invert ? value <= 0 : value >= 0;
  const magnitude = Math.abs(value);
  const label = compact && magnitude >= 1000
    ? new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(magnitude)
    : magnitude.toFixed(1);
  const fullLabel = `${value >= 0 ? "Naik" : "Turun"} ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(magnitude)}%`;
  return (
    <span
      title={fullLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        good ? "bg-secondary-container text-on-secondary-container" : "bg-destructive-container text-on-destructive-container"
      )}
    >
      {value >= 0 ? <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" /> : <ArrowDownRight className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span aria-hidden="true">{label}%</span>
      <span className="sr-only">{fullLabel}</span>
    </span>
  );
}
