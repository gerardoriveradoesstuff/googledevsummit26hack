# Demo script — Gemini price agent (~60s)

**Persona:** Restaurant manager (Araujos) restocking produce  
**Setup:** 2–3 suppliers in demo DB with different day prices  
**Rule:** Gemini suggests; human approves

**Core idea:** Today the manager calls suppliers or opens each website for day prices, then places the order by hand. Gemini does the price check in real time while they build the cart, recommends better options, and places the order only after they approve.

---

### 0:00–0:10 — Hook

> “Every restock, the manager calls suppliers or opens their websites to get today’s prices — then still has to build and send the order. Watch a Gemini agent do both in real time: check provider prices and put the order through.”

**Show:** Split beat if possible — phone / browser tabs vs. one order screen.  
Then cut to the portal with a draft cart: *10 cajas aguacate, 5 habanero, 3 pimentón*.

---

### 0:10–0:28 — Live assist while building

> “As they add lines, the agent checks our suppliers for them.”

**Agent (chat or side panel):**

> “Aguacate today — Supplier A $48/box (their usual call). Supplier B $41/box online. Same grade. Switch 10 boxes to B → save ~$70. Approve?”

**You:** tap **Approve** on aguacate only.

**Say:** “That’s the phone call and the website check — done in one tap. Manager still decides.”

---

### 0:28–0:48 — Draft check before send

> “Before send, Gemini re-runs the full cart the way a careful buyer would — one last pass across suppliers.”

**Agent summary card:**

- Aguacate → B (approved; beat the usual quote)
- Habanero → keep A (B out / quality flag — agent would not blind-swap)
- Pimentón → Supplier C is −12% vs A → **pending**

**You:** Approve pimentón · leave habanero · **Send order**.

**Say:** “Recommend. Confirm. Place. No silent swaps, no missed cheaper option.”

---

### 0:48–0:60 — Payoff

**Show:** Order confirmed + savings line, e.g. *Saved $84 vs calling the usual supplier · 2 of 3 lines optimized · 0 calls made*.

> “From phone-and-website shopping to one agent-assisted order — prices compared, order placed, manager in control.”

**Optional closer:** “Confirmed order can land in Distribuidora’s inbox next — same pipeline as today’s demo.”

---

### Props for the 1-minute run

| Item | Demo value |
|---|---|
| Pain prop | “Call / website” vs agent (verbal or quick visual) |
| Suppliers | A (usual / phone), B (cheaper web), C (spot deal) |
| Cart | 3 lines only |
| Approvals | 2 approve · 1 keep |
| Savings | One clear $ + “0 calls” |

### What judges should feel

1. The pain is **calls + websites** to get prices, then ordering by hand
2. Gemini **checks prices and helps place the order** in the same flow
3. A second pass happens **before submit**
4. Better prices are **recommendations** — the manager stays the buyer
