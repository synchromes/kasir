"use client";

import * as React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // false = tindakan non-destruktif (ikon peringatan, tombol aksen);
  // true (default) = tindakan destruktif (ikon tempat sampah, tombol merah).
  danger?: boolean;
};

const ConfirmContext = React.createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  // Di luar provider: aman no-op (selalu batal).
  () => Promise.resolve(false)
);

export function useConfirm() {
  return React.useContext(ConfirmContext);
}

// Pengganti window.confirm yang tampilannya konsisten dengan UI aplikasi.
// Pakai lewat hook:  const confirm = useConfirm();
//   if (!(await confirm({ title, message }))) return;
// Render <ConfirmProvider> sekali di akar layout aplikasi.
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = React.useState<ConfirmOptions | null>(null);
  const resolverRef = React.useRef<(v: boolean) => void>(() => {});
  const confirmBtnRef = React.useRef<HTMLButtonElement>(null);

  // Bila provider ditutup saat dialog masih terbuka (mis. pindah halaman),
  // janji confirm() harus tetap diselesaikan agar handler tidak menggantung.
  React.useEffect(() => {
    return () => resolverRef.current(false);
  }, []);

  const confirm = React.useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = React.useCallback((result: boolean) => {
    resolverRef.current(result);
    setOpts(null);
  }, []);

  const danger = opts?.danger !== false;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!opts} onOpenChange={(open) => { if (!open) settle(false); }}>
        {opts && (
          <DialogContent
            className="max-w-sm"
            // Fokus ke tombol aksi (bukan Batal) agar Enter langsung mengonfirmasi.
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              confirmBtnRef.current?.focus();
            }}
          >
            <div className="flex items-start gap-4">
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                  danger ? "bg-destructive-container/60 text-destructive" : "bg-secondary-container/50 text-secondary"
                )}
              >
                {danger ? <Trash2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </span>
              <div className="min-w-0 pt-0.5">
                <DialogTitle className="leading-snug">{opts.title}</DialogTitle>
                <DialogDescription className="mt-1.5 leading-relaxed">{opts.message}</DialogDescription>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => settle(false)}>
                {opts.cancelLabel ?? "Batal"}
              </Button>
              <Button ref={confirmBtnRef} variant={danger ? "destructive" : "accent"} onClick={() => settle(true)}>
                {opts.confirmLabel ?? (danger ? "Hapus" : "OK")}
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}
