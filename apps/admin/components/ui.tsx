import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
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
      className={`inline-flex items-center justify-center rounded-[10px] px-4 h-10 text-sm font-semibold transition-colors disabled:opacity-50 ${styles} ${className}`}
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
    <label className="flex flex-col gap-1.5 text-sm min-w-0">
      <span className="font-medium text-muted">{label}</span>
      {children}
      {error ? <span className="text-danger text-xs">{error}</span> : null}
    </label>
  );
}

const control =
  'h-10 rounded-[10px] border border-border bg-surface px-3 text-sm text-foreground outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:border-brand';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={control} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={control} {...props} />;
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[14px] border border-border bg-surface ${className}`}>{children}</div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-[12px] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
    >
      {children}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0 sm:border-b-0 sm:border-r sm:px-6 sm:py-0 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0">
      <div className="text-xs font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular tracking-tight">{value}</div>
    </div>
  );
}
