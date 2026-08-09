"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton({ className }: { className?: string }) {
  return (
    <Button variant="accent" className={className} onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> Cetak Struk
    </Button>
  );
}
