"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Compass, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { firstVisible } from "@/lib/dom";
import { OPEN_GUIDE_EVENT, RESTART_TOUR_EVENT } from "@/components/guide-dialog";

type TourStep = { target: string; title: string; desc: string; openGuide?: string };

// Tur 3 langkah untuk pengguna baru: Kasir → Produk → Pengaturan.
const BASE_STEPS: TourStep[] = [
  {
    target: "kasir",
    title: "Mulai dari Kasir",
    desc: "Tombol Kasir membuka halaman penjualan baru. Pilih produk, atur diskon, lalu terima pembayaran Tunai, QRIS, atau Transfer di sini.",
  },
  {
    target: "products",
    title: "Kelola Produk & Inventaris",
    desc: "Menu Inventaris dipakai untuk menambah produk, mengunggah foto, mengatur harga, stok awal, dan stok minimum agar alert menipis bekerja.",
  },
  {
    target: "settings",
    title: "Atur Toko Anda",
    desc: "Di Pengaturan Anda bisa mengubah nama toko, alamat, pajak, tampilan struk, hingga QRIS pembayaran dinamis.",
  },
];

// Langkah ekstra khusus ADMIN: serah-terima ke dialog Panduan, kategori
// \"Pengguna (Admin)\", menu pengguna memang hanya tampil untuk akun admin.
const ADMIN_STEP: TourStep = {
  target: "guide",
  title: "Panduan Pengguna (Admin)",
  desc: "Menu Pengguna hanya tersedia untuk admin. Gunakan menu ini untuk menambah akun kasir dengan data toko terpisah. Buka panduan untuk langkah lengkapnya.",
  openGuide: "users",
};

const flagKey = (userId: number) => `kasir-tour-v1-${userId}`;

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true; // Mode privat: jangan memaksa tampil berulang.
  }
}
function writeFlag(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* abaikan */
  }
}

// Panduan langkah-demi-langkah saat pengguna baru pertama kali masuk:
// menyorot menu Kasir, Inventaris (Produk), dan Pengaturan secara berurutan
// (plus langkah admin ke dialog Panduan). Target dicari lewat atribut
// data-tour; yang dipakai adalah elemen yang TERLIHAT di viewport (sidebar
// desktop vs tab bawah/grid mobile), sehingga sorotan selalu tepat.
export function OnboardingTour({ userId, isAdmin = false }: { userId: number; isAdmin?: boolean }) {
  const steps = React.useMemo<TourStep[]>(() => (isAdmin ? [...BASE_STEPS, ADMIN_STEP] : BASE_STEPS), [isAdmin]);
  const [stepIdx, setStepIdx] = React.useState(0);
  const [active, setActive] = React.useState<TourStep | null>(null);
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  const [tipPos, setTipPos] = React.useState<{ top: number; left: number } | null>(null);
  const tipRef = React.useRef<HTMLDivElement>(null);
  const primaryBtnRef = React.useRef<HTMLButtonElement>(null);
  const restoreRef = React.useRef<HTMLElement | null>(null);
  const startedRef = React.useRef(false);
  const key = flagKey(userId);

  const finish = React.useCallback(() => {
    writeFlag(key);
    setActive(null);
  }, [key]);

  const goTo = React.useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(steps.length - 1, idx));
      setStepIdx(clamped);
      setActive(steps[clamped]);
    },
    [steps]
  );

  const findVisible = React.useCallback((tour: string) => firstVisible(`[data-tour="${tour}"]`), []);

  // Mulai dari step pertama yang targetnya terlihat (lewati yang absen).
  React.useEffect(() => {
    if (readFlag(key)) return;
    const t = window.setTimeout(() => {
      let i = 0;
      while (i < steps.length && !findVisible(steps[i].target)) i++;
      if (i < steps.length) goTo(i);
      else writeFlag(key);
    }, 900);
    return () => window.clearTimeout(t);
  }, [key, goTo, findVisible, steps]);

  // Dipicu tombol \"Ulangi tur\" di dialog Panduan: tampil kembali dari langkah
  // pertama yang targetnya tersedia (flag sudah dihapus oleh pemanggil).
  React.useEffect(() => {
    const onRestart = () => {
      let i = 0;
      while (i < steps.length && !findVisible(steps[i].target)) i++;
      if (i < steps.length) goTo(i);
    };
    window.addEventListener(RESTART_TOUR_EVENT, onRestart);
    return () => window.removeEventListener(RESTART_TOUR_EVENT, onRestart);
  }, [steps, goTo, findVisible]);

  // Ukur & ikuti kotak sorotan target (re-measure saat scroll/resize).
  React.useEffect(() => {
    if (!active) return;
    const el = findVisible(active.target);
    el?.scrollIntoView({ block: "center", inline: "center" });
    const measure = () => {
      const r = el ? el.getBoundingClientRect() : null;
      // Jangan re-render bila geometri tidak berubah (mis. scroll kecil).
      setRect((prev) => {
        if (
          r &&
          prev &&
          Math.abs(prev.left - r.left) < 0.5 &&
          Math.abs(prev.top - r.top) < 0.5 &&
          Math.abs(prev.width - r.width) < 0.5 &&
          Math.abs(prev.height - r.height) < 0.5
        ) {
          return prev;
        }
        return r;
      });
    };
    // setTimeout (bukan rAF) agar andal bahkan di tab/webview yang sedang
    // tidak aktif, dua kali sebagai pengaman setelah scrollIntoView.
    const t1 = window.setTimeout(measure, 60);
    const t2 = window.setTimeout(measure, 300);
    const onScroll = () => measure();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [active, findVisible]);

  // Navigasi maju/mundur, lewati step yang targetnya tidak tersedia.
  function handleNext() {
    for (let i = stepIdx + 1; i < steps.length; i++) {
      if (findVisible(steps[i].target)) {
        goTo(i);
        return;
      }
    }
    finish();
  }
  function handlePrev() {
    for (let i = stepIdx - 1; i >= 0; i--) {
      if (findVisible(steps[i].target)) {
        goTo(i);
        return;
      }
    }
  }

  // Tombol utama: langkah admin membuka dialog Panduan lalu menuntaskan tur.
  function handlePrimary() {
    if (active?.openGuide) {
      window.dispatchEvent(new CustomEvent(OPEN_GUIDE_EVENT, { detail: { category: active.openGuide } }));
      finish();
      return;
    }
    if (stepIdx >= steps.length - 1) finish();
    else handleNext();
  }

  // A11y: simpan fokus saat tur mulai, pulihkan saat selesai; fokuskan tombol
  // utama setiap ganti langkah; jebak Tab di dalam tooltip; Esc menutup.
  React.useEffect(() => {
    if (active && !startedRef.current) {
      startedRef.current = true;
      restoreRef.current = document.activeElement as HTMLElement | null;
    }
    if (!active && startedRef.current) {
      startedRef.current = false;
      restoreRef.current?.focus();
      restoreRef.current = null;
    }
  }, [active]);

  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        finish();
        return;
      }
      if (e.key === "Tab" && tipRef.current) {
        const focusables = Array.from(tipRef.current.querySelectorAll<HTMLElement>("button"));
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const activeEl = document.activeElement;
        if (e.shiftKey) {
          if (activeEl === first || !tipRef.current.contains(activeEl)) {
            e.preventDefault();
            last.focus();
          }
        } else if (activeEl === last || !tipRef.current.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish]);

  // Fokus tombol utama (Berikutnya/Selesai/Buka Panduan) setiap langkah
  // berganti, baru setelah tooltip terposisikan (visibility:hidden tidak bisa
  // menerima fokus).
  React.useEffect(() => {
    if (active && tipPos) primaryBtnRef.current?.focus();
  }, [active, stepIdx, tipPos]);

  // Posisikan tooltip: utamakan di atas target, pindah ke bawah jika penuh.
  React.useLayoutEffect(() => {
    if (!rect || !tipRef.current) return;
    const tw = tipRef.current.offsetWidth;
    const th = tipRef.current.offsetHeight;
    const gap = 14;
    const below = rect.bottom + gap + th <= window.innerHeight - 8;
    const top = below ? rect.bottom + gap : Math.max(8, rect.top - gap - th);
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - tw / 2), window.innerWidth - tw - 8);
    setTipPos({ top, left });
  }, [rect, active]);

  if (!active) return null;

  const isLast = stepIdx >= steps.length - 1;
  const isHandoff = !!active.openGuide;
  const primaryLabel = isHandoff ? "Buka Panduan" : isLast ? "Selesai" : "Berikutnya";

  return (
    <div role="dialog" aria-modal="true" aria-label={active.title} className="fixed inset-0 z-[70]">
      {/* Sorotan di sekitar target + backdrop gelap lewat box-shadow raksasa */}
      {rect && (
        <div
          className="absolute rounded-xl ring-2 ring-primary"
          style={{
            left: rect.left - 4,
            top: rect.top - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: "0 0 0 9999px rgba(19, 27, 46, 0.55)",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tipRef}
        className="fixed w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border border-outline-variant bg-surface-container-high p-4 shadow-2xl"
        style={{ top: tipPos?.top ?? 0, left: tipPos?.left ?? 0, visibility: tipPos ? "visible" : "hidden" }}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim/50 text-primary">
            <Compass className="h-5 w-5" />
          </span>
          <button
            type="button"
            onClick={finish}
            aria-label="Tutup panduan"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div aria-live="polite">
          <h3 className="mt-3 font-display text-base font-bold">{active.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{active.desc}</p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <span
                key={s.target}
                className={cn("h-1.5 rounded-full transition-all", i === stepIdx ? "w-5 bg-primary" : "w-1.5 bg-outline-variant")}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-on-surface-variant">
            {stepIdx + 1} dari {steps.length}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={finish}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 px-3 text-xs font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
          >
            Lewati
          </button>
          <div className="flex items-center gap-2">
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Sebelumnya"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-outline-variant text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <button
              ref={primaryBtnRef}
              type="button"
              onClick={handlePrimary}
              className="inline-flex h-11 cursor-pointer items-center gap-1 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95"
            >
              {primaryLabel}
              {!isHandoff && !isLast && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
