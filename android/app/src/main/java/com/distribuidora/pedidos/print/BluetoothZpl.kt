package com.distribuidora.pedidos.print

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private val SPP: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

suspend fun imprimirZpl(context: Context, paginas: List<String>): String = withContext(Dispatchers.IO) {
    if (paginas.isEmpty()) return@withContext "No hay labels para imprimir"
    if (Build.VERSION.SDK_INT >= 31 &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED
    ) {
        return@withContext "Falta el permiso de Bluetooth"
    }
    val manager = context.getSystemService(BluetoothManager::class.java)
    val adapter = manager?.adapter ?: return@withContext "Este aparato no tiene Bluetooth"
    if (!adapter.isEnabled) return@withContext "Bluetooth está apagado"
    val device = elegirImpresora(adapter) ?: return@withContext "No hay una impresora emparejada"
    val socket = try {
        @SuppressLint("MissingPermission")
        device.createInsecureRfcommSocketToServiceRecord(SPP).also { it.connect() }
    } catch (e: Exception) {
        return@withContext "No se pudo conectar: ${e.javaClass.simpleName}"
    }
    try {
        val out = socket.outputStream
        paginas.forEach { pagina ->
            out.write(pagina.toByteArray(Charsets.UTF_8))
            out.flush()
        }
        "Se enviaron ${paginas.size} labels"
    } catch (e: Exception) {
        "No se pudo imprimir: ${e.javaClass.simpleName}"
    } finally {
        try {
            socket.close()
        } catch (_: Exception) {
        }
    }
}

@SuppressLint("MissingPermission")
private fun elegirImpresora(adapter: BluetoothAdapter) =
    adapter.bondedDevices?.firstOrNull { device ->
        val nombre = device.name?.lowercase().orEmpty()
        nombre.contains("zebra") || nombre.contains("printer") || nombre.contains("zpl")
    } ?: adapter.bondedDevices?.firstOrNull()
