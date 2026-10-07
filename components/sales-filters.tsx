"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui";

const METHOD_OPTIONS = [
  { value: "", label: "Semua Metode" },
  { value: "CASH", label: "Tunai" },
  { value: "QRIS", label: "QRIS" },
  { value: "TRANSFER", label: "Transfer" },
];

const selectCls =
  "h-11 w-full cursor-pointer rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function SalesFilters({
  q = "",
  method = "",
  from = "",
  to = "",
}: {
  q?: string;
  method?: string;
  from?: string;
  to?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Input pencarian sengaja uncontrolled (defaultValue) agar teks yang sedang
  // diketik tidak pernah tertimpa prop setelah navigasi server. Select/tanggal
  // bersifat controlled dengan sinkronisasi render-time.
  const searchRef = React.useRef<HTMLInputElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bersihkan timer debounce yang tertunda saat unmount agar navigasi tidak
  // ditarik kembali ke halaman ini.
  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const [methodVal, setMethodVal] = React.useState(method);
  const [fromVal, setFromVal] = React.useState(from);
  const [toVal, setToVal] = React.useState(to);
  const [prev, setPrev] = React.useState({ method, from, to });
  if (prev.method !== method || prev.from !== from || prev.to !== to) {
    setPrev({ method, from, to });
    setMethodVal(method);
    setFromVal(from);
    setToVal(to);
  }

  function push(changes: Record<string, string>) {
    // Baca dari window.location.search saat dipanggil (bukan closure) agar
    // debounce yang tertunda tidak membuang filter yang baru dipilih user
    // (race antara ketikan pencarian dan perubahan select/tanggal).
    const u = new URLSearchParams(window.location.search);
    u.set("page", "1");
    for (const [k, v] of Object.entries(changes)) {
      if (v) u.set(k, v);
      else u.delete(k);
    }
    router.replace(`${pathname}?${u.toString()}`);
  }

  function onSearchChange() {
    const v = searchRef.current?.value ?? "";
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push({ q: v }), 350);
  }

  function onSelectChange(key: "method" | "from" | "to") {
    return (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
      const v = e.target.value;
      if (key === "method") setMethodVal(v);
      else if (key === "from") setFromVal(v);
      else setToVal(v);
      push({ [key]: v });
    };
  }

  function reset() {
    if (timer.current) clearTimeout(timer.current);
    if (searchRef.current) searchRef.current.value = "";
    setMethodVal("");
    setFromVal("");
    setToVal("");
    push({ q: "", method: "", from: "", to: "" });
  }

  const hasFilter = Boolean(q || method || from || to);

  return (
    <div className="flex flex-col gap-3 border-b border-outline-variant bg-surface-container-lowest p-4 md:flex-row md:items-end">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-semibold text-on-surface-variant">Cari Transaksi</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
          <Input
            ref={searchRef}
            type="search"
            defaultValue={q}
            onChange={onSearchChange}
            placeholder="Cari nomor invoice atau nama pelanggan..."
            className="h-11 bg-surface pl-9 text-sm shadow-none"
          />
        </div>
      </div>
      <div className="w-full md:w-48">
        <label className="mb-1 block text-xs font-semibold text-on-surface-variant">Metode Pembayaran</label>
        <select value={methodVal} onChange={onSelectChange("method")} className={selectCls}>
          {METHOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="w-full md:w-44">
        <label className="mb-1 block text-xs font-semibold text-on-surface-variant">Dari Tanggal</label>
        <input type="date" value={fromVal} onChange={onSelectChange("from")} className={selectCls} />
      </div>
      <div className="w-full md:w-44">
        <label className="mb-1 block text-xs font-semibold text-on-surface-variant">Sampai Tanggal</label>
        <input type="date" value={toVal} onChange={onSelectChange("to")} className={selectCls} />
      </div>
      {hasFilter && (
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      )}
    </div>
  );
}
