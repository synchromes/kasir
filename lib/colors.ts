// Payment identity stays fixed when amounts reorder the chart.
export const paymentColors: Record<string, { bg: string; text: string; fill: string }> = {
  CASH: { bg: "bg-secondary-container", text: "text-on-secondary-container", fill: "var(--accent)" },
  QRIS: { bg: "bg-primary-soft", text: "text-primary", fill: "var(--primary)" },
  TRANSFER: { bg: "bg-tertiary-soft", text: "text-tertiary", fill: "var(--tertiary)" },
};
