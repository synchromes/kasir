"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Point = { label: string; total: number };

export default function SalesChart() {
  const [data, setData] = useState<Point[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/reports/sales-trend", { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat data penjualan");
        return r.json();
      })
      .then((d: unknown) => {
        if (!Array.isArray(d)) throw new Error("Data tidak valid");
        setData(d as Point[]);
      })
      .catch((e: unknown) => {
        if ((e as Error)?.name === "AbortError") return;
        setError("Gagal memuat grafik penjualan.");
      });
    return () => ctrl.abort();
  }, []);

  if (error) {
    return (
      <div className="flex h-36 items-center justify-center rounded-lg bg-muted/50 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (data === null)
    return (
      <div className="flex h-64 items-center justify-center gap-2 rounded-lg bg-muted text-sm text-muted-foreground" role="status" aria-live="polite">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-outline-variant border-t-primary" aria-hidden />
        Memuat grafik penjualan...
      </div>
    );

  if (!data.length) {
    return (
      <div className="flex h-36 items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
        Belum ada data penjualan
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <Tooltip
            formatter={(v) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v))}
            labelStyle={{ color: "var(--foreground)" }}
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
          />
          <Area type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2} fill="url(#sales)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}