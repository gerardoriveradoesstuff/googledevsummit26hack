// Remote MCP server for Distribuidora de Productos — Streamable HTTP only, stateless, POST /mcp.
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { apiFromEnv } from './api.js';
import { createServer } from './server.js';

try {
  process.loadEnvFile?.('.env');
} catch {
  /* no .env — use real env vars */
}

const PORT = Number(process.env.PORT || 3333);
const HOST = process.env.HOST || '0.0.0.0';
const allowedHosts = process.env.ALLOWED_HOSTS?.split(',').map((s) => s.trim()).filter(Boolean);
const api = apiFromEnv();

const app = createMcpExpressApp({ host: HOST, ...(allowedHosts?.length ? { allowedHosts } : {}) });

app.get('/', (_req: Request, res: Response) => {
  res.json({ name: 'distribuidora-de-productos MCP', mcp_endpoint: '/mcp', mode: api.mode });
});
app.get('/healthz', (_req: Request, res: Response) => {
  res.json({ ok: true, mode: api.mode });
});

// Stateless: a fresh server + transport per request (no session ids), which is what simple remote clients expect.
const handle = async (req: Request, res: Response) => {
  const server = createServer(api);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => {
    void transport.close();
    void server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    console.error('MCP request failed', e);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
  }
};
const notAllowed = (_req: Request, res: Response) => {
  res.status(405).set('Allow', 'POST').json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed (stateless server: use POST).' }, id: null });
};
for (const path of ['/mcp', '/v1/mcp']) {
  app.post(path, handle);
  app.get(path, notAllowed);
  app.delete(path, notAllowed);
}

app.listen(PORT, HOST, () => {
  const target = api.mode === 'mock' ? 'MOCK data (fixtures/seed-data.json)' : process.env.DISTRIBUIDORA_API_URL || 'http://127.0.0.1:8084';
  console.log(`Distribuidora MCP listening on http://${HOST}:${PORT}/mcp → ${target}`);
});
