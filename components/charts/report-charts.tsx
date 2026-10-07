"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

import { paymentColors } from "@/lib/colors";

export const DONUT_COLORS = Array.from({ length: 6 }, (_, i) => `var(--chart-${i + 1})`);

const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 };

export function DonutChart({
  data,
  centerValue,
  centerLabel,
}: {
  data: { name: string; value: number }[];
  centerValue: string;
  centerLabel: string;
}) {
  if (!data.length) {
    return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Tidak ada data</div>;
  }
  return (
    <div className="relative mx-auto h-48 w-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={86}
            paddingAngle={data.length > 1 ? 2 : 0}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => money.format(Number(v))} contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-bold">{centerValue}</span>
        <span className="text-[11px] text-on-surface-variant">{centerLabel}</span>
      </div>
    </div>
  );
}

export function TrendBar({ data }: { data: { label: string; total: number; profit: number }[] }) {
  if (!data.length) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Tidak ada data</div>;
  }
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <Tooltip formatter={(v) => money.format(Number(v))} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: "var(--foreground)" }}>{value}</span>} />
          <Bar dataKey="total" name="Pendapatan" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="profit" name="Laba" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryBar({ data }: { data: { name: string; total: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <Tooltip
            formatter={(v) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v))}
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
          />
          <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MethodPie({ data }: { data: { key: string; name: string; value: number }[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${Math.round(percent! * 100)}%`}>
            {data.map((item) => <Cell key={item.key} fill={paymentColors[item.key]?.fill ?? "var(--outline)"} />)}
          </Pie>
          <Tooltip
            formatter={(v) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v))}
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
