"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/tms", label: "TMS" },
  { href: "/wms", label: "WMS" },
  { href: "/coldchain", label: "Cold Chain" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        background: "var(--glass-nav-bg, rgba(8, 15, 26, 0.72))",
        backdropFilter: "blur(48px)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 200,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          height: 56,
          gap: 32,
        }}
      >
        <span
          style={{
            color: "var(--brand-orange)",
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: "-0.02em",
          }}
        >
          Sabiport
        </span>

        <div style={{ display: "flex", gap: 4 }}>
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
