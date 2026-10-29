# Distribuidora MCP server (Track 1: Gemini app ↔ Distribuidora)

A remote **MCP server** that lets the **Gemini app** read and create produce orders in *Distribuidora de Productos*.
It speaks **Streamable HTTP only** at `POST /mcp` (alias `/v1/mcp`), runs stateless, and **only talks to the existing PHP API** (`api/`, "la puerta") over HTTP. It never touches MySQL.

```text
Gemini app ──HTTPS (MCP)──> mcp/ (Node, :3333/mcp) ──HTTP JSON──> api/ PHP (:8084) ──> MySQL distribuidora
                                                          ▲
                              same endpoints the PWA panel, Android app and restaurant tablet use
```

## Tools

| Tool | What it does | API call | Annotations |
|------|--------------|----------|-------------|
| `get_daily_summary` | Prep sheet for a delivery day: orders due (to prepare and processed), **totals per product with label counts**, overdue orders, and a look at the next day | `GET /v1/pedidos.php` | readOnly |
| `list_orders` | Filter by `status` (new/processed/all), `client`, `expected_date`, or `expected_from`/`expected_to`, plus `limit` | `GET /v1/pedidos.php` | readOnly |
| `get_order` | One order in full: address, items, labels | `GET /v1/pedidos.php` | readOnly |
| `list_clients` | Restaurant accounts with address, notes, order counts and latest order (passwords are never returned) | `GET /v1/cuentas.php` + pedidos | readOnly |
| `create_order` | New order for a client. It goes through **the same message endpoint the tablet uses** and returns the new order number | `POST /v1/mensajes.php` | write, not destructive |
| `mark_order_processed` | Moves an order out of the "new" inbox. The app can't undo this | `POST /v1/pedidos.php {numero}` | write, **destructiveHint**, idempotent |

Dates accept `today` / `tomorrow` / `yesterday` (also `hoy` / `mañana` / `ayer`) or `YYYY-MM-DD`, in America/Los_Angeles.
Tool results are plain, pre-aggregated text: client names, order numbers, dates, line items and label counts (`ceil(cantidad)`, the same rule as the Android printer).
The server `instructions` describe the business. They also tell Gemini to confirm with the user before calling either write tool. The Gemini app also asks for manual confirmation before any write.

### Scenario 1 tools: restaurant buying from distributors (mock data, mirrors the Android AppFunctions)

These always use the built-in demo data in `src/purchasing.ts`, whether or not `MOCK=1` is set. Orders placed with `place_order` stay in memory until the server restarts. They mirror `android/APPFUNCTIONS.md` so Scenario 1 can also run through Gemini Developer Mode.

| Tool | What it does | Hints |
|---|---|---|
| `get_order_history` | Araujos' past orders from its distributors, newest first, including orders placed here. Optional `product` | readOnly |
| `check_price_change` | Compares the current distributor (Rancho Valle Meats) with the last price paid for `product` + `quantity_lbs`. Returns the % and $ change and `flagged` (a rise of 10% or more) | readOnly |
| `compare_distributors` | Organic distributors that can deliver by `deliver_by` (default tomorrow), cheapest first. Shows totals, reviews, relationship and savings vs the current distributor, plus a recommendation | readOnly |
| `place_order` | Places the order (`distributor_id`, `product`, `quantity_lbs`, `delivery_date?`) and returns a confirmation number. Only use it after the user confirms | write |
| `get_current_distributor` | The default distributor and the relationship with it | readOnly |

Prompts to try: "Order 20 lbs of organic chicken for Araujos" → the price is flagged (+42.9%, $210 → $300) → "compare distributors" → "go with Fresh Field" → "show my order history".

## Run it

Requires Node ≥ 20.12. The Inspector UI needs Node ≥ 22.19.

```bash
cd mcp
npm install
cp .env.example .env        # set DISTRIBUIDORA_API_URL (no /v1), e.g. http://127.0.0.1:8084
npm run dev                 # tsx watch, or:
npm run build && npm start  # → http://0.0.0.0:3333/mcp
```

Against the real API you need the PHP API running with the seed applied (see the root README):

```bash
cd api && php -S 127.0.0.1:8084 -t .          # Windows/XAMPP: C:\xampp\php\php.exe -S 0.0.0.0:8084 -t .
```

**Mock mode (no PHP or MySQL):** `MOCK=1 npm start`, or `npm run start:mock` after a build. This serves the same demo data from `fixtures/seed-data.json`, which `database/generar_seed.py` generates alongside `database/seed.sql`. Data lives in memory: creates and updates are kept until restart.
On Windows PowerShell: `$env:MOCK=1; npm start`.

Health check: `GET /healthz` → `{ ok, mode }`.

## Test

**Smoke test (calls every tool, including one create and one mark-processed):**

```bash
npm run smoke                                   # http://127.0.0.1:3333/mcp
MCP_URL=https://<tunnel>/mcp npm run smoke      # through the tunnel
SMOKE_WRITE=0 npm run smoke                     # read-only
```

The write test adds an order to the database. Re-apply `database/seed.sql` afterwards to reset.

**MCP Inspector:**

```bash
npx @modelcontextprotocol/inspector             # UI: Transport "Streamable HTTP", URL http://localhost:3333/mcp
# CLI:
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:3333/mcp --transport http --method tools/list
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:3333/mcp --transport http \
  --method tools/call --tool-name get_daily_summary --tool-arg date=today
```

## Expose it publicly and add it to Gemini

Gemini needs a **public HTTPS** URL. Pick one:

```bash
# Cloudflare quick tunnel (no account): prints https://<random>.trycloudflare.com
cloudflared tunnel --url http://localhost:3333
# or ngrok
ngrok http 3333
```

Your MCP URL is `https://<tunnel-host>/mcp`. To lock the Host header down, set `ALLOWED_HOSTS=<tunnel-host>,localhost` in `.env`.
The tunnel only forwards to the MCP server. The PHP API can stay on localhost. For a stable URL, deploy `mcp/` to Cloud Run (`gcloud run deploy --source mcp`) with `DISTRIBUIDORA_API_URL=https://demo.ouwap.com/api`.

In Gemini (personal account, US, 18+, Keep Activity on):

- **Developer Mode (recommended for the hackathon):** go to gemini.google.com → **Settings → Gemini Apps Developer Mode** (or `gemini.google.com/devmode`) → **+ Create new** → paste `https://<tunnel-host>/mcp`, and choose no authentication. The Event Log and Tool Schemas tabs show every call.
- **Connected Apps:** go to **Settings → Connected Apps → Custom apps → Add a custom app**, then enter the URL. Once added, it also works in the Gemini mobile app. Type `@` in a prompt to force the app.
- **Gemini CLI alternative:** `gemini mcp add --transport http distribuidora https://<tunnel-host>/mcp --scope user`.

## Demo script (5 prompts)

1. **"What do I need to prepare for today's deliveries? Give me totals per product."** → `get_daily_summary`. Shows orders to prepare, totals like "30 lb Jalapeño, 10 caja Aguacate", label counts, **and flags overdue orders nobody processed**. That's the lost-WhatsApp problem.
2. **"Taquería La Palma's order from yesterday was never processed. Show me what's in it."** → `list_orders` (client, yesterday) then `get_order`.
3. **"Which restaurants have orders for tomorrow, and where do they deliver?"** → `list_orders expected_date=tomorrow` plus `list_clients`.
4. **"Araujos Mexican Grill needs 3 cases of tomato, 4 cases of avocado, a case and a half of cilantro and 12.5 lb of jalapeño for tomorrow. Place it."** → Gemini confirms, then `create_order`, which returns the new order number. Show it popping up in the PWA or Android inbox.
5. **"I just packed that order. Mark it processed and tell me how many labels to print."** → Gemini confirms, then `mark_order_processed`. The order shows its labels (12.5 lb → 13 labels).

## Auth (now and later)

**Dev mode only:** there is no auth on `/mcp`, and the PHP API itself has no admin auth. `GET /v1/cuentas.php` returns every client's usuario and contrasena, which is how `create_order` signs the tablet message server-side.
Before anything real:

1. **OAuth 2.1 on the MCP server.** Use the SDK's `mcpAuthRouter` / `requireBearerAuth` (`@modelcontextprotocol/sdk/server/auth`), or put a provider (Google, Auth0, WorkOS) in front. Publish `/.well-known/oauth-protected-resource`, and support Dynamic Client Registration (DCR), or enter the client ID and secret in Gemini under "Advanced features". Map the signed-in user to the distributor (owners only).
2. **Lock the PHP API.** Add a server-to-server admin key header for `cuentas.php` and `pedidos.php`, and send it from `HttpApi`. Then stop exposing `contrasena` in `cuentas.php`, and add an admin-side "create order for client" endpoint so the MCP server no longer needs client passwords.
