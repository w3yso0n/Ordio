'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/cash', label: 'Caja' },
  { href: '/branches', label: 'Sucursales' },
  { href: '/products', label: 'Productos' },
  { href: '/supplies', label: 'Suministros' },
  { href: '/users', label: 'Usuarios' },
  { href: '/sales', label: 'Ventas' },
  { href: '/orders', label: 'Pedidos' },
];

const tabLinks = [
  { href: '/dashboard', label: 'Hoy' },
  { href: '/cash', label: 'Caja' },
  { href: '/sales', label: 'Ventas' },
];

function linkActive(pathname: string, href: string) {
  return pathname === href;
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = linkActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? 'bg-brand-muted text-brand' : 'text-muted hover:bg-surface-secondary hover:text-foreground'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = links.find((link) => link.href === pathname)?.label ?? 'Administración';
  const moreActive = !tabLinks.some((link) => link.href === pathname);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className="min-h-dvh bg-background text-foreground md:flex">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
        <div className="mb-8 px-2">
          <div className="text-[11px] font-bold tracking-[0.18em] text-brand">ORDIO</div>
          <div className="mt-1 text-sm text-muted">Administración</div>
        </div>
        <NavLinks pathname={pathname} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur md:hidden pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <div className="text-[10px] font-bold tracking-[0.18em] text-brand">ORDIO</div>
          <div className="truncate text-base font-semibold">{current}</div>
        </div>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-border text-foreground"
          aria-label="Abrir menú"
          onClick={() => setMenuOpen(true)}
        >
          <span className="flex flex-col gap-1.5" aria-hidden="true">
            <span className="block h-0.5 w-5 rounded-full bg-foreground" />
            <span className="block h-0.5 w-5 rounded-full bg-foreground" />
            <span className="block h-0.5 w-5 rounded-full bg-foreground" />
          </span>
        </button>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col bg-surface px-4 py-5 shadow-xl pt-[max(1.25rem,env(safe-area-inset-top))]">
            <div className="mb-6 flex items-center justify-between px-2">
              <div>
                <div className="text-[11px] font-bold tracking-[0.18em] text-brand">ORDIO</div>
                <div className="mt-1 text-sm text-muted">Menú</div>
              </div>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-muted"
                aria-label="Cerrar menú"
                onClick={() => setMenuOpen(false)}
              >
                ✕
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <main className="w-full min-w-0 flex-1 p-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:max-w-6xl md:p-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-4">
          {tabLinks.map((link) => {
            const active = linkActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                  active ? 'text-brand' : 'text-muted'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            type="button"
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
              moreActive ? 'text-brand' : 'text-muted'
            }`}
            onClick={() => setMenuOpen(true)}
          >
            Más
          </button>
        </div>
      </nav>
    </div>
  );
}
