package com.distribuidora.pedidos.domain

fun copiasLabel(cantidad: Double): Int {
    if (cantidad <= 0.0) return 0
    return kotlin.math.ceil(cantidad - 1e-9).toInt()
}
