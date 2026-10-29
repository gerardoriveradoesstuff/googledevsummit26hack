# Demo script — Gemini price agent (~60s)

**Persona:** Restaurant manager (Araujos) restocking produce  
**Setup:** 2–3 suppliers in demo DB with different day prices  
**Rule:** Gemini suggests; human approves

---

### 0:00–0:08 — Hook

> “Today restaurants guess supplier prices. Watch an agent place the order and negotiate the cart in real time.”

**Show:** Portal / order screen with draft: e.g. *10 cajas aguacate, 5 habanero, 3 pimentón*.

---

### 0:08–0:25 — Live assist while building

> “While I build the order, Gemini checks our suppliers.”

**Agent (chat or side panel):**

> “Aguacate: Supplier A $48/box · Supplier B $41/box. Switch 10 boxes to B → save ~$70. Approve?”

**You:** tap **Approve** on aguacate only.

**Say:** “One tap — cheaper source, same product.”

---

### 0:25–0:45 — Draft check before send

> “Before we send, the agent re-checks the full cart.”

**Agent summary card:**

- Aguacate → B (approved)
- Habanero → keep A (B out of stock / quality flag)
- Pimentón → suggest C (−12%) → **pending**

**You:** Approve pimentón · leave habanero · **Send order**.

**Say:** “Agent recommends. We decide. Then it places the order.”

---

### 0:45–0:60 — Payoff

**Show:** Order confirmed + savings line, e.g. *Saved $84 vs default supplier · 2 of 3 lines optimized*.

> “Real-time price intelligence for the restaurant — without giving up control.”

**Optional closer (one line):** “Next: this confirmed order lands in Distribuidora’s inbox like today’s demo.”

---

### Props for the 1-minute run

| Item | Demo value |
|---|---|
| Suppliers | A (usual), B (cheaper produce), C (spot deal) |
| Cart | 3 lines only |
| Approvals | 2 approve · 1 keep |
| Savings | One clear number on screen |

### What judges should feel

1. Agent helps **while ordering**
2. Agent rechecks **before submit**
3. Better prices are **recommendations**, not silent swaps
