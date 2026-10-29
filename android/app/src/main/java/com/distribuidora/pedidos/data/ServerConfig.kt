package com.distribuidora.pedidos.data

import android.content.Context
import android.content.SharedPreferences
import com.distribuidora.pedidos.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

/**
 * Base URL of the PHP API (the public root of the `api/` folder), configurable at runtime.
 *
 * Priority: value saved in the in-app "Servidor" dialog (SharedPreferences)
 * > BuildConfig.API_BASE_URL (gradle `-PapiBaseUrl=...`) > https://demo.ouwap.com/api.
 *
 * Example for a teammate's laptop behind Tailscale Funnel: https://laptop.tail1234.ts.net (a trailing /api is also accepted)
 * (see TAILSCALE.md at the repo root).
 */
object ServerConfig {
    const val FALLBACK = "https://demo.ouwap.com/api"
    private const val PREFS = "servidor"
    private const val KEY = "api_base_url"

    /** Build-time default (gradle -PapiBaseUrl=...), or the demo server. */
    val buildDefault: String = normalize(BuildConfig.API_BASE_URL) ?: FALLBACK

    @Volatile private var prefs: SharedPreferences? = null

    fun init(context: Context) {
        if (prefs == null) prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    /** Current API base, without trailing slash, e.g. "https://demo.ouwap.com/api". */
    val apiBase: String
        get() = prefs?.getString(KEY, null)?.takeIf { it.isNotBlank() } ?: buildDefault

    val isCustom: Boolean get() = !prefs?.getString(KEY, null).isNullOrBlank()

    /** Saves [url] (normalized). Blank/null resets to [buildDefault]. Returns the saved base or null if invalid. */
    fun save(context: Context, url: String?): String? {
        init(context)
        val p = prefs ?: return null
        if (url.isNullOrBlank()) {
            p.edit().remove(KEY).apply()
            return buildDefault
        }
        val n = normalize(url) ?: return null
        p.edit().putString(KEY, n).apply()
        return n
    }

    /**
     * Trims, adds https:// when no scheme is given, drops trailing slashes and an
     * accidentally pasted "/v1/..." endpoint suffix. Returns null if it is not a valid http(s) URL.
     */
    fun normalize(input: String): String? {
        var s = input.trim()
        if (s.isEmpty()) return null
        if (!s.startsWith("http://", ignoreCase = true) && !s.startsWith("https://", ignoreCase = true)) s = "https://$s"
        s = s.replace(Regex("/v1(/.*)?$"), "").trimEnd('/')
        return runCatching {
            val u = URL(s)
            if (u.host.isNullOrBlank() || (u.protocol != "http" && u.protocol != "https")) null else s
        }.getOrNull()
    }

    /** Calls GET {base}/v1/pedidos.php and returns a short human-readable result. */
    suspend fun probar(base: String): Result<String> = withContext(Dispatchers.IO) {
        runCatching {
            val conn = (URL("$base/v1/pedidos.php").openConnection() as HttpURLConnection).apply {
                connectTimeout = 8_000
                readTimeout = 10_000
                setRequestProperty("Accept", "application/json")
            }
            try {
                val code = conn.responseCode
                val body = (if (code in 200..299) conn.inputStream else conn.errorStream)
                    ?.bufferedReader()?.use { it.readText() }.orEmpty()
                val json = runCatching { JSONObject(body) }.getOrNull()
                    ?: error("HTTP $code: la respuesta no es JSON (¿es la URL base correcta? p. ej. https://equipo.tailnet.ts.net)")
                if (code !in 200..299 || json.optString("status") == "error") {
                    error("HTTP $code: ${json.optString("message").ifBlank { "error" }}")
                }
                "OK: ${json.optJSONArray("pedidos")?.length() ?: 0} pedidos"
            } finally {
                conn.disconnect()
            }
        }
    }
}
