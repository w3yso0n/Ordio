import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-4 md:mb-8 md:flex-row md:flex-wrap md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="hidden text-2xl font-semibold tracking-tight text-foreground md:block">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action ? <div className="w-full min-w-0 md:w-auto">{action}</div> : null}
    </div>
  );
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-pressed',
    secondary: 'bg-surface text-foreground border border-border hover:bg-surface-secondary',
    ghost: 'bg-transparent text-muted hover:bg-surface-secondary hover:text-foreground',
    danger: 'text-danger hover:bg-danger/10',
  }[variant];
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-[10px] px-4 text-sm font-semibold transition-colors disabled:opacity-50 md:min-h-10 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="font-medium text-muted">{label}</span>
      {children}
      {error ? <span className="text-danger text-xs">{error}</span> : null}
    </label>
  );
}

const control =
  'h-11 w-full min-w-0 rounded-[10px] border border-border bg-surface px-3 text-base text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand md:h-10 md:text-sm';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} ${className}`} {...props} />;
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${control} ${className}`} {...props} />;
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[14px] border border-border bg-surface ${className}`}>{children}</div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-5 py-12 text-center md:px-6 md:py-16">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
    >
      {children}
    </div>
  );
}

export function Metric({
  label,
  value,
  valueClassName = '',
  className = '',
}: {
  label: string;
  value: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-xl bg-surface-secondary/70 p-3 md:rounded-none md:bg-transparent md:p-0 md:px-6 md:py-0 md:border-r md:border-border md:first:pl-0 md:last:border-r-0 md:last:pr-0 ${className}`}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1.5 text-lg font-semibold tabular tracking-tight md:mt-2 md:text-2xl ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}

export function TableScroll({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}
