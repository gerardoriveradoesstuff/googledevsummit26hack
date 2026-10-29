package com.distribuidora.pedidos.appfunctions

import androidx.appfunctions.AppFunctionSerializable

/** One past or newly placed order of the restaurant. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class OrderRecord(
    /** Confirmation number of the order, for example "ORD-25911". */
    val confirmationNumber: String,
    /** Order date in ISO format (YYYY-MM-DD). */
    val orderDate: String,
    /** Human-readable order date with relative age, for example "Thu, Sep 3, 2026 (about 2 months ago)". */
    val orderDateText: String,
    /** Stable id of the distributor that fulfilled the order. */
    val distributorId: String,
    /** Display name of the distributor that fulfilled the order. */
    val distributorName: String,
    /** Product name as shown to the user. */
    val productName: String,
    /** Ordered quantity in pounds. */
    val quantityLbs: Double,
    /** Total price paid in US dollars. */
    val totalPrice: Double,
    /** Effective price per pound in US dollars. */
    val pricePerLb: Double,
    /** Status such as "Delivered" or "Confirmed - delivery scheduled". */
    val status: String,
    /** One-line human-readable summary of this order that can be read to the user as-is. */
    val summary: String,
)

/** Result of getOrderHistory. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class OrderHistoryResult(
    /** Name of the restaurant whose history this is. */
    val restaurantName: String,
    /** Number of orders returned. */
    val orderCount: Int,
    /** Human-readable overview, including the most recent price paid for the product. */
    val summary: String,
    /** Orders, newest first. */
    val orders: List<OrderRecord>,
)

/** Result of checkPriceChange: current price vs. the last price paid to the current distributor. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class PriceChangeResult(
    /** Product name as shown to the user. */
    val productName: String,
    /** Quantity in pounds that the totals below are computed for. */
    val quantityLbs: Double,
    /** Stable id of the restaurant's current (default) distributor. */
    val distributorId: String,
    /** Display name of the restaurant's current (default) distributor. */
    val distributorName: String,
    /** Date of the last order of this product from the current distributor (YYYY-MM-DD), or empty if never ordered. */
    val lastOrderDate: String,
    /** Price per pound paid on the last order, in US dollars (0 if never ordered). */
    val lastPricePerLb: Double,
    /** What the requested quantity would have cost at the last price, in US dollars. */
    val lastTotalForQuantity: Double,
    /** Current price per pound at the current distributor, in US dollars. */
    val currentPricePerLb: Double,
    /** Current total for the requested quantity at the current distributor, in US dollars. */
    val currentTotal: Double,
    /** Dollar difference for the requested quantity (positive means more expensive now). */
    val changeAmount: Double,
    /** Percentage change vs. the last price (positive means more expensive now). */
    val changePercent: Double,
    /** True when the price rose by 10% or more; the agent must tell the user before ordering. */
    val flagged: Boolean,
    /** Human-readable explanation to read to the user, including the % and $ change. */
    val message: String,
)

/** One distributor option returned by compareDistributors. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class DistributorOption(
    /** Stable distributor id; pass this to placeOrder. */
    val distributorId: String,
    /** Display name of the distributor. */
    val distributorName: String,
    /** True if this is the restaurant's current (default) distributor. */
    val isCurrentDistributor: Boolean,
    /** Relationship with the restaurant, for example "New distributor, never ordered from". */
    val relationship: String,
    /** True if the distributor's product is certified organic. */
    val organicCertified: Boolean,
    /** Price per pound in US dollars. */
    val pricePerLb: Double,
    /** Price per 20 lb case in US dollars (how distributors quote it). */
    val pricePer20Lbs: Double,
    /** Total for the requested quantity in US dollars. */
    val totalPrice: Double,
    /** Average review rating out of 5 (0 when there are no reviews). */
    val rating: Double,
    /** Number of reviews (0 means no reviews yet). */
    val reviewCount: Int,
    /** Human-readable rating, for example "3.4/5 (87 reviews)" or "No reviews yet". */
    val ratingText: String,
    /** Short summary of what reviewers say. */
    val reviewSummary: String,
    /** Earliest delivery date in ISO format (YYYY-MM-DD). */
    val deliveryDate: String,
    /** Human-readable earliest delivery date, for example "Fri, Oct 30, 2026 (tomorrow)". */
    val deliveryDateText: String,
    /** Distance from the restaurant in miles. */
    val distanceMiles: Double,
    /** Savings vs. the current distributor for the requested quantity in US dollars (negative means it costs more). */
    val savingsVsCurrent: Double,
    /** Savings vs. the current distributor as a percentage of the current total. */
    val savingsPercentVsCurrent: Double,
    /** Short tag such as "CHEAPEST", "CHEAPER - ESTABLISHED", or "CURRENT DISTRIBUTOR". */
    val recommendation: String,
    /** One-line human-readable summary of this option to read to the user. */
    val summary: String,
)

/** Result of compareDistributors. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class DistributorComparisonResult(
    /** Product name as shown to the user. */
    val productName: String,
    /** Quantity in pounds that totals are computed for. */
    val quantityLbs: Double,
    /** Requested latest delivery date (YYYY-MM-DD) used as a filter. */
    val deliverBy: String,
    /** Total at the current distributor for the requested quantity in US dollars. */
    val currentDistributorTotal: Double,
    /** Options that can deliver by the requested date, cheapest first. */
    val options: List<DistributorOption>,
    /** Human-readable comparison and recommendation, ready to read to the user. Always also offer the current distributor. */
    val recommendationSummary: String,
)

/** Confirmation returned by placeOrder. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class OrderConfirmation(
    /** Confirmation number of the new order, for example "ORD-26123". */
    val confirmationNumber: String,
    /** Stable id of the distributor the order was placed with. */
    val distributorId: String,
    /** Display name of the distributor the order was placed with. */
    val distributorName: String,
    /** Product name as shown to the user. */
    val productName: String,
    /** Ordered quantity in pounds. */
    val quantityLbs: Double,
    /** Total price in US dollars. */
    val totalPrice: Double,
    /** Scheduled delivery date in ISO format (YYYY-MM-DD). */
    val deliveryDate: String,
    /** Order status, for example "Confirmed - delivery scheduled". */
    val status: String,
    /** Savings vs. ordering the same quantity from the current distributor, in US dollars (0 if it is the current distributor). */
    val savingsVsCurrent: Double,
    /** Human-readable confirmation message to read to the user. */
    val message: String,
)

/** The restaurant's current (default) distributor. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class CurrentDistributorResult(
    /** Name of the restaurant. */
    val restaurantName: String,
    /** Stable distributor id. */
    val distributorId: String,
    /** Display name of the distributor. */
    val distributorName: String,
    /** Relationship with the restaurant. */
    val relationship: String,
    /** Human-readable rating, for example "3.4/5 (87 reviews)". */
    val ratingText: String,
    /** Short summary of what reviewers say. */
    val reviewSummary: String,
    /** Number of past orders the restaurant placed with this distributor. */
    val pastOrderCount: Int,
    /** Distributor phone number. */
    val phone: String,
    /** Human-readable summary to read to the user. */
    val summary: String,
)
