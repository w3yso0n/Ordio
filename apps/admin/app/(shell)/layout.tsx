'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-56 shrink-0 border-r border-border bg-surface px-4 py-6 flex flex-col">
        <div className="px-2 mb-8">
          <div className="text-[11px] font-bold tracking-[0.18em] text-brand">ORDIO</div>
          <div className="text-sm text-muted mt-1">Administración</div>
        </div>
        <nav className="flex flex-col gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-brand-muted text-brand' : 'text-muted hover:bg-surface-secondary hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-8 max-w-6xl">{children}</main>
    </div>
  );
}
