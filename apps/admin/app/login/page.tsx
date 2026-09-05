'use client';

import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { Button, Field, Input } from '@/components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const data = await api('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('ordio_token', data.accessToken);
      localStorage.setItem('ordio_refresh', data.refreshToken);
      window.location.href = '/dashboard';
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <form onSubmit={onSubmit} autoComplete="off" className="w-full max-w-sm space-y-6">
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-brand">ORDIO</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Entrar al panel</h1>
          <p className="mt-1 text-sm text-muted">Administra catálogo, cajeros y ventas del día.</p>
        </div>
        <Field label="Correo">
          <Input
            type="email"
            name="ordio-admin-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </Field>
        <Field label="Contraseña" error={error || undefined}>
          <Input
            type="password"
            name="ordio-admin-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        <Button type="submit" className="w-full h-11">
          Entrar
        </Button>
      </form>
    </main>
  );
}
