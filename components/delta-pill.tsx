import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Pill delta persentase (naik/turun) — dipakai kartu statistik di dashboard
// desktop & halaman Laporan. invert=true membalik makna warna (mis. kenaikan
// pengeluaran dianggap buruk, jadi merah).
export function DeltaPill({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) {
    return <span className="rounded-full border border-outline-variant px-2.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">-</span>;
  }
  const good = invert ? value <= 0 : value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        good ? "bg-secondary-container text-on-secondary-container" : "bg-destructive-container text-on-destructive-container"
      )}
    >
      {value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}
