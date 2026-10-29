# Orderly
Connecting local restaurants with local produce 

Demo for a produce distributor: restaurant tablets send produce orders into a shared inbox that both owners can see, then print box labels from Android.

This is a hackathon / discovery cut, not the full operations product. It shows that the same order can leave the restaurant tablet and land in one place the distributor controls.

## Google Drive

[Project document](https://docs.google.com/document/d/13L58BoGfJt-KIRycaymIj_-7qPE-MXNVD5cA7TCYQrE/edit?usp=sharing)

## The problem

Today, Araujos Mexican Grill builds a produce order on a tablet and shares it over WhatsApp when the order is closed. That message lives on one person's phone. With two owners at the distributor, a message was missed and the order was never filled.

The issue is not missing product. It is that the order has no shared home, no structured expected date, and no label per box.

## What this demo shows

1. A restaurant tablet sends an order message (with a per-client secret key) to the distributor's API.
2. Only that API writes to the distributor's MySQL database and returns an order number.
3. A green PWA panel and a distributor Android app both poll that API, show new orders, and open order detail.
4. The Android app prints Zebra ZPL labels over Bluetooth (`ceil` of quantity, `n of N` per product).

```text
Restaurant tablet  --HTTP message (no SQL)-->  API gateway ("puerta")
                                                    |
                                                    v
                                              MySQL (distribuidora)
                                                    ^
                          PWA panel  ----poll----   |
                          Android app --poll----   |
                          Android app --print--> Zebra labels
```

## Repo layout

| Path | Role |
|------|------|
| `api/` | PHP gateway: create accounts, receive order messages, list orders |
| `app/` | Astro + React PWA control panel (accounts, inbox, detail, label preview) |
| `android/` | Distributor Android app (notifications, detail, Bluetooth ZPL print) |
| `apk/` | Built APK copy for install / server upload |
| `database/` | MySQL schema and helper SQL |
| `01-descubrimiento/` | Discovery notes (diagnosis, scope, meeting script) |
| `insumos/planes/` | Demo plan and flow details |

## Stack

- **API:** PHP + MySQL (XAMPP)
- **Panel:** Astro, React, Tailwind, PWA
- **Mobile:** Kotlin Android app, Bluetooth ZPL to Zebra printers

## Local setup

1. Start MySQL in XAMPP.
2. Apply `database/schema.sql` to a database named `distribuidora`.
3. Copy `api/config/db.sample.php` to `api/config/db.php` and set credentials.
4. Run the API:

   ```bash
   cd api
   C:\xampp\php\php.exe -S 0.0.0.0:8084 -t .
   ```

5. Run the panel:

   ```bash
   cd app
   npm install
   npm run dev
   ```

   Open [http://localhost:4323](http://localhost:4323).

6. Point the restaurant tablet at this machine's LAN IP on port `8084`. In the Android emulator, use `10.0.2.2`.

## Demo flow (short)

1. In the PWA, create a client account and copy the generated secret key.
2. On the restaurant Pedidos tablet, switch **Local | Envío**, paste the key, build produce lines, review, and send.
3. The API stores the order and returns a number; the tablet then closes produce in its own ops system.
4. The PWA and distributor Android app show the order in the inbox.
5. From Android, print labels: one per unit (`ceil`), 4 × 2.5 in, with order number, client, address, product, and `n of N`.

## Out of scope (this cut)

Restaurant self-serve portal for other venues, pricing, invoicing, inventory, routes, substitutions, Firebase push, and writing SQL from the tablet into the distributor database.

## License

GNU General Public License v3. See [LICENSE](LICENSE).
