import { useSyncExternalStore } from 'react';
import {
  addItem,
  emptyOrder,
  orderFromServer,
  setItemQty,
  type LocalOrder,
} from './order-engine';
import { ensureDailyNumber, saveLocalCheck } from './local-checks';
import { kvGetJson, kvSetJson } from './kv';

const TICKET_KEY = 'current_ticket';
const listeners = new Set<() => void>();

function readStored(): LocalOrder {
  const stored = kvGetJson<LocalOrder>(TICKET_KEY);
  if (stored?.id && Array.isArray(stored.items)) return stored;
  return emptyOrder();
}

let ticket = readStored();

function emit() {
  kvSetJson(TICKET_KEY, ticket);
  listeners.forEach((listener) => listener());
}

export function useTicket(): LocalOrder {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => ticket,
  );
}

export function peekTicket(): LocalOrder {
  return ticket;
}

export function addProductToTicket(product: { id: string; name: string; priceCents: number }) {
  ticket = addItem(ticket, product);
  emit();
}

export function setTicketItemQty(itemId: string, qty: number) {
  ticket = setItemQty(ticket, itemId, qty);
  emit();
}

export function loadTicket(order: LocalOrder) {
  ticket = order;
  emit();
}

export function replaceTicket(order: LocalOrder) {
  ticket = order;
  emit();
}

export function loadTicketFromServer(data: Parameters<typeof orderFromServer>[0]) {
  ticket = orderFromServer(data);
  emit();
}

export function clearTicket() {
  ticket = emptyOrder();
  emit();
}

export function startNewTicket() {
  ticket = emptyOrder();
  emit();
}

export function parkCurrentTicket() {
  if (ticket.items.length === 0) {
    startNewTicket();
    return null;
  }
  const parked = ensureDailyNumber(ticket);
  saveLocalCheck(parked);
  startNewTicket();
  return parked;
}

export function resetTicketStore() {
  ticket = emptyOrder();
  emit();
}
