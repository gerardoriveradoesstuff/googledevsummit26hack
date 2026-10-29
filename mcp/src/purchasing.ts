// Scenario 1 "price agent" tools — a mirror of the Android AppFunctions in
// android/app/src/main/java/com/distribuidora/pedidos/appfunctions/ (same mock data,
// same logic) so the scenario also runs through Gemini Developer Mode over MCP.
// Data is always the built-in mock fixture (no backend); placed orders live in memory
// for the life of the process.
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addDays, isoDate, prettyDate } from './dates.js';

export const PURCHASING_INSTRUCTIONS = `
Restaurant purchasing tools (Orderly price agent, demo data for the restaurant Araujos Mexican Grill buying from its own suppliers):
- get_order_history, check_price_change, compare_distributors, place_order and get_current_distributor are about what the RESTAURANT buys from meat/poultry distributors — not the produce orders handled by list_orders/create_order.
- For a reorder like "order 20 lbs of organic chicken": call check_price_change first; if flagged, tell the user the price rose (state the % and the $ difference vs the last order). Then call compare_distributors and present the cheaper options together with the current distributor, noting when an option is new or has no reviews. Only call place_order after the user explicitly picks a distributor and confirms quantity and total.
- Prices are quoted per 20 lb and scale linearly. Orders must be organic unless the user says otherwise.`;

const PRICE_UNIT_LBS = 20;
const FLAG_THRESHOLD_PERCENT = 10;
const RESTAURANT = 'Araujos Mexican Grill';
const CURRENT_ID = 'rancho-valle';

interface Product { id: string; name: string; aliases: string[] }
interface Distributor {
  id: string; name: string; pricePer20Lbs: Record<string, number>; organicCertified: boolean;
  rating: number; reviewCount: number; reviewSummary: string; relationship: string;
  distanceMiles: number; leadTimeDays: number; phone: string;
}
interface PastOrder {
  confirmationNumber: string; date: string; distributorId: string; productId: string;
  quantityLbs: number; total: number; status: string;
}

const CHICKEN: Product = {
  id: 'organic-chicken',
  name: 'Organic chicken (boneless thighs)',
  aliases: ['chicken', 'pollo', 'organic chicken', 'chicken thighs', 'meat', 'carne', 'protein'],
};
const PRODUCTS = [CHICKEN];

const DISTRIBUTORS: Distributor[] = [
  { id: 'rancho-valle', name: 'Rancho Valle Meats', pricePer20Lbs: { [CHICKEN.id]: 300 }, organicCertified: true, rating: 3.4, reviewCount: 87,
    reviewSummary: 'Mixed: reliable delivery windows and friendly reps, but several reviewers mention recent price hikes and inconsistent trim.',
    relationship: 'Current default distributor for Araujos Mexican Grill (good relationship, ordering since 2024)', distanceMiles: 6.2, leadTimeDays: 1, phone: '(408) 555-0141' },
  { id: 'fresh-field', name: 'Fresh Field Organics', pricePer20Lbs: { [CHICKEN.id]: 150 }, organicCertified: true, rating: 0, reviewCount: 0,
    reviewSummary: 'No reviews yet: new USDA-organic certified distributor that opened this season.',
    relationship: 'New distributor, never ordered from', distanceMiles: 9.8, leadTimeDays: 1, phone: '(408) 555-0187' },
  { id: 'bay-prime', name: 'Bay Prime Poultry', pricePer20Lbs: { [CHICKEN.id]: 275 }, organicCertified: true, rating: 3.6, reviewCount: 142,
    reviewSummary: 'Mixed: established for 15+ years with consistent quality; some complaints about late deliveries and slow customer service.',
    relationship: 'Established distributor, but this restaurant has never ordered from them', distanceMiles: 12.4, leadTimeDays: 1, phone: '(510) 555-0112' },
  { id: 'valley-wholesale', name: 'Valley Wholesale Foods', pricePer20Lbs: { [CHICKEN.id]: 120 }, organicCertified: false, rating: 4.1, reviewCount: 310,
    reviewSummary: 'Mostly positive: cheap and fast, but conventional (not organic) poultry only.',
    relationship: 'Established distributor, never ordered from (NOT organic)', distanceMiles: 4.1, leadTimeDays: 1, phone: '(408) 555-0199' },
];

function seeded(): PastOrder[] {
  const t = isoDate();
  const o = (n: string, d: number, q: number, total: number): PastOrder => ({
    confirmationNumber: n, date: addDays(t, -d), distributorId: 'rancho-valle', productId: CHICKEN.id, quantityLbs: q, total, status: 'Delivered',
  });
  return [o('ORD-24817', 119, 20, 200), o('ORD-25102', 98, 30, 307.5), o('ORD-25390', 84, 20, 205), o('ORD-25644', 70, 40, 420), o('ORD-25911', 58, 20, 210)];
}

const placed: PastOrder[] = [];
export function resetPlacedOrders() { placed.length = 0; }

const allOrders = () => [...seeded(), ...placed].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
const round2 = (v: number) => Math.round(v * 100) / 100;
const money = (v: number) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lbs = (v: number) => (Number.isInteger(v) ? `${v} lb` : `${v.toFixed(1)} lb`);
const pct = (v: number) => `${Math.abs(v).toFixed(1)}%`;
const perLb = (d: Distributor, pid: string) => (d.pricePer20Lbs[pid] !== undefined ? d.pricePer20Lbs[pid] / PRICE_UNIT_LBS : undefined);
const current = () => DISTRIBUTORS.find((d) => d.id === CURRENT_ID)!;
const earliest = (d: Distributor) => addDays(isoDate(), d.leadTimeDays);
const ratingText = (d: Distributor) => (d.reviewCount === 0 ? 'No reviews yet' : `${d.rating}/5 (${d.reviewCount} reviews)`);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
function relativeAge(iso: string): string {
  const days = daysBetween(iso, isoDate());
  if (days < 0) return days === -1 ? 'tomorrow' : `in ${-days} days`;
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 45) return `about ${Math.floor(days / 7)} weeks ago`;
  return `about ${Math.round(days / 30)} months ago`;
}
const dateText = (iso: string) => {
  const p = prettyDate(iso); // already ends in (today)/(tomorrow)/(yesterday) for near dates
  return p.includes('(') ? p : `${p} (${relativeAge(iso)})`;
};

function findProduct(q: string): Product {
  const s = q.trim().toLowerCase();
  const p = s && PRODUCTS.find((p) => p.id === s || p.name.toLowerCase() === s || p.aliases.some((a) => s === a || s.includes(a) || a.includes(s)));
  if (!p) throw new Error(`Unknown product "${q}". Available: ${PRODUCTS.map((p) => p.name).join(', ')}. Ask the user which product they mean.`);
  return p;
}
function findDistributor(q: string): Distributor | undefined {
  const s = q.trim().toLowerCase();
  return DISTRIBUTORS.find((d) => d.id === s) ?? DISTRIBUTORS.find((d) => d.name.toLowerCase().includes(s) || s.includes(d.name.toLowerCase()));
}
function parseDate(raw?: string): string | null {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'today' || s === 'hoy') return isoDate();
  if (s === 'tomorrow' || s === 'mañana' || s === 'manana') return addDays(isoDate(), 1);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
}

const orderLine = (o: PastOrder) => {
  const d = findDistributor(o.distributorId);
  const unit = o.total / o.quantityLbs;
  return `${o.confirmationNumber} · ${dateText(o.date)}: ${lbs(o.quantityLbs)} ${PRODUCTS.find((p) => p.id === o.productId)?.name ?? o.productId} from ${d?.name ?? o.distributorId} for ${money(o.total)} (${money(unit)}/lb, ${money(unit * PRICE_UNIT_LBS)} per 20 lb) — ${o.status}`;
};

// ---- logic (exported for tests) ----

export function getOrderHistory(product?: string) {
  const p = product?.trim() ? findProduct(product) : undefined;
  const orders = allOrders().filter((o) => !p || o.productId === p.id);
  const summary = orders.length
    ? `${orders.length} order(s) for ${RESTAURANT}${p ? ` of ${p.name}` : ''}. Most recent: ${orderLine(orders[0])}`
    : `No orders found for ${p?.name ?? RESTAURANT}.`;
  return { restaurantName: RESTAURANT, orderCount: orders.length, summary, orders: orders.map((o) => ({ ...o, line: orderLine(o) })) };
}

export function checkPriceChange(product: string, quantityLbs: number) {
  const p = findProduct(product);
  const cur = current();
  const now = perLb(cur, p.id)!;
  const last = allOrders().find((o) => o.productId === p.id && o.distributorId === cur.id);
  const currentTotal = round2(now * quantityLbs);
  if (!last) {
    return { productName: p.name, quantityLbs, distributorId: cur.id, distributorName: cur.name, lastOrderDate: '', lastPricePerLb: 0, lastTotalForQuantity: 0,
      currentPricePerLb: now, currentTotal, changeAmount: 0, changePercent: 0, flagged: false,
      message: `No previous order of ${p.name} from ${cur.name}; current price is ${money(currentTotal)} for ${lbs(quantityLbs)}.` };
  }
  const lastUnit = last.total / last.quantityLbs;
  const lastTotal = round2(lastUnit * quantityLbs);
  const diff = round2(currentTotal - lastTotal);
  const percent = round2(((now - lastUnit) / lastUnit) * 100);
  const flagged = percent >= FLAG_THRESHOLD_PERCENT;
  const message = flagged
    ? `Heads up: ${cur.name} raised the price of ${p.name} by ${pct(percent)}. ${lbs(quantityLbs)} now costs ${money(currentTotal)} vs ${money(lastTotal)} at your last order on ${dateText(last.date)} (+${money(diff)}; ${money(lastUnit)}/lb -> ${money(now)}/lb). Recommend comparing distributors (compare_distributors) before ordering.`
    : `${cur.name}'s price for ${p.name} changed ${percent >= 0 ? '+' : '-'}${pct(percent)} since ${dateText(last.date)}: ${money(currentTotal)} for ${lbs(quantityLbs)} (was ${money(lastTotal)}). No significant increase.`;
  return { productName: p.name, quantityLbs, distributorId: cur.id, distributorName: cur.name, lastOrderDate: last.date, lastPricePerLb: round2(lastUnit),
    lastTotalForQuantity: lastTotal, currentPricePerLb: now, currentTotal, changeAmount: diff, changePercent: percent, flagged, message };
}

export function compareDistributors(product: string, quantityLbs: number, includeNonOrganic = false, deliverBy?: string) {
  const p = findProduct(product);
  const cur = current();
  const by = deliverBy?.trim() ? parseDate(deliverBy) : earliest(cur);
  if (!by) throw new Error(`deliver_by must be YYYY-MM-DD or "tomorrow", got "${deliverBy}".`);
  const currentTotal = round2((perLb(cur, p.id) ?? 0) * quantityLbs);
  const eligible = DISTRIBUTORS.filter((d) => perLb(d, p.id) !== undefined && (includeNonOrganic || d.organicCertified) && earliest(d) <= by)
    .sort((a, b) => perLb(a, p.id)! - perLb(b, p.id)!);
  if (!eligible.length) throw new Error(`No distributor can deliver ${p.name} by ${prettyDate(by)}. Ask the user for a later date.`);
  const cheapestId = eligible[0].id;
  const options = eligible.map((d) => {
    const unit = perLb(d, p.id)!;
    const total = round2(unit * quantityLbs);
    const isCurrent = d.id === CURRENT_ID;
    const savings = round2(currentTotal - total);
    const savingsPct = currentTotal > 0 ? round2((savings / currentTotal) * 100) : 0;
    const recommendation = isCurrent ? 'CURRENT DISTRIBUTOR'
      : d.id === cheapestId && d.reviewCount === 0 ? 'CHEAPEST - NEW, NO REVIEWS'
      : d.id === cheapestId ? 'CHEAPEST' : savings > 0 ? 'CHEAPER - ESTABLISHED' : 'MORE EXPENSIVE';
    const saveText = isCurrent ? 'current distributor' : savings > 0 ? `saves ${money(savings)} (${pct(savingsPct)})` : `costs ${money(-savings)} more`;
    return {
      distributorId: d.id, distributorName: d.name, isCurrentDistributor: isCurrent, relationship: d.relationship, organicCertified: d.organicCertified,
      pricePerLb: round2(unit), pricePer20Lbs: round2(unit * PRICE_UNIT_LBS), totalPrice: total, rating: d.rating, reviewCount: d.reviewCount,
      ratingText: ratingText(d), reviewSummary: d.reviewSummary, deliveryDate: earliest(d), deliveryDateText: dateText(earliest(d)),
      distanceMiles: d.distanceMiles, savingsVsCurrent: savings, savingsPercentVsCurrent: savingsPct, recommendation,
      summary: `${d.name}: ${money(total)} for ${lbs(quantityLbs)} (${money(unit * PRICE_UNIT_LBS)}/20 lb), ${saveText}; ${ratingText(d)}; delivers ${dateText(earliest(d))}; ${d.organicCertified ? 'organic' : 'NOT organic'}.`,
    };
  });
  const excluded = includeNonOrganic ? 0 : DISTRIBUTORS.filter((d) => !d.organicCertified && perLb(d, p.id) !== undefined).length;
  const cheaper = options.filter((o) => !o.isCurrentDistributor && o.savingsVsCurrent > 0);
  const curOpt = options.find((o) => o.isCurrentDistributor);
  let s = `${options.length} distributor(s) can deliver ${lbs(quantityLbs)} of ${p.name} by ${prettyDate(by)}. `;
  if (cheaper.length) {
    const b = cheaper[0];
    s += `Cheapest: ${b.distributorName} at ${money(b.totalPrice)} (save ${money(b.savingsVsCurrent)}, ${pct(b.savingsPercentVsCurrent)} vs your current distributor)`;
    if (b.reviewCount === 0) s += ' — new distributor with no reviews yet, so it is a bit of a risk';
    s += '. ';
    const n = cheaper[1];
    if (n) s += `Also cheaper: ${n.distributorName} at ${money(n.totalPrice)} (save ${money(n.savingsVsCurrent)}; ${n.ratingText}; ${n.relationship.toLowerCase()}). `;
  }
  if (curOpt) s += `Or stay with your current distributor ${curOpt.distributorName} at ${money(curOpt.totalPrice)} (${curOpt.ratingText}, good relationship). `;
  if (excluded) s += `${excluded} non-organic distributor(s) excluded because the order must be organic. `;
  s += 'Ask the user which distributor to use before calling place_order.';
  return { productName: p.name, quantityLbs, deliverBy: by, currentDistributorTotal: currentTotal, options, recommendationSummary: s };
}

export function placeOrder(distributorId: string, product: string, quantityLbs: number, deliveryDate?: string) {
  const d = findDistributor(distributorId);
  if (!d) throw new Error(`Unknown distributor_id "${distributorId}". Valid ids: ${DISTRIBUTORS.map((d) => d.id).join(', ')}.`);
  const p = findProduct(product);
  const unit = perLb(d, p.id);
  if (unit === undefined) throw new Error(`${d.name} does not sell ${p.name}.`);
  const first = earliest(d);
  const date = deliveryDate?.trim() ? parseDate(deliveryDate) : first;
  if (!date) throw new Error(`delivery_date must be YYYY-MM-DD or "tomorrow", got "${deliveryDate}".`);
  if (date < first) throw new Error(`${d.name} can deliver ${prettyDate(first)} at the earliest. Ask the user to pick that date or later.`);
  const total = round2(unit * quantityLbs);
  const cur = current();
  const savings = d.id === cur.id ? 0 : round2((perLb(cur, p.id) ?? unit) * quantityLbs - total);
  const confirmationNumber = `ORD-${26000 + (Math.floor(Date.now() / 1000) % 9000) + placed.length}`;
  const status = 'Confirmed - delivery scheduled';
  placed.push({ confirmationNumber, date: isoDate(), distributorId: d.id, productId: p.id, quantityLbs, total, status });
  const message = `Order ${confirmationNumber} placed with ${d.name}: ${lbs(quantityLbs)} ${p.name} for ${money(total)}, delivering ${prettyDate(date)}.${savings > 0 ? ` You save ${money(savings)} vs ${cur.name}.` : ''}`;
  return { confirmationNumber, distributorId: d.id, distributorName: d.name, productName: p.name, quantityLbs, totalPrice: total, deliveryDate: date, status, savingsVsCurrent: savings, message };
}

export function getCurrentDistributor() {
  const d = current();
  const count = allOrders().filter((o) => o.distributorId === d.id).length;
  return { restaurantName: RESTAURANT, distributorId: d.id, distributorName: d.name, relationship: d.relationship, ratingText: ratingText(d),
    reviewSummary: d.reviewSummary, pastOrderCount: count, phone: d.phone,
    summary: `${RESTAURANT} usually orders from ${d.name} (${count} past orders, ${ratingText(d)}).` };
}

// ---- MCP registration ----

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
function out(headline: string, data: unknown) {
  return { content: [{ type: 'text' as const, text: `${headline}\n\n${JSON.stringify(data, null, 2)}` }] };
}
function wrap<T>(fn: () => T, headline: (r: T) => string) {
  try {
    const r = fn();
    return out(headline(r), r);
  } catch (e) {
    return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }], isError: true };
  }
}
const qty = z.number().positive().max(2000).describe('Quantity in pounds, e.g. 20 or 30. Prices are per 20 lb and scale linearly.');
const prod = z.string().min(1).describe('Product, e.g. "organic chicken". "meat" means organic chicken (the restaurant\'s usual meat order).');

export function registerPurchasingTools(server: McpServer) {
  server.registerTool('get_order_history', {
    title: 'Restaurant purchase history',
    description: "Get Araujos Mexican Grill's past orders FROM its distributors (newest first), including orders placed with place_order. Use for \"what did we pay last time?\". Typical reorder workflow: get_order_history -> check_price_change -> compare_distributors -> (user confirms) -> place_order.",
    inputSchema: { product: z.string().optional().describe('Optional product filter, e.g. "organic chicken". Omit for all orders.') },
    annotations: { title: 'Restaurant purchase history', ...RO },
  }, ({ product }) => wrap(() => getOrderHistory(product), (r) => r.summary));

  server.registerTool('check_price_change', {
    title: 'Check distributor price change',
    description: "Compare the current distributor's price for a product with the last price the restaurant paid (from order history). Returns % and $ change and flagged=true when it rose 10% or more. Call BEFORE place_order for any reorder; if flagged, tell the user the % and $ increase, then call compare_distributors.",
    inputSchema: { product: prod, quantity_lbs: qty },
    annotations: { title: 'Check distributor price change', ...RO },
  }, ({ product, quantity_lbs }) => wrap(() => checkPriceChange(product, quantity_lbs), (r) => r.message));

  server.registerTool('compare_distributors', {
    title: 'Compare distributors',
    description: 'Compare nearby distributors that sell the product and can deliver by a date, cheapest first: price, total, reviews, relationship, delivery date and savings vs the current distributor. Present cheaper options AND the current distributor; mention when an option is new or has no reviews. Never call place_order until the user picks one.',
    inputSchema: {
      product: prod,
      quantity_lbs: qty,
      include_non_organic: z.boolean().default(false).describe('true only if the user says organic is not required (default: organic only)'),
      deliver_by: z.string().optional().describe('Latest acceptable delivery date, YYYY-MM-DD or "tomorrow" (default: the current distributor\'s next delivery date)'),
    },
    annotations: { title: 'Compare distributors', ...RO },
  }, ({ product, quantity_lbs, include_non_organic, deliver_by }) =>
    wrap(() => compareDistributors(product, quantity_lbs, include_non_organic, deliver_by), (r) => r.recommendationSummary));

  server.registerTool('place_order', {
    title: 'Place order with distributor',
    description: 'Place the restaurant\'s order with a distributor (demo data, in memory). Only call AFTER check_price_change and compare_distributors AND after the user explicitly confirmed distributor, quantity and total. Returns a confirmation number; the order then shows in get_order_history. (Different from create_order, which records a produce order received by Distribuidora.)',
    inputSchema: {
      distributor_id: z.string().min(1).describe('Distributor id from compare_distributors: "fresh-field", "bay-prime" or "rancho-valle"'),
      product: prod,
      quantity_lbs: qty,
      delivery_date: z.string().optional().describe('YYYY-MM-DD or "tomorrow" (default: distributor\'s earliest delivery date)'),
    },
    annotations: { title: 'Place order with distributor', readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, ({ distributor_id, product, quantity_lbs, delivery_date }) =>
    wrap(() => placeOrder(distributor_id, product, quantity_lbs, delivery_date), (r) => r.message));

  server.registerTool('get_current_distributor', {
    title: 'Current distributor',
    description: "Get the restaurant's current (default) meat/poultry distributor, its reviews and relationship.",
    inputSchema: {},
    annotations: { title: 'Current distributor', ...RO },
  }, () => wrap(() => getCurrentDistributor(), (r) => r.summary));
}
