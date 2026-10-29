// End-to-end smoke test: connects to a running server over Streamable HTTP and calls every tool.
//   npm run smoke                       (defaults to http://127.0.0.1:3333/mcp)
//   MCP_URL=https://x.trycloudflare.com/mcp npm run smoke
//   SMOKE_WRITE=0 npm run smoke         (skip create_order / mark_order_processed)
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = new URL(process.env.MCP_URL || 'http://127.0.0.1:3333/mcp');
const write = process.env.SMOKE_WRITE !== '0';
const client = new Client({ name: 'distribuidora-smoke', version: '0.1.0' });
await client.connect(new StreamableHTTPClientTransport(url));

const info = client.getServerVersion();
console.log(`Connected to ${info?.name} ${info?.version}`);
console.log(`Instructions: ${client.getInstructions()?.slice(0, 120)}…\n`);
const { tools } = await client.listTools();
for (const t of tools) console.log(`tool ${t.name} ${JSON.stringify(t.annotations)}`);

let failures = 0;
async function call(name: string, args: Record<string, unknown>) {
  const r = await client.callTool({ name, arguments: args });
  const body = (r.content as { type: string; text: string }[]).map((c) => c.text).join('\n');
  console.log(`\n===== ${name} ${JSON.stringify(args)}${r.isError ? '  [isError]' : ''}\n${body}`);
  if (r.isError) failures++;
  return body;
}

await call('get_daily_summary', {});
await call('list_orders', { status: 'new', limit: 5 });
await call('list_orders', { client: 'araujos', expected_from: 'yesterday', expected_to: 'tomorrow' });
await call('list_clients', {});
const listed = await call('list_orders', { limit: 1 });
const latest = Number(/Order #(\d+)/.exec(listed)?.[1]);
await call('get_order', { order_number: latest });
if (write) {
  const created = await call('create_order', {
    client: 'Araujos Mexican Grill',
    expected_date: 'tomorrow',
    closed_by: 'Gemini demo',
    lines: [
      { product: 'Tomate', unit: 'caja', quantity: 3 },
      { product: 'Aguacate', unit: 'caja', quantity: 4 },
      { product: 'Cilantro', unit: 'caja', quantity: 1.5 },
      { product: 'Jalapeño', unit: 'lb', quantity: 12.5 },
    ],
  });
  const numero = Number(/Created order #(\d+)/.exec(created)?.[1]);
  await call('mark_order_processed', { order_number: numero });
  await call('mark_order_processed', { order_number: numero });
}
// Expected error path
const r = await client.callTool({ name: 'get_order', arguments: { order_number: 999999 } });
console.log(`\n===== get_order 999999 → isError=${r.isError} (expected true)`);
if (!r.isError) failures++;

await client.close();
console.log(failures ? `\nFAILED: ${failures} unexpected error(s)` : '\nALL TOOLS OK');
process.exit(failures ? 1 : 0);
