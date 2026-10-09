// Ikon flat orisinal untuk tile menu mobile, digambar dengan gaya Flaticon
// color-fill: bentuk gendut membulat, dua tingkat warna (dasar + bayangan),
// dan aksen terang. File Flaticon asli tidak dipakai karena lisensinya
// mewajibkan atribusi; SVG di sini karya sendiri sehingga bebas dipakai.
// Dipakai hanya di grid beranda mobile; sidebar desktop tetap Lucide.
type IconProps = { className?: string };

function Svg({ className, children, ...rest }: IconProps & { children: React.ReactNode; "aria-hidden"?: boolean | "true" | "false" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className} {...rest}>
      {children}
    </svg>
  );
}

export function FlatDashboard({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="3" width="8" height="8" rx="3" fill="#8B5CF6" />
      <rect x="13" y="3" width="8" height="8" rx="3" fill="#6D28D9" />
      <rect x="3" y="13" width="8" height="8" rx="3" fill="#6D28D9" />
      <rect x="13" y="13" width="8" height="8" rx="4" fill="#8B5CF6" />
      <circle cx="7" cy="7" r="1.4" fill="#DDD6FE" />
    </Svg>
  );
}

export function FlatInventory({ className }: IconProps) {
  return (
    <Svg className={className}>
      <polygon
        points="12,2.5 20,7 12,11.5 4,7"
        fill="#93C5FD"
        stroke="#93C5FD"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <polygon
        points="4,7 12,11.5 12,21.5 4,17"
        fill="#3B82F6"
        stroke="#3B82F6"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <polygon
        points="20,7 12,11.5 12,21.5 20,17"
        fill="#1E40AF"
        stroke="#1E40AF"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <ellipse cx="9.5" cy="5.8" rx="2.2" ry="1" fill="#FFFFFF" opacity="0.55" transform="rotate(-24 9.5 5.8)" />
    </Svg>
  );
}

export function FlatCategory({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9.2 6h5.6M7.4 8.9l3.2 6.2M16.6 8.9l-3.2 6.2" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="6" cy="6" r="3.2" fill="#F59E0B" />
      <circle cx="18" cy="6" r="3.2" fill="#FBBF24" />
      <circle cx="12" cy="18" r="3.2" fill="#D97706" />
      <circle cx="6" cy="6" r="1.1" fill="#FFFFFF" />
      <circle cx="18" cy="6" r="1.1" fill="#FFFFFF" />
      <circle cx="12" cy="18" r="1.1" fill="#FFFFFF" />
    </Svg>
  );
}

export function FlatUnit({ className }: IconProps) {
  return (
    <Svg className={className}>
      <g transform="rotate(-30 12 12)">
        <rect x="2.5" y="8" width="19" height="8" rx="2.5" fill="#10B981" />
        <rect x="2.5" y="13" width="19" height="3" rx="1.5" fill="#047857" opacity="0.55" />
        <circle cx="5.4" cy="10.6" r="1.1" fill="#D1FAE5" />
        <rect x="9" y="8" width="1.6" height="3.2" rx="0.8" fill="#D1FAE5" />
        <rect x="12.4" y="8" width="1.6" height="2.4" rx="0.8" fill="#D1FAE5" />
        <rect x="15.8" y="8" width="1.6" height="3.2" rx="0.8" fill="#D1FAE5" />
      </g>
    </Svg>
  );
}

export function FlatSupplier({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="2" y="6" width="11" height="9.5" rx="2" fill="#F59E0B" />
      <rect x="2" y="6" width="11" height="4" rx="2" fill="#FBBF24" />
      <path
        d="M13 10h4.2L20.5 13v2.5H13z"
        fill="#F97316"
        stroke="#F97316"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <polygon points="14.5,10.5 17,10.5 18.8,12.5 14.5,12.5" fill="#FFEDD5" />
      <circle cx="7" cy="17.5" r="2.3" fill="#78350F" />
      <circle cx="17" cy="17.5" r="2.3" fill="#78350F" />
      <circle cx="7" cy="17.5" r="0.8" fill="#FBBF24" />
      <circle cx="17" cy="17.5" r="0.8" fill="#FBBF24" />
    </Svg>
  );
}

export function FlatCustomer({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="16.5" cy="8.5" r="2.8" fill="#6EE7B7" />
      <path d="M13.5 19.5c.3-3.2 1.8-4.8 3.6-4.8 1.5 0 2.9 1.3 3.2 4.8z" fill="#6EE7B7" />
      <circle cx="9" cy="8" r="3.4" fill="#10B981" />
      <path d="M3.5 20.5c.4-3.8 2.5-5.6 5.5-5.6s5.1 1.8 5.5 5.6z" fill="#10B981" />
    </Svg>
  );
}

export function FlatPurchase({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="6" y="3.5" width="12" height="17.5" rx="2.5" fill="#14B8A6" />
      <rect x="8" y="6" width="8" height="12.5" rx="1.2" fill="#FFFFFF" />
      <rect x="9" y="2.5" width="6" height="4" rx="1.8" fill="#0F766E" />
      <rect x="10" y="9.5" width="4" height="1.8" rx="0.9" fill="#14B8A6" />
      <rect x="10" y="12.6" width="4" height="1.8" rx="0.9" fill="#99F6E4" />
      <rect x="10" y="15.7" width="2.6" height="1.8" rx="0.9" fill="#99F6E4" />
    </Svg>
  );
}

export function FlatTransaction({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path
        d="M6 2.5h12V20l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 20z"
        fill="#8B5CF6"
        stroke="#8B5CF6"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 2.5h4V20l-2-1.4-2 1.4z" fill="#6D28D9" opacity="0.65" />
      <rect x="8" y="6.5" width="5" height="1.8" rx="0.9" fill="#EDE9FE" />
      <rect x="8" y="10" width="5" height="1.8" rx="0.9" fill="#EDE9FE" />
      <rect x="8" y="13.5" width="3.4" height="1.8" rx="0.9" fill="#EDE9FE" />
    </Svg>
  );
}

export function FlatExpense({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="7" y="3" width="8" height="5" rx="1.5" fill="#FECACA" />
      <rect x="3" y="5.5" width="18" height="6" rx="2.5" fill="#B91C1C" />
      <rect x="2" y="9" width="20" height="10.5" rx="3" fill="#EF4444" />
      <rect x="2" y="16" width="20" height="3.5" rx="1.7" fill="#B91C1C" opacity="0.5" />
      <circle cx="16.5" cy="13.2" r="2.1" fill="#FECACA" />
      <circle cx="16.5" cy="13.2" r="0.8" fill="#B91C1C" />
    </Svg>
  );
}

export function FlatNotification({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="4" r="1.6" fill="#1D4ED8" />
      <path
        d="M12 5.5c-3.6 0-6 2.6-6 6.2v3.1L4.3 18h15.4L18 14.8v-3.1c0-3.6-2.4-6.2-6-6.2z"
        fill="#3B82F6"
        stroke="#3B82F6"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M7.5 9.5c-.6 1.2-1 2.6-1.1 4.2L5.4 16h2.6c-.3-2.3-.2-4.5.5-6.5z" fill="#93C5FD" />
      <circle cx="12" cy="19" r="2.4" fill="#1D4ED8" />
    </Svg>
  );
}

export function FlatSettings({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle
        cx="12"
        cy="12"
        r="6.6"
        fill="none"
        stroke="#64748B"
        strokeWidth="4.4"
        strokeDasharray="3.1 2.06"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="6.4" fill="#64748B" />
      <circle cx="12" cy="12" r="2.9" fill="#FFFFFF" />
    </Svg>
  );
}

export function FlatUser({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="8" r="4" fill="#475569" />
      <path d="M4.5 20.5c.6-4.2 3.4-6.2 7.5-6.2s6.9 2 7.5 6.2z" fill="#64748B" />
      <ellipse cx="10.5" cy="6.8" rx="1.3" ry="1.8" fill="#94A3B8" opacity="0.7" />
    </Svg>
  );
}

// Siluet untuk watermark kartu Produk Terlaris: bentuk mengikuti
// kategori produk (makanan/minuman), bukan selalu box.
export function MarkFood({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="13.5" y="1.5" width="1.8" height="9" rx="0.9" fill="currentColor" transform="rotate(24 13.5 1.5)" />
      <rect x="16.5" y="1.5" width="1.8" height="9" rx="0.9" fill="currentColor" transform="rotate(24 16.5 1.5)" />
      <ellipse cx="12" cy="10" rx="7.5" ry="2.8" fill="currentColor" />
      <path d="M4.5 10h15c0 4.6-3.4 8-7.5 8s-7.5-3.4-7.5-8z" fill="currentColor" />
    </Svg>
  );
}

export function MarkDrink({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="13" y="1.5" width="1.8" height="8" rx="0.9" fill="currentColor" transform="rotate(18 13 1.5)" />
      <rect x="7" y="5" width="10" height="2.4" rx="1.2" fill="currentColor" />
      <path d="M8 7.4h8l-1.3 12.1a1.5 1.5 0 0 1-1.5 1.3h-2.4a1.5 1.5 0 0 1-1.5-1.3z" fill="currentColor" />
    </Svg>
  );
}
