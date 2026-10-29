package com.distribuidora.pedidos.appfunctions

import androidx.annotation.RequiresApi
import androidx.appfunctions.AppFunctionDeclaration
import androidx.appfunctions.AppFunctionElementNotFoundException
import androidx.appfunctions.AppFunctionInvalidArgumentException
import androidx.appfunctions.AppFunctionService
import androidx.appfunctions.AppFunctionServiceEntryPoint
import com.distribuidora.pedidos.appfunctions.OrderlyMockData.Distributor
import com.distribuidora.pedidos.appfunctions.OrderlyMockData.PastOrder
import com.distribuidora.pedidos.appfunctions.OrderlyMockData.Product
import com.distribuidora.pedidos.appfunctions.OrderlyMockData.money
import com.distribuidora.pedidos.appfunctions.OrderlyMockData.lbs
import com.distribuidora.pedidos.appfunctions.OrderlyMockData.pct
import com.distribuidora.pedidos.appfunctions.OrderlyMockData.round2
import java.time.LocalDate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Orderly AppFunctions: lets an agent (e.g. Gemini) help the restaurant
 * Araujos Mexican Grill reorder supplies, catch distributor price hikes and
 * compare nearby distributors before ordering. Runs on in-app mock data
 * ([OrderlyMockData]); no backend is needed.
 *
 * KSP generates the concrete `OrderlyAppFunctionService` (registered in
 * AndroidManifest.xml) and `assets/orderly_app_function_service.xml`.
 */
@RequiresApi(36)
@AppFunctionServiceEntryPoint(
    serviceName = "OrderlyAppFunctionService",
    appFunctionXmlFileName = "orderly_app_function_service",
)
abstract class BaseOrderlyAppFunctionService : AppFunctionService() {

    /**
     * Get the restaurant's past distributor orders (newest first), including orders placed via placeOrder.
     * Use this to answer "what did we pay last time?" or "show my recent orders", and to confirm a placed order shows up.
     * Typical workflow for a reorder: getOrderHistory -> checkPriceChange -> compareDistributors -> (user confirms) -> placeOrder.
     *
     * @param product Optional product filter such as "organic chicken" or "chicken". Leave empty to return every order.
     * @return An [OrderHistoryResult] with a readable summary and the list of orders.
     * @throws AppFunctionElementNotFoundException If the product is unknown. If thrown, ask the user which product they mean.
     */
    @AppFunctionDeclaration(isDescribedByKDoc = true, isEnabled = true)
    suspend fun getOrderHistory(product: String? = null): OrderHistoryResult =
        withContext(Dispatchers.IO) {
            val p = if (product.isNullOrBlank()) null else resolveProduct(product)
            val orders = OrderlyMockData.allOrders(this@BaseOrderlyAppFunctionService)
                .filter { p == null || it.productId == p.id }
            val records = orders.map { it.toRecord() }
            val last = orders.firstOrNull()
            val summary = when {
                last == null -> "No orders found for ${p?.name ?: "this restaurant"}."
                else -> "${orders.size} order(s) for ${OrderlyMockData.RESTAURANT_NAME}" +
                    (p?.let { " of ${it.name}" } ?: "") + ". Most recent: " + records.first().summary
            }
            OrderHistoryResult(OrderlyMockData.RESTAURANT_NAME, records.size, summary, records)
        }

    /**
     * Check whether the restaurant's current distributor has raised the price of a product since the last order.
     * Required workflow: call this BEFORE placeOrder for any reorder. If the result is flagged, tell the user the
     * price rose (state both the % and the $ difference) and then call compareDistributors to look for cheaper options.
     *
     * @param product Product to check, for example "organic chicken". "Meat" is interpreted as organic chicken (the restaurant's usual meat order).
     * @param quantityLbs Quantity in pounds the user wants to order, for example 20 or 30. Prices scale linearly.
     * @return A [PriceChangeResult] with last vs current price, percentage and dollar change, and a flagged boolean.
     * @throws AppFunctionInvalidArgumentException If quantityLbs is not positive. If thrown, ask the user how many pounds they need.
     * @throws AppFunctionElementNotFoundException If the product is unknown. If thrown, ask the user which product they mean.
     */
    @AppFunctionDeclaration(isDescribedByKDoc = true, isEnabled = true)
    suspend fun checkPriceChange(product: String, quantityLbs: Double): PriceChangeResult =
        withContext(Dispatchers.IO) {
            val p = resolveProduct(product)
            validateQuantity(quantityLbs)
            val current = OrderlyMockData.currentDistributor()
            val nowPerLb = OrderlyMockData.pricePerLb(current, p.id)
                ?: throw AppFunctionElementNotFoundException("${current.name} does not sell ${p.name}.")
            val last = OrderlyMockData.allOrders(this@BaseOrderlyAppFunctionService)
                .firstOrNull { it.productId == p.id && it.distributorId == current.id }
            val currentTotal = round2(nowPerLb * quantityLbs)
            if (last == null) {
                return@withContext PriceChangeResult(
                    p.name, quantityLbs, current.id, current.name, "", 0.0, 0.0, nowPerLb, currentTotal,
                    0.0, 0.0, false,
                    "No previous order of ${p.name} from ${current.name}; current price is ${money(currentTotal)} for ${lbs(quantityLbs)}.",
                )
            }
            val lastTotal = round2(last.pricePerLb * quantityLbs)
            val diff = round2(currentTotal - lastTotal)
            val percent = round2((nowPerLb - last.pricePerLb) / last.pricePerLb * 100.0)
            val flagged = percent >= OrderlyMockData.FLAG_THRESHOLD_PERCENT
            val when_ = "${OrderlyMockData.prettyDate(last.date)} (${OrderlyMockData.relativeAge(last.date)})"
            val message = if (flagged) {
                "Heads up: ${current.name} raised the price of ${p.name} by ${pct(percent)}. " +
                    "${lbs(quantityLbs)} now costs ${money(currentTotal)} vs ${money(lastTotal)} at your last order on $when_ " +
                    "(+${money(diff)}; ${money(last.pricePerLb)}/lb -> ${money(nowPerLb)}/lb). " +
                    "Recommend comparing distributors (compareDistributors) before ordering."
            } else {
                "${current.name}'s price for ${p.name} changed ${if (percent >= 0) "+" else "-"}${pct(percent)} since $when_: " +
                    "${money(currentTotal)} for ${lbs(quantityLbs)} (was ${money(lastTotal)}). No significant increase."
            }
            PriceChangeResult(
                p.name, quantityLbs, current.id, current.name, last.date.toString(), round2(last.pricePerLb),
                lastTotal, nowPerLb, currentTotal, diff, percent, flagged, message,
            )
        }

    /**
     * Compare nearby distributors that sell the product and can deliver by a date, cheapest first, with price,
     * total, reviews, relationship and savings vs the current distributor.
     * Required workflow: call after checkPriceChange (especially when flagged). Present the cheaper options AND
     * the current distributor, mention when a cheaper option is new or has no reviews, and let the user choose.
     * Never call placeOrder until the user explicitly picks a distributor.
     *
     * @param product Product to compare, for example "organic chicken".
     * @param quantityLbs Quantity in pounds, for example 20 or 30. Totals scale linearly from the per-20-lb price.
     * @param includeNonOrganic Set true only if the user says organic is not required. Default false = organic-certified distributors only.
     * @param deliverBy Optional latest acceptable delivery date as YYYY-MM-DD or "tomorrow". Defaults to the current distributor's next delivery date (tomorrow).
     * @return A [DistributorComparisonResult] with options sorted cheapest first and a readable recommendation.
     * @throws AppFunctionInvalidArgumentException If quantityLbs is not positive or deliverBy cannot be parsed.
     * @throws AppFunctionElementNotFoundException If the product is unknown or nobody can deliver by that date.
     */
    @AppFunctionDeclaration(isDescribedByKDoc = true, isEnabled = true)
    suspend fun compareDistributors(
        product: String,
        quantityLbs: Double,
        includeNonOrganic: Boolean = false,
        deliverBy: String? = null,
    ): DistributorComparisonResult = withContext(Dispatchers.IO) {
        val p = resolveProduct(product)
        validateQuantity(quantityLbs)
        val current = OrderlyMockData.currentDistributor()
        val by = if (deliverBy.isNullOrBlank()) {
            OrderlyMockData.earliestDelivery(current)
        } else {
            OrderlyMockData.parseDate(deliverBy)
                ?: throw AppFunctionInvalidArgumentException("deliverBy must be YYYY-MM-DD or \"tomorrow\", got \"$deliverBy\".")
        }
        val currentTotal = round2((OrderlyMockData.pricePerLb(current, p.id) ?: 0.0) * quantityLbs)
        val eligible = OrderlyMockData.distributors.filter { d ->
            OrderlyMockData.pricePerLb(d, p.id) != null &&
                (includeNonOrganic || d.organicCertified) &&
                !OrderlyMockData.earliestDelivery(d).isAfter(by)
        }
        if (eligible.isEmpty()) {
            throw AppFunctionElementNotFoundException(
                "No distributor can deliver ${p.name} by ${OrderlyMockData.prettyDate(by)}. Ask the user for a later date.",
            )
        }
        val sorted = eligible.sortedBy { OrderlyMockData.pricePerLb(it, p.id) }
        val cheapestId = sorted.first().id
        val options = sorted.map { d -> d.toOption(p, quantityLbs, currentTotal, cheapestId) }
        val excludedNonOrganic = if (includeNonOrganic) 0 else
            OrderlyMockData.distributors.count { !it.organicCertified && OrderlyMockData.pricePerLb(it, p.id) != null }

        val cheaper = options.filter { !it.isCurrentDistributor && it.savingsVsCurrent > 0 }
        val cur = options.firstOrNull { it.isCurrentDistributor }
        val sb = StringBuilder()
        sb.append("${options.size} distributor(s) can deliver ${lbs(quantityLbs)} of ${p.name} by ${OrderlyMockData.prettyDate(by)}. ")
        if (cheaper.isNotEmpty()) {
            val best = cheaper.first()
            sb.append("Cheapest: ${best.distributorName} at ${money(best.totalPrice)} (save ${money(best.savingsVsCurrent)}, ${pct(best.savingsPercentVsCurrent)} vs your current distributor)")
            if (best.reviewCount == 0) sb.append(" — new distributor with no reviews yet, so it is a bit of a risk")
            sb.append(". ")
            cheaper.drop(1).firstOrNull()?.let {
                sb.append("Also cheaper: ${it.distributorName} at ${money(it.totalPrice)} (save ${money(it.savingsVsCurrent)}; ${it.ratingText}; ${it.relationship.lowercase()}). ")
            }
        }
        if (cur != null) {
            sb.append("Or stay with your current distributor ${cur.distributorName} at ${money(cur.totalPrice)} (${cur.ratingText}, good relationship). ")
        }
        if (excludedNonOrganic > 0) sb.append("$excludedNonOrganic non-organic distributor(s) excluded because the order must be organic. ")
        sb.append("Ask the user which distributor to use before calling placeOrder.")

        DistributorComparisonResult(p.name, quantityLbs, by.toString(), currentTotal, options, sb.toString().trim())
    }

    /**
     * Place an order with a distributor. This creates a real order for the restaurant.
     * Required workflow: only call AFTER checkPriceChange and compareDistributors, AND after the user has explicitly
     * confirmed the distributor, quantity and total. Never call it on your own initiative.
     * The order then appears in getOrderHistory.
     *
     * @param distributorId Distributor id from compareDistributors, for example "fresh-field", "bay-prime" or "rancho-valle".
     * @param product Product to order, for example "organic chicken".
     * @param quantityLbs Quantity in pounds, for example 20.
     * @param deliveryDate Optional delivery date as YYYY-MM-DD or "tomorrow". Defaults to the distributor's earliest delivery date.
     * @return An [OrderConfirmation] with the confirmation number, total and delivery date.
     * @throws AppFunctionElementNotFoundException If the distributor or product is unknown. If thrown, call compareDistributors to get valid ids.
     * @throws AppFunctionInvalidArgumentException If the quantity is not positive or the distributor cannot deliver on that date.
     */
    @AppFunctionDeclaration(isDescribedByKDoc = true, isEnabled = true)
    suspend fun placeOrder(
        distributorId: String,
        product: String,
        quantityLbs: Double,
        deliveryDate: String? = null,
    ): OrderConfirmation = withContext(Dispatchers.IO) {
        val d = OrderlyMockData.findDistributor(distributorId)
            ?: throw AppFunctionElementNotFoundException(
                "Unknown distributorId \"$distributorId\". Valid ids: " + OrderlyMockData.distributors.joinToString { it.id } + ".",
            )
        val p = resolveProduct(product)
        validateQuantity(quantityLbs)
        val perLb = OrderlyMockData.pricePerLb(d, p.id)
            ?: throw AppFunctionElementNotFoundException("${d.name} does not sell ${p.name}.")
        val earliest = OrderlyMockData.earliestDelivery(d)
        val date = if (deliveryDate.isNullOrBlank()) earliest else OrderlyMockData.parseDate(deliveryDate)
            ?: throw AppFunctionInvalidArgumentException("deliveryDate must be YYYY-MM-DD or \"tomorrow\", got \"$deliveryDate\".")
        if (date.isBefore(earliest)) {
            throw AppFunctionInvalidArgumentException(
                "${d.name} can deliver ${OrderlyMockData.prettyDate(earliest)} at the earliest. Ask the user to pick that date or later.",
            )
        }
        val total = round2(perLb * quantityLbs)
        val current = OrderlyMockData.currentDistributor()
        val savings = if (d.id == current.id) 0.0 else
            round2((OrderlyMockData.pricePerLb(current, p.id) ?: perLb) * quantityLbs - total)
        val number = OrderlyMockData.nextConfirmationNumber()
        val status = "Confirmed - delivery scheduled"
        OrderlyMockData.addOrder(
            this@BaseOrderlyAppFunctionService,
            PastOrder(number, OrderlyMockData.today(), d.id, p.id, quantityLbs, total, status, true),
        )
        val msg = buildString {
            append("Order $number placed with ${d.name}: ${lbs(quantityLbs)} ${p.name} for ${money(total)}, ")
            append("delivering ${OrderlyMockData.prettyDate(date)}.")
            if (savings > 0) append(" You save ${money(savings)} vs ${current.name}.")
        }
        OrderConfirmation(number, d.id, d.name, p.name, quantityLbs, total, date.toString(), status, savings, msg)
    }

    /**
     * Get the restaurant's current (default) distributor, its reviews and relationship.
     * Use when the user asks "who do we usually order from?" or before switching distributors.
     *
     * @return A [CurrentDistributorResult] describing the default distributor.
     */
    @AppFunctionDeclaration(isDescribedByKDoc = true, isEnabled = true)
    suspend fun getCurrentDistributor(): CurrentDistributorResult = withContext(Dispatchers.IO) {
        val d = OrderlyMockData.currentDistributor()
        val count = OrderlyMockData.allOrders(this@BaseOrderlyAppFunctionService).count { it.distributorId == d.id }
        CurrentDistributorResult(
            OrderlyMockData.RESTAURANT_NAME, d.id, d.name, d.relationship, d.ratingText(), d.reviewSummary, count, d.phone,
            "${OrderlyMockData.RESTAURANT_NAME} usually orders from ${d.name} ($count past orders, ${d.ratingText()}).",
        )
    }

    // ---- helpers ----

    private fun resolveProduct(query: String): Product =
        OrderlyMockData.findProduct(query) ?: throw AppFunctionElementNotFoundException(
            "Unknown product \"$query\". Available: " + OrderlyMockData.products.joinToString { it.name } + ". Ask the user which product they mean.",
        )

    private fun validateQuantity(q: Double) {
        if (q.isNaN() || q <= 0.0 || q > 2000.0) {
            throw AppFunctionInvalidArgumentException("quantityLbs must be between 0 and 2000 lb, got $q. Ask the user how many pounds they need.")
        }
    }

    private fun Distributor.ratingText(): String =
        if (reviewCount == 0) "No reviews yet" else "${rating}/5 ($reviewCount reviews)"

    private fun PastOrder.toRecord(): OrderRecord {
        val d = OrderlyMockData.findDistributor(distributorId)
        val p = OrderlyMockData.products.firstOrNull { it.id == productId }
        val dateText = "${OrderlyMockData.prettyDate(date)} (${OrderlyMockData.relativeAge(date)})"
        val name = d?.name ?: distributorId
        return OrderRecord(
            confirmationNumber, date.toString(), dateText, distributorId, name, p?.name ?: productId,
            quantityLbs, round2(total), round2(pricePerLb), status,
            "$dateText: ${lbs(quantityLbs)} ${p?.name ?: productId} from $name for ${money(total)} " +
                "(${money(pricePerLb)}/lb, ${money(pricePerLb * OrderlyMockData.PRICE_UNIT_LBS)} per 20 lb) - $status.",
        )
    }

    private fun Distributor.toOption(p: Product, qty: Double, currentTotal: Double, cheapestId: String): DistributorOption {
        val perLb = OrderlyMockData.pricePerLb(this, p.id)!!
        val total = round2(perLb * qty)
        val isCurrent = id == OrderlyMockData.CURRENT_DISTRIBUTOR_ID
        val savings = round2(currentTotal - total)
        val savingsPct = if (currentTotal > 0) round2(savings / currentTotal * 100.0) else 0.0
        val delivery: LocalDate = OrderlyMockData.earliestDelivery(this)
        val deliveryText = "${OrderlyMockData.prettyDate(delivery)} (${OrderlyMockData.relativeAge(delivery)})"
        val tag = when {
            isCurrent -> "CURRENT DISTRIBUTOR"
            id == cheapestId && reviewCount == 0 -> "CHEAPEST - NEW, NO REVIEWS"
            id == cheapestId -> "CHEAPEST"
            savings > 0 -> "CHEAPER - ESTABLISHED"
            else -> "MORE EXPENSIVE"
        }
        val saveText = when {
            isCurrent -> "current distributor"
            savings > 0 -> "saves ${money(savings)} (${pct(savingsPct)})"
            else -> "costs ${money(-savings)} more"
        }
        return DistributorOption(
            id, name, isCurrent, relationship, organicCertified, round2(perLb), round2(perLb * OrderlyMockData.PRICE_UNIT_LBS),
            total, rating, reviewCount, ratingText(), reviewSummary, delivery.toString(), deliveryText, distanceMiles,
            savings, savingsPct, tag,
            "$name: ${money(total)} for ${lbs(qty)} (${money(perLb * OrderlyMockData.PRICE_UNIT_LBS)}/20 lb), $saveText; " +
                "${ratingText()}; delivers $deliveryText; ${if (organicCertified) "organic" else "NOT organic"}.",
        )
    }
}
