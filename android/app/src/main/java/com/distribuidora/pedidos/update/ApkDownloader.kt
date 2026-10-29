package com.distribuidora.pedidos.update

import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

object ApkDownloader {
    const val DOWNLOAD_URL = "https://demo.ouwap.com/api/v1/admin/downloadApk.php"
    const val FILE_NAME = "Distribuidora.apk"

    suspend fun download(pin: String, dest: File): JSONObject? = withContext(Dispatchers.IO) {
        val connection = (URL(DOWNLOAD_URL).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 180_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
            setRequestProperty("Accept", "*/*")
        }
        connection.outputStream.use { out ->
            out.write(JSONObject().put("pin", pin).toString().toByteArray(Charsets.UTF_8))
        }
        val code = connection.responseCode
        val type = connection.contentType.orEmpty()
        val looksJson = type.contains("json", ignoreCase = true) || code !in 200..299
        if (looksJson) {
            val body = (if (code in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()
                ?.use { it.readText() }
                .orEmpty()
            return@withContext runCatching { JSONObject(body) }.getOrElse {
                JSONObject().put("message", "download-failed")
            }
        }
        dest.parentFile?.mkdirs()
        connection.inputStream.use { input ->
            FileOutputStream(dest).use { output -> input.copyTo(output) }
        }
        if (!dest.isFile || dest.length() < 100L) {
            dest.delete()
            return@withContext JSONObject().put("message", "empty")
        }
        return@withContext null
    }
}
