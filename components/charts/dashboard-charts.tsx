"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { paymentColors } from "@/lib/colors";

const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

type TrendPoint = { label: string; total: number; profit: number };

export function TrendArea({ data }: { data: TrendPoint[] }) {
  const [mode, setMode] = useState<"total" | "profit">("total");
  const color = mode === "total" ? "var(--primary)" : "var(--accent)";
  const gradId = "dash-trend-grad";

  const btn = (m: "total" | "profit", label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={cn(
        "cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
        mode === m
          ? "bg-surface-container-lowest text-foreground shadow-sm"
          : "text-on-surface-variant opacity-70 hover:opacity-100"
      )}
    >
      {label}
    </button>
  );

  if (!data.length) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        Tidak ada data
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="flex rounded-full bg-muted p-1">
          {btn("total", "Pendapatan")}
          {btn("profit", "Laba")}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v: number) =>
                v >= 1_000_000
                  ? `${Math.round(v / 1_000_000)}jt`
                  : v >= 1_000
                    ? `${Math.round(v / 1_000)}rb`
                    : String(v)
              }
            />
            <Tooltip
              formatter={(v) => money.format(Number(v))}
              labelStyle={{ color: "var(--foreground)" }}
              contentStyle={tooltipStyle}
            />
            <Area
              type="monotone"
              dataKey={mode}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MiniDonut({
  data,
  centerValue,
  centerLabel,
}: {
  data: { key: string; name: string; value: number }[];
  centerValue: string;
  centerLabel: string;
}) {
  if (!data.length) return null;
  return (
    <div className="relative h-28 w-28">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={32}
            outerRadius={50}
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((item) => (
              <Cell key={item.key} fill={paymentColors[item.key]?.fill ?? "var(--outline)"} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-sm font-bold">{centerValue}</span>
        <span className="text-[9px] text-on-surface-variant">{centerLabel}</span>
      </div>
    </div>
  );
}

export function SparkArea({ data }: { data: { value: number }[] }) {
  if (!data.length) return null;
  return (
    <div className="h-16">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="dash-spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#dash-spark)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeeklyBars({
  data,
}: {
  data: { label: string; tunai: number; nontunai: number }[];
}) {
  if (!data.length) {
    return (
      <div className="flex h-36 items-center justify-center text-sm text-muted-foreground">
        Tidak ada data
      </div>
    );
  }
  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }} barGap={3}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            formatter={(v) => money.format(Number(v))}
            contentStyle={tooltipStyle}
            cursor={{ fill: "color-mix(in srgb, var(--muted) 45%, transparent)" }}
          />
          <Bar dataKey="tunai" name="Tunai" fill={paymentColors.CASH.fill} radius={[3, 3, 0, 0]} maxBarSize={14} />
          <Bar dataKey="nontunai" name="Non-tunai" fill="var(--on-surface-variant)" radius={[3, 3, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
