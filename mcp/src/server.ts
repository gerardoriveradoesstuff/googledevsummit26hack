import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Cuenta, DistribuidoraApi } from './api.js';
import { addDays, isoDate, prettyDate, resolveDate } from './dates.js';
import { clientSummary, labels, orderDetail, orderSummary, qty } from './format.js';

export const INSTRUCTIONS = `This server connects you to "Distribuidora de Productos", a small produce distributor in California that supplies restaurants (Araujos Mexican Grill and others in the Bay Area and Los Angeles).

How the business works:
- Each restaurant client has an account. Restaurants send produce orders (pedidos) from a tablet; each order has a number, a client, an expected delivery date (fecha esperada), who closed it on the restaurant side, and line items (quantity + unit + product, e.g. "2.5 caja Tomate", "15 lb Jalapeño", "8 pieza Repollo").
- New orders land in a shared inbox that both owners of the distributor watch. An order is NEW until someone at the distributor packs it and marks it PROCESSED.
- Box labels are printed from the distributor's Android app: one label per unit, rounded up (2.5 cajas -> 3 labels).
- Product and unit names are in Spanish (caja = case/box, lb, kg, pieza = piece; Cebolla blanca = white onion, Limón = lime, Aguacate = avocado, Repollo = cabbage, Tomatillo, Jalapeño, Cilantro, Lechuga romana = romaine). Keep product names as written when creating orders; translate only when explaining to the user.
- Dates are in the distributor's local time (America/Los_Angeles). Tools accept "today"/"tomorrow"/"yesterday" or YYYY-MM-DD.

How to use the tools:
- For "what do I need to prepare/deliver today/tomorrow", "what's pending", or "how much X do I need", call get_daily_summary first.
- Use list_orders to browse or filter orders (new/processed/all, by client, by expected date or range) and get_order for one order's full detail.
- Use list_clients to look up restaurant accounts (addresses, delivery notes, order counts).
- create_order and mark_order_processed CHANGE DATA. Before calling either, restate exactly what will happen (client, date, every line item / the order number) and get the user's explicit confirmation. After create_order, tell the user the new order number.
- Always mention client names, order numbers and dates in answers. Overdue unprocessed orders (expected date already passed) are important — point them out.`;

const ReadOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function text(t: string, isError = false) {
  return { content: [{ type: 'text' as const, text: t }], ...(isError ? { isError: true } : {}) };
}

function matchClients(cuentas: Cuenta[], query: string): Cuenta[] {
  const q = norm(query);
  const exact = cuentas.filter((c) => norm(c.usuario) === q || norm(c.nombre) === q);
  if (exact.length) return exact;
  return cuentas.filter((c) => norm(c.nombre).includes(q) || q.split(/\s+/).every((w) => norm(c.nombre).includes(w)));
}

async function guard(fn: () => Promise<ReturnType<typeof text>>) {
  try {
    return await fn();
  } catch (e) {
    return text(`Error: ${(e as Error).message}`, true);
  }
}

export function createServer(api: DistribuidoraApi): McpServer {
  const server = new McpServer(
    { name: 'distribuidora-de-productos', title: 'Distribuidora de Productos', version: '0.1.0' },
    { instructions: INSTRUCTIONS },
  );

  server.registerTool(
    'list_orders',
    {
      title: 'List orders',
      description:
        'List produce orders from restaurant clients, newest first, with client name, order number, expected delivery date, status and line items. Filter by status, client and expected date (single day or range).',
      inputSchema: {
        status: z.enum(['new', 'processed', 'all']).default('all').describe('new = not processed yet; processed = already packed; all = both'),
        client: z.string().optional().describe('Client name or account username, partial match OK (e.g. "Araujos")'),
        expected_date: z.string().optional().describe('Exact expected delivery date: YYYY-MM-DD, "today", "tomorrow" or "yesterday"'),
        expected_from: z.string().optional().describe('Start of expected-date range (inclusive): YYYY-MM-DD/today/tomorrow/yesterday'),
        expected_to: z.string().optional().describe('End of expected-date range (inclusive): YYYY-MM-DD/today/tomorrow/yesterday'),
        limit: z.number().int().min(1).max(100).default(20).describe('Max orders to return (default 20)'),
      },
      annotations: { title: 'List orders', ...ReadOnly },
    },
    ({ status, client, expected_date, expected_from, expected_to, limit }) =>
      guard(async () => {
        let orders = await api.listOrders();
        const filters: string[] = [];
        if (status !== 'all') {
          orders = orders.filter((p) => p.procesado === (status === 'processed'));
          filters.push(status === 'new' ? 'not processed' : 'processed');
        }
        if (client) {
          const matches = matchClients(await api.listAccounts(), client);
          if (!matches.length) return text(`No client matches "${client}". Use list_clients to see all clients.`, true);
          const names = new Set(matches.map((c) => c.nombre));
          orders = orders.filter((p) => names.has(p.cliente));
          filters.push(`client ${[...names].join(' / ')}`);
        }
        for (const [label, raw] of [['expected_date', expected_date], ['expected_from', expected_from], ['expected_to', expected_to]] as const) {
          if (raw && !resolveDate(raw)) return text(`Invalid ${label} "${raw}". Use YYYY-MM-DD, today, tomorrow or yesterday.`, true);
        }
        const exact = resolveDate(expected_date);
        const from = exact ?? resolveDate(expected_from);
        const to = exact ?? resolveDate(expected_to);
        if (from) orders = orders.filter((p) => p.fecha_esperada >= from);
        if (to) orders = orders.filter((p) => p.fecha_esperada <= to);
        if (exact) filters.push(`expected ${prettyDate(exact)}`);
        else if (from || to) filters.push(`expected ${from ? prettyDate(from) : '…'} to ${to ? prettyDate(to) : '…'}`);

        orders.sort((a, b) => b.fecha_esperada.localeCompare(a.fecha_esperada) || b.numero - a.numero);
        const shown = orders.slice(0, limit);
        const nNew = orders.filter((p) => !p.procesado).length;
        const header = `${orders.length} order(s)${filters.length ? ` (${filters.join(', ')})` : ''} — ${nNew} new, ${orders.length - nNew} processed.` +
          (orders.length > shown.length ? ` Showing the ${shown.length} with the latest expected dates; narrow the filters or raise limit for more.` : '');
        return text([header, ...shown.map(orderSummary)].join('\n\n'));
      }),
  );

  server.registerTool(
    'get_order',
    {
      title: 'Get order',
      description: 'Full detail for one order by its number: client, delivery address, expected date, status, who closed it, every line item with quantity/unit and label count.',
      inputSchema: { order_number: z.number().int().positive().describe('The order number (número de pedido), e.g. 42') },
      annotations: { title: 'Get order', ...ReadOnly },
    },
    ({ order_number }) =>
      guard(async () => {
        const p = (await api.listOrders()).find((x) => x.numero === order_number);
        if (!p) return text(`Order #${order_number} not found.`, true);
        return text(orderDetail(p));
      }),
  );

  server.registerTool(
    'list_clients',
    {
      title: 'List clients',
      description: 'List the restaurant client accounts with address, delivery notes, number of orders, unprocessed orders and their latest order.',
      inputSchema: { query: z.string().optional().describe('Optional name filter, partial match (e.g. "taquer")') },
      annotations: { title: 'List clients', ...ReadOnly },
    },
    ({ query }) =>
      guard(async () => {
        let cuentas = await api.listAccounts();
        if (query) cuentas = matchClients(cuentas, query);
        const orders = await api.listOrders();
        cuentas.sort((a, b) => a.nombre.localeCompare(b.nombre));
        if (!cuentas.length) return text(query ? `No client matches "${query}".` : 'No client accounts yet.');
        return text([`${cuentas.length} client(s):`, ...cuentas.map((c) => clientSummary(c, orders))].join('\n\n'));
      }),
  );

  server.registerTool(
    'get_daily_summary',
    {
      title: 'Daily summary',
      description:
        'Prep sheet for one delivery day (default today): orders expected that day by status, total quantity per product across all those orders, total labels, plus overdue unprocessed orders and a peek at the next day.',
      inputSchema: { date: z.string().default('today').describe('Delivery date: YYYY-MM-DD, "today", "tomorrow" or "yesterday"') },
      annotations: { title: 'Daily summary', ...ReadOnly },
    },
    ({ date }) =>
      guard(async () => {
        const day = resolveDate(date);
        if (!day) return text(`Invalid date "${date}". Use YYYY-MM-DD, today, tomorrow or yesterday.`, true);
        const all = await api.listOrders();
        const due = all.filter((p) => p.fecha_esperada === day).sort((a, b) => a.numero - b.numero);
        const pending = due.filter((p) => !p.procesado);
        const done = due.filter((p) => p.procesado);
        const totals = new Map<string, { nombre: string; unidad: string; cantidad: number; copias: number; clientes: Set<string> }>();
        for (const p of pending.length ? pending : due) {
          for (const l of p.lineas) {
            const k = `${norm(l.nombre)}|${l.unidad}`;
            const t = totals.get(k) ?? { nombre: l.nombre, unidad: l.unidad, cantidad: 0, copias: 0, clientes: new Set<string>() };
            t.cantidad += l.cantidad;
            t.copias += l.copias;
            t.clientes.add(p.cliente);
            totals.set(k, t);
          }
        }
        const today = isoDate();
        const overdue = all.filter((p) => !p.procesado && p.fecha_esperada < (day < today ? day : today));
        const next = all.filter((p) => p.fecha_esperada === addDays(day, 1));
        const out: string[] = [
          `Delivery day ${prettyDate(day)} [${day}]: ${due.length} order(s) — ${pending.length} still to prepare, ${done.length} already processed.`,
        ];
        if (pending.length) out.push('', 'To prepare:', ...pending.map((p) => `  - #${p.numero} ${p.cliente} (${p.lineas.length} items, ${labels(p)} labels)`));
        if (done.length) out.push('', 'Already processed:', ...done.map((p) => `  - #${p.numero} ${p.cliente}`));
        if (totals.size) {
          out.push('', `Totals by product (${pending.length ? 'orders still to prepare' : 'all orders that day'}):`);
          for (const t of [...totals.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))) {
            out.push(`  - ${qty(t.cantidad)} ${t.unidad} ${t.nombre} — ${t.copias} labels — ${[...t.clientes].join(', ')}`);
          }
          out.push(`  Total labels: ${[...totals.values()].reduce((s, t) => s + t.copias, 0)}`);
        }
        if (overdue.length) {
          out.push('', `⚠ Overdue, never processed (${overdue.length}):`, ...overdue.map((p) => `  - #${p.numero} ${p.cliente}, was expected ${prettyDate(p.fecha_esperada)}`));
        }
        out.push('', `Next day (${prettyDate(addDays(day, 1))}): ${next.length} order(s) so far${next.length ? ` — ${[...new Set(next.map((p) => p.cliente))].join(', ')}` : ''}.`);
        return text(out.join('\n'));
      }),
  );

  server.registerTool(
    'create_order',
    {
      title: 'Create order',
      description:
        'Place a new produce order for a restaurant client. It goes through the same message endpoint the restaurant tablet uses, so it appears in the distributor inbox (PWA + Android) and gets an order number. Confirm client, expected date and every line item with the user before calling.',
      inputSchema: {
        client: z.string().describe('Client name or account username (e.g. "Araujos Mexican Grill" or "armegr")'),
        expected_date: z.string().describe('Expected delivery date: YYYY-MM-DD, "today" or "tomorrow"'),
        lines: z
          .array(
            z.object({
              product: z.string().min(1).describe('Product name in Spanish as the distributor writes it, e.g. "Tomate", "Cebolla blanca", "Aguacate", "Limón", "Jalapeño"'),
              unit: z.string().default('caja').describe('Unit: caja, lb, kg or pieza (default caja)'),
              quantity: z.number().positive().describe('Quantity, decimals allowed (e.g. 2.5)'),
            }),
          )
          .min(1)
          .max(40)
          .describe('Line items'),
        closed_by: z.string().default('Gemini').describe('Name of the person placing the order (shown as "closed by")'),
      },
      annotations: { title: 'Create order', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    ({ client, expected_date, lines, closed_by }) =>
      guard(async () => {
        const fecha = resolveDate(expected_date);
        if (!fecha) return text(`Invalid expected_date "${expected_date}". Use YYYY-MM-DD, today or tomorrow.`, true);
        if (fecha < isoDate()) return text(`Expected date ${fecha} is in the past.`, true);
        const matches = matchClients(await api.listAccounts(), client);
        if (matches.length === 0) return text(`No client matches "${client}". Use list_clients to see all clients.`, true);
        if (matches.length > 1) return text(`"${client}" matches several clients: ${matches.map((c) => c.nombre).join(', ')}. Ask which one.`, true);
        const c = matches[0];
        const numero = await api.sendOrderMessage({
          usuario: c.usuario,
          contrasena: c.contrasena,
          fecha_esperada: fecha,
          cerrado_por: closed_by,
          lineas: lines.map((l) => ({ nombre: l.product.trim(), unidad: (l.unit || 'caja').trim(), cantidad: l.quantity })),
        });
        const created = (await api.listOrders()).find((p) => p.numero === numero);
        return text(`Created order #${numero} for ${c.nombre}.\n\n${created ? orderDetail(created) : lines.map((l) => `  - ${l.quantity} ${l.unit} ${l.product}`).join('\n')}`);
      }),
  );

  server.registerTool(
    'mark_order_processed',
    {
      title: 'Mark order processed',
      description:
        'Mark an order as processed (packed / handled) so it leaves the "new" inbox for both owners. This cannot be undone from the app. Confirm the order number and client with the user before calling.',
      inputSchema: { order_number: z.number().int().positive().describe('The order number to mark as processed') },
      annotations: { title: 'Mark order processed', readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    ({ order_number }) =>
      guard(async () => {
        const before = (await api.listOrders()).find((p) => p.numero === order_number);
        if (!before) return text(`Order #${order_number} not found.`, true);
        if (before.procesado) return text(`Order #${order_number} (${before.cliente}) was already processed.\n\n${orderDetail(before)}`);
        await api.markProcessed(order_number);
        const after = (await api.listOrders()).find((p) => p.numero === order_number) ?? before;
        return text(`Marked order #${order_number} for ${after.cliente} as processed.\n\n${orderDetail(after)}`);
      }),
  );

  return server;
}

