"use client";

import * as React from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({ name, quantity, maxQuantity, onAdd, onChange, onRemove, className }: {
  name: string;
  quantity: number;
  maxQuantity: number;
  onAdd?: () => void;
  onChange: (delta: number) => void;
  onRemove: () => void;
  className?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const container = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const isOpen = expanded && quantity > 0;

  React.useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setExpanded(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [isOpen]);

  function collapse() {
    setExpanded(false);
    trigger.current?.focus({ preventScroll: true });
  }

  const control = "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11";

  return (
    <div
      ref={container}
      role="group"
      aria-label={`Jumlah ${name}`}
      data-stepper
      className={cn("inline-flex items-center gap-0.5 rounded-full bg-white shadow-md", isOpen && "p-0.5 sm:p-1", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          event.preventDefault();
          event.stopPropagation();
          collapse();
        }
      }}
    >
      {isOpen && (
        <button
          type="button"
          aria-label={`${quantity === 1 ? "Hapus" : "Kurangi"} ${name}`}
          className={cn(control, quantity === 1 ? "bg-destructive-container text-on-destructive-container" : "text-on-surface-variant hover:bg-surface-container-low")}
          onClick={() => {
            if (quantity === 1) onRemove(); else onChange(-1);
            collapse();
          }}
        >
          {quantity === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
        </button>
      )}
      <button
        ref={trigger}
        type="button"
        data-quantity-trigger
        aria-label={quantity === 0 ? `Tambah ${name}` : `Ubah jumlah ${name}, saat ini ${quantity}`}
        aria-expanded={quantity > 0 ? isOpen : undefined}
        disabled={quantity === 0 && maxQuantity <= 0}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-sm font-bold text-on-surface transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed sm:h-11 sm:w-11"
        onClick={() => {
          if (quantity === 0) { onAdd?.(); setExpanded(false); }
          else setExpanded(!isOpen);
        }}
      >
        {quantity === 0 ? <Plus className="h-5 w-5 text-primary" /> : <span aria-live="polite">{quantity}</span>}
      </button>
      {isOpen && (
        <button
          type="button"
          aria-label={`Tambah ${name}`}
          disabled={quantity >= maxQuantity}
          className={cn(control, "bg-primary text-primary-foreground hover:bg-primary/90")}
          onClick={() => { onChange(1); collapse(); }}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
