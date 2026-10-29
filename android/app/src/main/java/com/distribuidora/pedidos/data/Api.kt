package com.distribuidora.pedidos.data

import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

/** Panel y pedidos en el servidor. La carpeta api/ es la raíz pública de la puerta. */
const val API_ORIGIN = "https://demo.ouwap.com/api"

data class LineaPedido(
    val nombre: String,
    val unidad: String,
    val cantidad: Double,
    val copias: Int,
)

data class Pedido(
    val numero: Int,
    val cliente: String,
    val direccion: String,
    val fechaEsperada: String,
    val recibidoEn: String,
    val procesado: Boolean,
    val procesadoEn: String = "",
    val lineas: List<LineaPedido>,
)

object DistApi {
    suspend fun pedidos(): List<Pedido> = withContext(Dispatchers.IO) {
        val conn = (URL("$API_ORIGIN/v1/pedidos.php").openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 8_000
            readTimeout = 15_000
            setRequestProperty("Accept", "application/json")
        }
        try {
            val text = (if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader()
                ?.use { it.readText() }
                .orEmpty()
            val json = JSONObject(text.ifBlank { "{}" })
            if (conn.responseCode !in 200..299 || json.optString("status") == "error") {
                throw IllegalStateException(json.optString("message").ifBlank { "error" })
            }
            val arr = json.optJSONArray("pedidos") ?: return@withContext emptyList()
            return@withContext (0 until arr.length()).mapNotNull { i ->
                val o = arr.optJSONObject(i) ?: return@mapNotNull null
                val lineas = o.optJSONArray("lineas")
                Pedido(
                    numero = o.optInt("numero"),
                    cliente = o.optString("cliente"),
                    direccion = o.optString("direccion"),
                    fechaEsperada = o.optString("fecha_esperada"),
                    recibidoEn = o.optString("recibido_en"),
                    procesado = o.optBoolean("procesado") || o.optInt("procesado") == 1,
                    procesadoEn = o.optString("procesado_en"),
                    lineas = (0 until (lineas?.length() ?: 0)).mapNotNull { j ->
                        val l = lineas?.optJSONObject(j) ?: return@mapNotNull null
                        LineaPedido(
                            nombre = l.optString("nombre"),
                            unidad = l.optString("unidad"),
                            cantidad = l.optDouble("cantidad"),
                            copias = l.optInt("copias"),
                        )
                    },
                )
            }.filter { it.numero > 0 }
        } finally {
            conn.disconnect()
        }
    }

    suspend fun marcarProcesado(numero: Int) = withContext(Dispatchers.IO) {
        val conn = (URL("$API_ORIGIN/v1/pedidos.php").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 8_000
            readTimeout = 15_000
            doOutput = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json")
        }
        try {
            conn.outputStream.use { it.write("""{"numero":$numero}""".toByteArray(Charsets.UTF_8)) }
            val text = (if (conn.responseCode in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader()
                ?.use { it.readText() }
                .orEmpty()
            val json = JSONObject(text.ifBlank { "{}" })
            if (conn.responseCode !in 200..299 || json.optString("status") == "error") {
                throw IllegalStateException(json.optString("message").ifBlank { "No se pudo marcar el pedido" })
            }
        } finally {
            conn.disconnect()
        }
    }
}
