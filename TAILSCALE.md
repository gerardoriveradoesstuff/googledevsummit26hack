# Run the backend on a laptop and expose it with Tailscale Funnel

The team can't use `demo.ouwap.com`, so one teammate's laptop runs the backend and Tailscale Funnel gives it a public HTTPS name:

| Service | Local | Public (Funnel) |
|---|---|---|
| PHP API (`api/`) | `http://127.0.0.1:8084/v1/...` | `https://<host>.<tailnet>.ts.net/v1/...` (port 443) |
| MCP server (`mcp/`) | `http://127.0.0.1:3333/mcp` | `https://<host>.<tailnet>.ts.net:8443/mcp` |

There are no path prefixes. The API is funneled at the root on 443, and MCP gets its own Funnel port, 8443. Funnel only allows ports **443, 8443 and 10000**.

The laptop must **stay awake and online** for the whole demo. Turn off sleep, plug it in, and keep both terminals open.

---

## 0. One-time Tailscale setup (both OSes)

1. Create or join the tailnet at https://login.tailscale.com. The person who enables Funnel must be an Owner, Admin or Network admin.
2. In the admin console, open **DNS** and check that **MagicDNS** is on. Then turn on **HTTPS Certificates** on the same page.
3. Funnel needs the `funnel` node attribute in the tailnet policy. The first `tailscale funnel ...` command opens a browser page that asks you to approve it, and that adds the attribute. You can also add it yourself: **Access controls**, then **Funnel**, then **Add Funnel to policy**.
4. Public DNS for a new Funnel name can take up to about 10 minutes to propagate.

---

## A. Windows (PowerShell + XAMPP)

### A1. Install and log in
```powershell
winget install --id Tailscale.Tailscale -e     # or download from https://tailscale.com/download/windows
tailscale up                                     # opens the browser to log in
tailscale status                                 # the first line shows this machine's name
```
If `tailscale` isn't on PATH, run `& "C:\Program Files\Tailscale\tailscale.exe" ...` instead.

### A2. Database (XAMPP MySQL)
Start **MySQL** in the XAMPP Control Panel. You don't need Apache because PHP's built-in server is used. Then, from the repo root:
```powershell
cd C:\path\to\googledevsummit26hack
& C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS distribuidora CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root --default-character-set=utf8mb4 distribuidora < database\schema.sql"
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root --default-character-set=utf8mb4 distribuidora < database\seed.sql"
Copy-Item api\config\db.sample.php api\config\db.php    # defaults: 127.0.0.1, root, no password
```
`seed.sql` is idempotent, so you can re-run it any time to reset the demo data. You can also use phpMyAdmin: open `distribuidora`, choose Import and pick `seed.sql`.

### A3. PHP API on 8084 (terminal 1)
```powershell
cd C:\path\to\googledevsummit26hack
& C:\xampp\php\php.exe -S 127.0.0.1:8084 -t api api\router.php
```
`api/router.php` answers both `/v1/...` and `/api/v1/...`, so a base URL that ends in `/api` also works. It only serves `v1/*.php`, so `config/`, `lib/` and `tests/` are never reachable. The router is optional: plain `php -S 127.0.0.1:8084 -t api` also works as long as the base URL has no `/api`.

### A4. MCP server on 3333 (terminal 2)
Node 20 or newer is required (`winget install OpenJS.NodeJS.LTS`).
```powershell
cd C:\path\to\googledevsummit26hack\mcp
npm install
npm run build
$env:DISTRIBUIDORA_API_URL = "http://127.0.0.1:8084"
$env:PORT = "3333"
npm start
```
You can put the same values in `mcp\.env` instead (copy `.env.example`). If PHP or MySQL won't run, start it with `$env:MOCK = "1"` to use built-in demo data.

### A5. Funnel both (terminal 3, admin PowerShell if it asks)
```powershell
tailscale funnel --bg 8084
tailscale funnel --bg --https=8443 3333
tailscale funnel status
```
`--bg` keeps both funnels running after the terminal closes and across reboots. To stop them:
```powershell
tailscale funnel reset                      # removes everything
# or one at a time:
tailscale funnel --https=443 off
tailscale funnel --https=8443 off
```

---

## B. macOS

### B1. Install and log in
Funnel works best with the **open-source variant** (Homebrew):
```bash
brew install tailscale
sudo brew services start tailscale
sudo tailscale up            # prints or opens a login URL
tailscale status
```
You can use the Standalone app from tailscale.com/download instead, with *Settings → CLI integration → Install Now*. Funnel can share ports from it. With the App Store app the CLI is `/Applications/Tailscale.app/Contents/MacOS/Tailscale`. If a `tailscale funnel` command fails with a permission error under brew, prefix it with `sudo`, or run `sudo tailscale set --operator=$USER` once.

### B2. Database and PHP
```bash
brew install php mysql node
brew services start mysql
cd ~/path/to/googledevsummit26hack
mysql -u root -e "CREATE DATABASE IF NOT EXISTS distribuidora CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root distribuidora < database/schema.sql
mysql -u root distribuidora < database/seed.sql
cp api/config/db.sample.php api/config/db.php      # edit if your root user has a password
```

### B3. PHP API on 8084 (terminal 1)
```bash
php -S 127.0.0.1:8084 -t api api/router.php
```

### B4. MCP server on 3333 (terminal 2)
```bash
cd mcp && npm install && npm run build
DISTRIBUIDORA_API_URL=http://127.0.0.1:8084 PORT=3333 npm start
```

### B5. Funnel both
```bash
tailscale funnel --bg 8084
tailscale funnel --bg --https=8443 3333
tailscale funnel status
# stop: tailscale funnel reset
```
To keep the Mac awake while plugged in, run `caffeinate -dims` in a spare terminal, or change System Settings → Battery/Energy.

---

## Find the public URL

`tailscale funnel status` prints something like:
```
# Funnel on:
#     - https://laptop.tail1234.ts.net
#     - https://laptop.tail1234.ts.net:8443

https://laptop.tail1234.ts.net (Funnel on)
|-- / proxy http://127.0.0.1:8084

https://laptop.tail1234.ts.net:8443 (Funnel on)
|-- / proxy http://127.0.0.1:3333
```
From here on, `https://laptop.tail1234.ts.net` stands for **your** host.

## Quick checks (from any machine, including a phone off Wi-Fi)

```bash
H=https://laptop.tail1234.ts.net
curl -s $H/v1/pedidos.php | head -c 300          # {"status":"ok","pedidos":[...]}
curl -s $H:8443/healthz                         # {"ok":true,"mode":"http"}
curl -s -X POST $H:8443/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | head -c 300
```
In PowerShell, use `curl.exe` (not the `curl` alias), and use backticks or one line for continuations. You can also run the full smoke test: `cd mcp; $env:MCP_URL="https://laptop.tail1234.ts.net:8443/mcp"; npm run smoke`.

## Point the clients at it

- **Android app (Orderly / Distribuidora):** tap the **server icon** in the top bar to open the *Servidor* dialog. Enter `https://laptop.tail1234.ts.net`, tap **Probar** (it should say `OK: N pedidos`), then **Guardar**. The app appends `/v1/...` itself. A trailing `/` or `/api` is fine. **Predeterminado** goes back to the default. You can also bake the URL in at build time: `./gradlew assembleDebug -PapiBaseUrl=https://laptop.tail1234.ts.net`.
- **Gemini (Developer Mode → MCP server):** add `https://laptop.tail1234.ts.net:8443/mcp`.
- **PWA (`app/`):** `PUBLIC_API_URL=https://laptop.tail1234.ts.net npm run dev`, or put it in `app/.env` (see `app/.env.example`). It's read at build time.
- **Account links (optional):** the API returns `https://demo.ouwap.com/portal` as the clients' portal link. To change it, set the env var `PORTAL_URL` before starting PHP (`$env:PORTAL_URL="..."` or `PORTAL_URL=... php -S ...`).

## Troubleshooting

- **`funnel` asks to enable HTTPS or Funnel:** follow the link it prints and approve. This updates the policy and the certificates.
- **The first request hangs or gets a TLS error:** the certificate is provisioned on the first request, so retry after about 30 seconds. New DNS names can take up to 10 minutes.
- **404 or `no es JSON` in the app:** the base URL is wrong. It must be the host only, like `https://<host>.ts.net`, and not the `:8443` MCP port.
- **MCP 403 `Invalid Host`:** you set `ALLOWED_HOSTS`. Add the host name without the port (`laptop.tail1234.ts.net`), or leave it unset. It's unset by default, and with `HOST=0.0.0.0` no Host check runs.
- **Nothing answers:** run `tailscale funnel status`, check that both local servers respond on `127.0.0.1`, and make sure the laptop didn't sleep.
