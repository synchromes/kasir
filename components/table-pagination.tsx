"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PER_OPTIONS = [10, 20, 50, 100];
// Preferensi global pengguna (bukan per-tabel): nilai tersimpan berlaku untuk
// semua halaman. URL ?per= eksplisit (mis. tautan dibagikan) tetap menang.
const PER_KEY = "kasir-per-page";

function readSavedPer(options: number[]): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PER_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return options.includes(n) ? n : null;
  } catch {
    return null;
  }
}

function savePer(v: number) {
  try {
    window.localStorage.setItem(PER_KEY, String(v));
  } catch {
    // localStorage tidak tersedia (private mode/quota) — abaikan.
  }
}

const navBtn =
  "flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant transition-colors hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-40";

export function TablePagination({
  total,
  page,
  per,
  unit = "baris",
  onPageChange,
  onPerPageChange,
  perOptions = PER_OPTIONS,
}: {
  /** Total rows in the (filtered) dataset. */
  total: number;
  /** Current 1-based page. Callers should clamp it to [1, totalPages]. */
  page: number;
  /** Rows per page. */
  per: number;
  /** Noun used in "Menampilkan X-Y dari Z {unit}". */
  unit?: string;
  /** State mode (client components): fired when the page changes. */
  onPageChange?: (page: number) => void;
  /** State mode: fired when the rows-per-page select changes (caller resets to page 1). */
  onPerPageChange?: (per: number) => void;
  perOptions?: number[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  // Server-rendered pages keep pagination state in the URL: pass no callbacks
  // and every control becomes a <Link> that preserves the other query params.
  const linkMode = !onPageChange;

  // Terapkan preferensi "baris per halaman" tersimpan sekali saat mount:
  // - mode link: URL tak punya ?per= → replace URL dengan nilai tersimpan.
  // - mode state: panggil onPerPageChange agar parent me-reslice.
  const appliedSaved = React.useRef(false);
  React.useEffect(() => {
    if (appliedSaved.current) return;
    appliedSaved.current = true;
    const saved = readSavedPer(perOptions);
    if (saved === null || saved === per) return;
    if (linkMode) {
      if (!searchParams.has("per")) {
        const u = new URLSearchParams(searchParams.toString());
        u.set("page", "1");
        u.set("per", String(saved));
        router.replace(`${pathname}?${u.toString()}`);
      }
    } else {
      onPerPageChange?.(saved);
    }
  }, [linkMode, onPerPageChange, pathname, per, perOptions, router, searchParams]);

  const totalPages = Math.max(1, Math.ceil(total / per));
  const from = total === 0 ? 0 : (page - 1) * per + 1;
  const to = Math.min(page * per, total);

  const [goPage, setGoPage] = React.useState(String(page));
  const [prevPage, setPrevPage] = React.useState(page);
  // Keep the go-to-page input in sync when the page prop changes (e.g. after
  // a server navigation) without syncing state inside an effect.
  if (prevPage !== page) {
    setPrevPage(page);
    setGoPage(String(page));
  }

  function hrefFor(p: number, perPage: number) {
    const u = new URLSearchParams(searchParams.toString());
    u.set("page", String(p));
    u.set("per", String(perPage));
    return `${pathname}?${u.toString()}`;
  }

  function gotoPage(p: number) {
    const clamped = Math.min(Math.max(Math.round(p) || 1, 1), totalPages);
    if (linkMode) router.push(hrefFor(clamped, per));
    else onPageChange?.(clamped);
  }

  function handlePerChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = Number(e.target.value);
    savePer(v);
    if (linkMode) router.push(hrefFor(1, v));
    else onPerPageChange?.(v);
  }

  function renderNavBtn(target: number, disabled: boolean, label: string, icon: React.ReactNode, key: string) {
    if (linkMode) {
      if (disabled) {
        return (
          <span key={key} aria-disabled="true" className={cn(navBtn, "cursor-default pointer-events-none")}>
            {icon}
          </span>
        );
      }
      return (
        <Link key={key} href={hrefFor(target, per)} aria-label={label} className={cn(navBtn, "cursor-pointer")}>
          {icon}
        </Link>
      );
    }
    return (
      <button key={key} type="button" disabled={disabled} aria-label={label} onClick={() => onPageChange?.(target)} className={cn(navBtn, "cursor-pointer")}>
        {icon}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-outline-variant bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-on-surface-variant">
        Menampilkan {from}-{to} dari {total} {unit}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {totalPages > 1 && (
          <>
            <span className="text-sm text-on-surface-variant">
              Halaman <b className="font-semibold text-on-surface">{page}</b> dari{" "}
              <b className="font-semibold text-on-surface">{totalPages}</b>
            </span>
            <label className="flex items-center gap-2 text-sm text-on-surface-variant">
              Ke halaman:
              <input
                inputMode="numeric"
                value={goPage}
                onChange={(e) => setGoPage(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") gotoPage(Number(goPage));
                }}
                className="h-11 w-16 rounded-lg border border-input bg-surface px-3 text-center text-sm text-on-surface focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </>
        )}

        <div className="relative">
          <select
            value={per}
            onChange={handlePerChange}
            aria-label="Baris per halaman"
            className="h-11 w-16 cursor-pointer appearance-none rounded-lg border border-input bg-surface pl-3 pr-7 text-sm font-medium text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {perOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            {renderNavBtn(1, page <= 1, "Halaman pertama", <ChevronsLeft className="h-5 w-5" />, "first")}
            {renderNavBtn(page - 1, page <= 1, "Halaman sebelumnya", <ChevronLeft className="h-5 w-5" />, "prev")}
            {renderNavBtn(page + 1, page >= totalPages, "Halaman berikutnya", <ChevronRight className="h-5 w-5" />, "next")}
            {renderNavBtn(totalPages, page >= totalPages, "Halaman terakhir", <ChevronsRight className="h-5 w-5" />, "last")}
          </div>
        )}
      </div>
    </div>
  );
}
