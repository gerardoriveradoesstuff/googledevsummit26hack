# Orderly AppFunctions (Scenario 1: price agent)

The Android app exposes 5 **Jetpack AppFunctions** that let an agent (Gemini, or the AppFunctions Testing Agent) help **Araujos Mexican Grill** reorder organic chicken. The agent catches the distributor's price hike and compares cheaper nearby distributors before ordering. Everything runs on **in-app mock data** (`OrderlyMockData`), so no backend is needed.

| Item | Value |
|---|---|
| Library | `androidx.appfunctions:appfunctions:1.0.0-beta01` + `ksp(androidx.appfunctions:appfunctions-compiler:1.0.0-beta01)` |
| KSP plugin | `com.google.devtools.ksp` 2.3.10 (same as the official ChatApp sample) |
| Device | **Android 16 (API 36)+**, e.g. a Pixel on Android 16. The app still installs on older devices (minSdk 26); the functions just aren't registered there |
| compileSdk / targetSdk | 37 (beta01 requires compileSdk ≥ 37) |
| Package | `com.distribuidora.pedidos` |
| Service (KSP-generated) | `com.distribuidora.pedidos.appfunctions.OrderlyAppFunctionService` |
| Function id prefix | `com.distribuidora.pedidos.appfunctions.BaseOrderlyAppFunctionService#` |
| Enabled by default | **Yes.** Every function has `@AppFunctionDeclaration(isDescribedByKDoc = true, isEnabled = true)`, and the generated `assets/orderly_app_function_service.xml` has `<enabledByDefault>true</enabledByDefault>` for all 5 |

## Code map

```
app/src/main/java/com/distribuidora/pedidos/appfunctions/
  BaseOrderlyAppFunctionService.kt  @AppFunctionServiceEntryPoint + the 5 @AppFunctionDeclaration functions (agent-centric KDoc)
  OrderlyModels.kt                  @AppFunctionSerializable result classes (inline KDoc on every property)
  OrderlyMockData.kt                ALL mock data: restaurant, product, 4 distributors, order history, placed-order store
app/src/main/res/xml/app_metadata.xml   App-level instructions for the LLM (workflow + constraints)
app/src/main/AndroidManifest.xml        <service> for the generated OrderlyAppFunctionService + app_metadata <property>
```

### Functions

| Function | Params | Returns |
|---|---|---|
| `getOrderHistory` | `product: String? = null` | `OrderHistoryResult` (summary + `orders[]`, newest first, including orders placed through `placeOrder`) |
| `checkPriceChange` | `product: String, quantityLbs: Double` | `PriceChangeResult`: last vs current price/lb and total, `changeAmount`, `changePercent`, **`flagged`** (≥ 10%), `message` |
| `compareDistributors` | `product: String, quantityLbs: Double, includeNonOrganic: Boolean = false, deliverBy: String? = null` | `DistributorComparisonResult`: `options[]` cheapest first (price/lb, per 20 lb, total, rating/reviewCount/ratingText/reviewSummary, relationship, deliveryDate, savingsVsCurrent, recommendation tag, summary) + `recommendationSummary` |
| `placeOrder` | `distributorId: String, product: String, quantityLbs: Double, deliveryDate: String? = null` | `OrderConfirmation` (confirmationNumber, total, deliveryDate, savingsVsCurrent, message). The order is stored in memory + SharedPreferences, so `getOrderHistory` shows it |
| `getCurrentDistributor` | — | `CurrentDistributorResult` |

Dates are `YYYY-MM-DD` or `"tomorrow"`, in America/Los_Angeles. `product` accepts "organic chicken", "chicken" and "pollo", and "meat"/"carne" resolve to the restaurant's usual meat order (organic chicken). Errors use `AppFunctionInvalidArgumentException` / `AppFunctionElementNotFoundException`, with messages that tell the agent what to do next.

### Scenario 1 mock data (prices per 20 lb, scaled linearly)

| Distributor (id) | Price / 20 lb | Reviews | Relationship | Delivers |
|---|---|---|---|---|
| Rancho Valle Meats (`rancho-valle`) | **$300** (last order ~2 months ago: **$210**) | 3.4/5 (87), mixed | **Current default**, good relationship, 5 past orders | tomorrow |
| Fresh Field Organics (`fresh-field`) | **$150** | No reviews yet | New | tomorrow |
| Bay Prime Poultry (`bay-prime`) | **$275** | 3.6/5 (142), mixed | Established, never used | tomorrow |
| Valley Wholesale Foods (`valley-wholesale`) | $120 | 4.1/5 | **Not organic**, so it is excluded unless `includeNonOrganic=true` | tomorrow |

20 lb: $210 → $300 = **+42.9% / +$90**. Fresh Field saves $150 (50%) and Bay Prime saves $25. For 30 lb: $315 → $450 (+$135).

## Build & install

```bash
cd android
./gradlew assembleDebug            # → app/build/outputs/apk/debug/Distribuidora.apk (also copied to ../apk/)
adb install -r app/build/outputs/apk/debug/Distribuidora.apk
```

Or press Run in Android Studio. Open the app once after installing; it isn't strictly required, but it makes sure the package isn't in the "stopped" state. Then check that the functions are registered:

```bash
adb shell cmd app_function help                      # "Can't find service: app_function" => device doesn't support AppFunctions
adb shell cmd app_function list-app-functions | grep -i orderly
```

## Test with adb

```bash
PKG=com.distribuidora.pedidos
FN=com.distribuidora.pedidos.appfunctions.BaseOrderlyAppFunctionService

adb shell cmd app_function execute-app-function --package $PKG --function "$FN#getCurrentDistributor" --parameters '{}'
adb shell cmd app_function execute-app-function --package $PKG --function "$FN#getOrderHistory" --parameters '{"product": "organic chicken"}'
adb shell cmd app_function execute-app-function --package $PKG --function "$FN#checkPriceChange" --parameters '{"product": "organic chicken", "quantityLbs": 20}'
adb shell cmd app_function execute-app-function --package $PKG --function "$FN#compareDistributors" --parameters '{"product": "organic chicken", "quantityLbs": 20, "deliverBy": "tomorrow"}'
adb shell cmd app_function execute-app-function --package $PKG --function "$FN#placeOrder" --parameters '{"distributorId": "fresh-field", "product": "organic chicken", "quantityLbs": 20, "deliveryDate": "tomorrow"}'
adb shell cmd app_function execute-app-function --package $PKG --function "$FN#getOrderHistory" --parameters '{}'   # new order on top
```

- Add `--brief-yaml` for shorter output.
- Always wrap the JSON in single quotes.
- If a function shows as disabled, run `adb shell cmd app_function set-enabled --package $PKG --function "$FN#placeOrder" --state default`, or `--state enable`.
- To reset placed demo orders: `adb shell pm clear com.distribuidora.pedidos`. This wipes the app's data.

## Test with the AppFunctions Testing Agent (github.com/android/appfunctions → `agent/`)

```bash
git clone https://github.com/android/appfunctions && cd appfunctions/agent
./run_privileged.sh --build                                   # standard flavor: manual function debugging
./run_privileged.sh --build --flavor retail --api-key $GEMINI_API_KEY   # LLM agent mode
```

- **Launch the agent with `run_privileged.sh`, not from the launcher icon.** The script starts it with shell identity (`ShellIdentityInstrumentation`). Reading other apps' function enabled-states (`getAppFunctionStates`) needs that privilege.
- The red **"Unable to determine enabled state"** card in the photo is the agent's `AppFunctionErrorItem`, which appears when that state lookup fails. Most likely the agent was opened normally instead of through `run_privileged.sh`, or the target app's functions weren't indexed yet. Our functions are enabled by default (`isEnabled = true`), so if you still see it, relaunch with the script and re-open the list.
- In the agent, pick **Distribuidora** (`com.distribuidora.pedidos`). All 5 functions should be listed as enabled. Run them with the JSON params above, or use the LLM tab with the prompts below.

## Demo script (Gemini / agent prompts for Scenario 1)

1. **"Order 20 lbs of organic chicken for Araujos."** The agent calls `checkPriceChange` and should say: *"Heads up: Rancho Valle raised organic chicken 42.9%. 20 lb is now $300 vs $210 at your last order about 2 months ago (+$90)."* It should suggest comparing before ordering.
2. **"Yes, compare. It has to be organic and arrive tomorrow. I don't mind a new distributor if it's cheaper."** The agent calls `compareDistributors` and should answer: *"Fresh Field Organics: $150 (save $150, 50%), new with no reviews. Bay Prime Poultry: $275 (save $25), established, 3.6★. Or stay with Rancho Valle at $300."*
3. **"Go with Fresh Field."** The agent confirms the details ("20 lb from Fresh Field, $150, delivered tomorrow?"). After **"Yes"**, it calls `placeOrder`, which returns `ORD-xxxxx`.
4. **"Show my order history."** The new Fresh Field order is on top, and the older Rancho Valle orders are at ~$210 / 20 lb.
5. Variant: **"Also get 30 lbs of meat."** The price check shows $315 → $450 (+$135), and the comparison shows Fresh Field at $225.

## Gemini app access (real Gemini, not the test agent)

The Gemini app calling third-party AppFunctions is in **private preview / early access**. It only works when **both** of these are true:

1. The Pixel is signed in to a **Google test account that Google staff granted** access to (ask the AppFunctions / hackathon staff).
2. The app is registered as a **connected app in Play Console** for that program. For this hackathon, that's the staff-provided Play Console setup, with the package `com.distribuidora.pedidos` and our signing key.

Without that, use the **Testing Agent** above, or the **MCP fallback**. `mcp/` exposes the same 5 tools (`get_order_history`, `check_price_change`, `compare_distributors`, `place_order`, `get_current_distributor`) on the same mock data, so Scenario 1 also runs in Gemini Developer Mode. See `mcp/README.md`.
