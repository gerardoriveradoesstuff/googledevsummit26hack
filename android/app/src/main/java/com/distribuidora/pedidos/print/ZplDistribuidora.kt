package com.distribuidora.pedidos.print

import com.distribuidora.pedidos.data.LineaPedido
import com.distribuidora.pedidos.data.Pedido
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private const val PW = 812
private const val LL = 508

/** Loguito 40×40: hoja clara sobre el cuadro verde, en hex de ^GFA. */
private const val LOGO =
    "00FFFFFF0007FFFFFFE01FFFFFFFF83FFFFFFFFC3FFFFFFFFC7FFFFFFFFE7FFFFFFFFE7FFFFFFFFE" +
        "FFFFFFFFFFFFFFE7FFFFFFFFE7FFFFFFFFE7FFFFFFFFC3FFFFFFFFC3FFFFFFFFC3FFFFFFFFC3FFFFFFFF" +
        "C3FFFFFFFFC3FFFFFFFFE7FFFFFFFFE7FFFFFFFFE7FFFFFFFFFFFFFFFFE00007FFFF800001FFFF000000" +
        "FFFF800001FFFFE00007FFFFF8001FFFFFFE007FFFFFFF00FFFFFFFF81FFFFFFFFC3FFFF7FFFC3FFFE7F" +
        "FFE7FFFE7FFFFFFFFE3FFFFFFFFC3FFFFFFFFC1FFFFFFFF807FFFFFFE000FFFFFF00"

fun paginasLabel(pedido: Pedido): List<String> {
    val impresa = LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
    return pedido.lineas.flatMapIndexed { indice, linea ->
        val total = linea.copias.coerceAtLeast(0)
        (1..total).map { n -> pagina(pedido, linea, indice + 1, n, total, impresa) }
    }
}

private fun pagina(pedido: Pedido, linea: LineaPedido, lineaN: Int, n: Int, total: Int, impresa: String): String {
    val codigo = "${pedido.numero}-$lineaN-$n"
    val modulo = 2
    val ancho = (11 * (codigo.length + 3) + 2) * modulo
    val x = (PW - 24 - ancho).coerceAtLeast(24)
    val alto = 64
    val baseDireccion = 304 + 24
    val yBarras = baseDireccion - alto
    val yNumero = yBarras - 22
    val anchoDireccion = (x - 36).coerceAtLeast(220)
    return buildString {
        appendLine("^XA")
        appendLine("^CI28")
        appendLine("^PW$PW")
        appendLine("^LL$LL")
        appendLine("^FO24,16^GFA,200,200,5,$LOGO^FS")
        appendLine("^FO72,22^A0N,26,26^FB420,1,0,L,0^FD${zpl("Distribuidora de Productos")}^FS")
        appendLine("^FO500,22^A0N,26,26^FB288,1,0,R,0^FD${zpl("Pedido ${pedido.numero}")}^FS")
        appendLine("^FO460,72^A0N,26,26^FD${zpl(impresa)}^FS")
        appendLine("^FO24,130^A0N,40,40^FD${zpl(linea.nombre)}^FS")
        appendLine("^FO24,186^A0N,48,48^FD${zpl("$n de $total")}^FS")
        appendLine("^FO24,260^A0N,28,28^FD${zpl(pedido.cliente)}^FS")
        appendLine("^FO24,304^A0N,24,24^FB${anchoDireccion},1,0,L,0^FD${zpl(pedido.direccion)}^FS")
        appendLine("^FO${x},${yNumero}^A0N,20,20^FB${ancho},1,0,R,0^FD${zpl(codigo)}^FS")
        appendLine("^FO${x},${yBarras}^BY$modulo,2,$alto^BCN,$alto,N,N,N^FD${zpl(codigo)}^FS")
        appendLine("^XZ")
    }
}

private fun zpl(valor: String): String =
    valor.replace("\\", "\\\\").replace("^", " ").replace("~", " ")
