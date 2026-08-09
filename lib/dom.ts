// Util DOM bersama untuk walkthrough onboarding & dialog Panduan.
// Dipakai di dua tempat sehingga predikat "elemen terlihat" tidak bisa
// melenceng satu sama lain (mis. sorotan menunjuk A, dialog terbuka dari B).

export function isElementVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  const st = getComputedStyle(el);
  return r.width > 4 && r.height > 4 && st.display !== "none" && st.visibility !== "hidden";
}

// Elemen pertama yang cocok dengan selector DAN terlihat di viewport.
// Client-only — panggil dari efek/event handler, bukan saat render.
export function firstVisible(selector: string): HTMLElement | null {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
    if (isElementVisible(el)) return el;
  }
  return null;
}
