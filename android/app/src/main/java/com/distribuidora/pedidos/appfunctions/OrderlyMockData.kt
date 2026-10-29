package com.distribuidora.pedidos.appfunctions

import android.content.Context
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt
import org.json.JSONArray
import org.json.JSONObject

/**
 * Single home for ALL Scenario 1 mock data used by the Orderly AppFunctions
 * (no backend required): the restaurant, the product catalog, nearby
 * distributors, the restaurant's order history, and the in-memory store for
 * orders placed through [com.distribuidora.pedidos.appfunctions.BaseOrderlyAppFunctionService.placeOrder].
 *
 * Prices are quoted per [PRICE_UNIT_LBS] lb and scale linearly to any quantity.
 * Dates are relative to "today" in America/Los_Angeles so the demo always
 * looks fresh. Placed orders are kept in memory and mirrored to
 * SharedPreferences so they survive the AppFunction service being unbound.
 */
object OrderlyMockData {

    val ZONE: ZoneId = ZoneId.of("America/Los_Angeles")
    const val PRICE_UNIT_LBS = 20.0
    /** A price increase at or above this percentage is flagged to the user. */
    const val FLAG_THRESHOLD_PERCENT = 10.0

    const val RESTAURANT_NAME = "Araujos Mexican Grill"
    const val CURRENT_DISTRIBUTOR_ID = "rancho-valle"

    data class Product(val id: String, val name: String, val aliases: List<String>)

    data class Distributor(
        val id: String,
        val name: String,
        /** product id -> price per [PRICE_UNIT_LBS] lb */
        val pricePer20Lbs: Map<String, Double>,
        val organicCertified: Boolean,
        val rating: Double,
        val reviewCount: Int,
        val reviewSummary: String,
        val relationship: String,
        val distanceMiles: Double,
        val leadTimeDays: Long,
        val phone: String,
    )

    data class PastOrder(
        val confirmationNumber: String,
        val date: LocalDate,
        val distributorId: String,
        val productId: String,
        val quantityLbs: Double,
        val total: Double,
        val status: String,
        val placedViaAgent: Boolean,
    ) {
        val pricePerLb: Double get() = total / quantityLbs
    }

    val ORGANIC_CHICKEN = Product(
        id = "organic-chicken",
        name = "Organic chicken (boneless thighs)",
        aliases = listOf("chicken", "pollo", "organic chicken", "chicken thighs", "meat", "carne", "protein"),
    )

    val products: List<Product> = listOf(ORGANIC_CHICKEN)

    val distributors: List<Distributor> = listOf(
        Distributor(
            id = "rancho-valle",
            name = "Rancho Valle Meats",
            pricePer20Lbs = mapOf(ORGANIC_CHICKEN.id to 300.0),
            organicCertified = true,
            rating = 3.4,
            reviewCount = 87,
            reviewSummary = "Mixed: reliable delivery windows and friendly reps, but several reviewers mention recent price hikes and inconsistent trim.",
            relationship = "Current default distributor for Araujos Mexican Grill (good relationship, ordering since 2024)",
            distanceMiles = 6.2,
            leadTimeDays = 1,
            phone = "(408) 555-0141",
        ),
        Distributor(
            id = "fresh-field",
            name = "Fresh Field Organics",
            pricePer20Lbs = mapOf(ORGANIC_CHICKEN.id to 150.0),
            organicCertified = true,
            rating = 0.0,
            reviewCount = 0,
            reviewSummary = "No reviews yet: new USDA-organic certified distributor that opened this season.",
            relationship = "New distributor, never ordered from",
            distanceMiles = 9.8,
            leadTimeDays = 1,
            phone = "(408) 555-0187",
        ),
        Distributor(
            id = "bay-prime",
            name = "Bay Prime Poultry",
            pricePer20Lbs = mapOf(ORGANIC_CHICKEN.id to 275.0),
            organicCertified = true,
            rating = 3.6,
            reviewCount = 142,
            reviewSummary = "Mixed: established for 15+ years with consistent quality; some complaints about late deliveries and slow customer service.",
            relationship = "Established distributor, but this restaurant has never ordered from them",
            distanceMiles = 12.4,
            leadTimeDays = 1,
            phone = "(510) 555-0112",
        ),
        // Conventional (non-organic) option: excluded unless includeNonOrganic = true.
        Distributor(
            id = "valley-wholesale",
            name = "Valley Wholesale Foods",
            pricePer20Lbs = mapOf(ORGANIC_CHICKEN.id to 120.0),
            organicCertified = false,
            rating = 4.1,
            reviewCount = 310,
            reviewSummary = "Mostly positive: cheap and fast, but conventional (not organic) poultry only.",
            relationship = "Established distributor, never ordered from (NOT organic)",
            distanceMiles = 4.1,
            leadTimeDays = 1,
            phone = "(408) 555-0199",
        ),
    )

    fun today(): LocalDate = LocalDate.now(ZONE)

    /** Seeded history: last organic chicken order was ~2 months ago at $210 / 20 lb. */
    private fun seededHistory(): List<PastOrder> {
        val t = today()
        return listOf(
            PastOrder("ORD-24817", t.minusDays(119), "rancho-valle", ORGANIC_CHICKEN.id, 20.0, 200.0, "Delivered", false),
            PastOrder("ORD-25102", t.minusDays(98), "rancho-valle", ORGANIC_CHICKEN.id, 30.0, 307.5, "Delivered", false),
            PastOrder("ORD-25390", t.minusDays(84), "rancho-valle", ORGANIC_CHICKEN.id, 20.0, 205.0, "Delivered", false),
            PastOrder("ORD-25644", t.minusDays(70), "rancho-valle", ORGANIC_CHICKEN.id, 40.0, 420.0, "Delivered", false),
            PastOrder("ORD-25911", t.minusDays(58), "rancho-valle", ORGANIC_CHICKEN.id, 20.0, 210.0, "Delivered", false),
        )
    }

    // ---- Placed orders (in memory, mirrored to SharedPreferences) ----

    private const val PREFS = "orderly_appfunctions"
    private const val KEY_PLACED = "placed_orders"
    private val placed = mutableListOf<PastOrder>()
    private var loaded = false

    @Synchronized
    fun allOrders(context: Context): List<PastOrder> {
        ensureLoaded(context)
        return (seededHistory() + placed).sortedByDescending { it.date }
    }

    @Synchronized
    fun addOrder(context: Context, order: PastOrder) {
        ensureLoaded(context)
        placed += order
        val arr = JSONArray()
        placed.forEach {
            arr.put(
                JSONObject()
                    .put("n", it.confirmationNumber).put("d", it.date.toString())
                    .put("dist", it.distributorId).put("p", it.productId)
                    .put("q", it.quantityLbs).put("t", it.total).put("s", it.status),
            )
        }
        prefs(context).edit().putString(KEY_PLACED, arr.toString()).apply()
    }

    /** Clears orders placed through the agent (handy between demo runs). */
    @Synchronized
    fun resetPlacedOrders(context: Context) {
        placed.clear()
        loaded = true
        prefs(context).edit().remove(KEY_PLACED).apply()
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun ensureLoaded(context: Context) {
        if (loaded) return
        loaded = true
        val raw = prefs(context).getString(KEY_PLACED, null) ?: return
        runCatching {
            val arr = JSONArray(raw)
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                placed += PastOrder(
                    o.getString("n"), LocalDate.parse(o.getString("d")), o.getString("dist"),
                    o.getString("p"), o.getDouble("q"), o.getDouble("t"), o.getString("s"), true,
                )
            }
        }
    }

    // ---- Lookups & formatting helpers ----

    fun findProduct(query: String): Product? {
        val q = query.trim().lowercase(Locale.US)
        if (q.isEmpty()) return null
        return products.firstOrNull { p ->
            p.id == q || p.name.lowercase(Locale.US) == q ||
                p.aliases.any { a -> q == a || q.contains(a) || a.contains(q) }
        }
    }

    fun findDistributor(idOrName: String): Distributor? {
        val q = idOrName.trim().lowercase(Locale.US)
        return distributors.firstOrNull { it.id == q } ?: distributors.firstOrNull {
            it.name.lowercase(Locale.US).contains(q) || q.contains(it.name.lowercase(Locale.US))
        }
    }

    fun currentDistributor(): Distributor = distributors.first { it.id == CURRENT_DISTRIBUTOR_ID }

    fun pricePerLb(d: Distributor, productId: String): Double? =
        d.pricePer20Lbs[productId]?.let { it / PRICE_UNIT_LBS }

    fun earliestDelivery(d: Distributor): LocalDate = today().plusDays(d.leadTimeDays)

    /** Accepts YYYY-MM-DD, "today", "tomorrow" (also "hoy", "mañana"). */
    fun parseDate(raw: String?): LocalDate? {
        val s = raw?.trim()?.lowercase(Locale.US).orEmpty()
        if (s.isEmpty()) return null
        return when (s) {
            "today", "hoy" -> today()
            "tomorrow", "mañana", "manana" -> today().plusDays(1)
            else -> runCatching { LocalDate.parse(s) }.getOrNull()
        }
    }

    fun money(v: Double): String = "$" + String.format(Locale.US, "%,.2f", v)
    fun lbs(v: Double): String = if (v == v.roundToInt().toDouble()) "${v.roundToInt()} lb" else String.format(Locale.US, "%.1f lb", v)
    fun pct(v: Double): String = String.format(Locale.US, "%.1f%%", abs(v))
    fun round2(v: Double): Double = Math.round(v * 100.0) / 100.0

    fun prettyDate(d: LocalDate): String =
        d.format(DateTimeFormatter.ofPattern("EEE, MMM d, yyyy", Locale.US))

    fun relativeAge(d: LocalDate): String {
        val days = ChronoUnit.DAYS.between(d, today())
        return when {
            days == -1L -> "tomorrow"
            days < 0 -> "in ${-days} days"
            days == 0L -> "today"
            days == 1L -> "yesterday"
            days < 14 -> "$days days ago"
            days < 45 -> "about ${days / 7} weeks ago"
            else -> "about ${(days / 30.0).roundToInt()} months ago"
        }
    }

    fun nextConfirmationNumber(): String = "ORD-" + (26000 + (System.currentTimeMillis() / 1000 % 9000)).toString()
}
