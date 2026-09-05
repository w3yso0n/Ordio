'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { showBlocked } from '@/lib/blocked';
import { Alert, Button, EmptyState, Field, Input, PageHeader, Panel, Select } from '@/components/ui';

type SupplyRow = {
  id: string;
  name: string;
  amountCents: number;
  year: number;
  month: number;
};

function mxn(cents: number) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

function monthOptions() {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      value: `${date.getFullYear()}-${date.getMonth() + 1}`,
      label: label.charAt(0).toUpperCase() + label.slice(1),
    };
  });
}

export default function SuppliesPage() {
  const options = useMemo(monthOptions, []);
  const [year, setYear] = useState(options[0].year);
  const [month, setMonth] = useState(options[0].month);
  const [rows, setRows] = useState<SupplyRow[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load(nextYear = year, nextMonth = month) {
    const list: SupplyRow[] = await api(`/admin/supplies?year=${nextYear}&month=${nextMonth}`);
    setRows(list);
    setAmounts(Object.fromEntries(list.map((row) => [row.id, (row.amountCents / 100).toFixed(2)])));
  }

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onMonthChange(value: string) {
    const option = options.find((item) => item.value === value);
    if (!option) return;
    setYear(option.year);
    setMonth(option.month);
    setEditingId(null);
    setName('');
    setNewAmount('');
    try {
      await load(option.year, option.month);
    } catch (err) {
      showBlocked((err as Error).message, setError);
    }
  }

  async function saveSupply(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api(`/admin/supplies/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ name }),
        });
      } else {
        const created = await api('/admin/supplies', {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
        const amountCents = Math.round(Number(newAmount || 0) * 100);
        if (created?.id && Number.isFinite(amountCents) && amountCents > 0) {
          await api(`/admin/supplies/${created.id}/expense`, {
            method: 'PUT',
            body: JSON.stringify({ year, month, amountCents }),
          });
        }
      }
      setName('');
      setNewAmount('');
      setEditingId(null);
      await load();
    } catch (err) {
      showBlocked((err as Error).message, setError);
    }
  }

  async function saveExpense(row: SupplyRow, raw = amounts[row.id]) {
    setError('');
    setSavingId(row.id);
    try {
      const amountCents = Math.round(Number(raw || 0) * 100);
      if (!Number.isFinite(amountCents) || amountCents < 0) {
        throw new Error('El costo debe ser un número válido.');
      }
      await api(`/admin/supplies/${row.id}/expense`, {
        method: 'PUT',
        body: JSON.stringify({ year, month, amountCents }),
      });
      await load();
    } catch (err) {
      showBlocked((err as Error).message, setError);
    } finally {
      setSavingId(null);
    }
  }

  async function removeSupply(row: SupplyRow) {
    if (!confirm(`¿Borrar el suministro «${row.name}»?`)) return;
    setError('');
    try {
      await api(`/admin/supplies/${row.id}`, { method: 'DELETE' });
      if (editingId === row.id) {
        setEditingId(null);
        setName('');
      }
      await load();
    } catch (err) {
      showBlocked((err as Error).message, setError);
    }
  }

  const monthLabel = options.find((item) => item.year === year && item.month === month)?.label ?? '';
  const totalCents = rows.reduce((sum, row) => {
    const value = Math.round(Number(amounts[row.id] || 0) * 100);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  return (
    <div>
      <PageHeader
        title="Suministros"
        description="Ingredientes y gastos del mes: jitomate, tortillas, carne y lo que uses para armar los tacos."
      />
      <Field label="Mes">
        <Select value={`${year}-${month}`} onChange={(e) => onMonthChange(e.target.value)}>
          {options.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
      </Field>

      <form onSubmit={saveSupply} className="mt-6 mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_8rem_auto]">
        <Field label={editingId ? 'Editar suministro' : 'Nuevo suministro'}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jitomate, tortillas, carne…"
            required
          />
        </Field>
        {editingId ? null : (
          <Field label="Costo del mes">
            <Input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} inputMode="decimal" placeholder="0.00" />
          </Field>
        )}
        <div className="flex items-end gap-2">
          <Button type="submit" className="flex-1 sm:flex-none">{editingId ? 'Guardar' : 'Agregar'}</Button>
          {editingId ? (
            <Button
              type="button"
              variant="secondary"
              className="flex-1 sm:flex-none"
              onClick={() => {
                setEditingId(null);
                setName('');
                setNewAmount('');
              }}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>
      {error ? <Alert>{error}</Alert> : null}
      <Panel className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            title="Sin suministros"
            description="Agrega los ingredientes que compras cada mes y anota cuánto invertiste."
          />
        ) : (
          <>
            <ul className="md:hidden">
              {rows.map((row) => (
                <li key={row.id} className="border-t border-border px-4 py-4 first:border-t-0">
                  <p className="font-semibold">{row.name}</p>
                  <Field label={`Gasto de ${monthLabel}`}>
                    <Input
                      value={amounts[row.id] ?? ''}
                      onChange={(e) => setAmounts((current) => ({ ...current, [row.id]: e.target.value }))}
                      onBlur={(e) => {
                        if (e.target.value !== (row.amountCents / 100).toFixed(2)) {
                          void saveExpense(row, e.target.value);
                        }
                      }}
                      inputMode="decimal"
                      aria-label={`Gasto de ${row.name}`}
                    />
                  </Field>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      disabled={savingId === row.id}
                      onClick={() => saveExpense(row)}
                    >
                      {savingId === row.id ? 'Guardando…' : 'Guardar'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(row.id);
                        setName(row.name);
                      }}
                    >
                      Editar
                    </Button>
                    <Button type="button" variant="danger" onClick={() => removeSupply(row)}>
                      Borrar
                    </Button>
                  </div>
                </li>
              ))}
              <li className="flex items-center justify-between border-t border-border bg-surface-secondary px-4 py-3 font-semibold">
                <span>Total del mes</span>
                <span className="tabular">{mxn(totalCents)}</span>
              </li>
            </ul>
            <table className="hidden w-full text-sm md:table">
              <thead className="bg-surface-secondary text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Suministro</th>
                  <th className="px-4 py-3 font-medium">Gasto de {monthLabel}</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-36">
                          <Input
                            value={amounts[row.id] ?? ''}
                            onChange={(e) => setAmounts((current) => ({ ...current, [row.id]: e.target.value }))}
                            onBlur={(e) => {
                              if (e.target.value !== (row.amountCents / 100).toFixed(2)) {
                                void saveExpense(row, e.target.value);
                              }
                            }}
                            inputMode="decimal"
                            aria-label={`Gasto de ${row.name}`}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 min-h-8 px-3"
                          disabled={savingId === row.id}
                          onClick={() => saveExpense(row)}
                        >
                          {savingId === row.id ? 'Guardando…' : 'Guardar'}
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 min-h-8 px-2"
                        onClick={() => {
                          setEditingId(row.id);
                          setName(row.name);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        className="h-8 min-h-8 px-2"
                        onClick={() => removeSupply(row)}
                      >
                        Borrar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface-secondary">
                  <td className="px-4 py-3 font-semibold">Total del mes</td>
                  <td className="px-4 py-3 font-semibold tabular" colSpan={2}>
                    {mxn(totalCents)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </Panel>
    </div>
  );
}
