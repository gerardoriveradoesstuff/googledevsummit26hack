package com.distribuidora.pedidos.ui

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.distribuidora.pedidos.R
import com.distribuidora.pedidos.data.DistApi
import com.distribuidora.pedidos.data.Pedido
import com.distribuidora.pedidos.data.ServerConfig
import com.distribuidora.pedidos.print.imprimirZpl
import com.distribuidora.pedidos.print.paginasLabel
import com.distribuidora.pedidos.update.ApkDownloader
import com.distribuidora.pedidos.update.ApkInstaller
import java.io.File
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val Hoja = Color(0xFF1F6B3A)
private val Fondo = Color(0xFFE7F3EA)
private val Tinta = Color(0xFF14241A)
private val Ambar = Color(0xFFC4A035)
private const val CANAL = "pedidos_sonido"

@Composable
fun DistribuidoraApp() {
    val context = LocalContext.current
    var pedidos by remember { mutableStateOf<List<Pedido>>(emptyList()) }
    var elegido by remember { mutableStateOf<Int?>(null) }
    var pestana by remember { mutableStateOf("nuevos") }
    val procesadosLocales = remember { mutableStateOf(cargarProcesados(context)) }
    val marcasLocales = remember { mutableStateOf(cargarMarcas(context)) }
    var error by remember { mutableStateOf<String?>(null) }
    var procesar by remember { mutableStateOf(false) }
    var enviarLabels by remember { mutableStateOf(false) }
    val vistos = remember { mutableSetOf<Int>() }
    var listo by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    var showPin by remember { mutableStateOf(false) }
    var showServer by remember { mutableStateOf(false) }
    var servidor by remember { mutableStateOf(ServerConfig.apiBase) }
    var serverInput by remember { mutableStateOf("") }
    var serverMsg by remember { mutableStateOf<String?>(null) }
    var probando by remember { mutableStateOf(false) }
    var pin by remember { mutableStateOf("") }
    var updating by remember { mutableStateOf(false) }
    var updateHint by remember { mutableStateOf<String?>(null) }
    val errGeneric = stringResource(R.string.update_error_generic)
    val errConnect = stringResource(R.string.update_error_connect)
    val errSources = stringResource(R.string.update_error_sources)

    val permisoBt = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    val permisoNotif = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }

    LaunchedEffect(Unit) {
        crearCanal(context)
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            permisoNotif.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
        if (Build.VERSION.SDK_INT >= 31 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED
        ) {
            permisoBt.launch(Manifest.permission.BLUETOOTH_CONNECT)
        }
    }

    LaunchedEffect(servidor) {
        // Server changed (or first run): treat the current orders as already seen, no notification burst.
        listo = false
        vistos.clear()
        while (true) {
            try {
                val lista = DistApi.pedidos()
                if (!listo) {
                    lista.forEach { vistos += it.numero }
                    listo = true
                } else {
                    lista.filter { it.numero !in vistos }.forEach { nuevo ->
                        vistos += nuevo.numero
                        notificar(context, nuevo)
                        pestana = "nuevos"
                        elegido = nuevo.numero
                    }
                }
                val locales = procesadosLocales.value
                val marcas = marcasLocales.value
                pedidos = lista.map { pedidoRemoto ->
                    val local = marcas[pedidoRemoto.numero].orEmpty()
                    pedidoRemoto.copy(
                        procesado = pedidoRemoto.procesado || pedidoRemoto.numero in locales || local.isNotBlank(),
                        procesadoEn = pedidoRemoto.procesadoEn.ifBlank { local },
                    )
                }
                error = null
            } catch (e: Exception) {
                error = (e.message?.takeIf { it.isNotBlank() } ?: "No se pudo hablar con el servidor") +
                    " (${ServerConfig.apiBase})"
            }
            delay(4_000)
        }
    }

    val pedido = pedidos.firstOrNull { it.numero == elegido }
    val visibles = pedidos.filter { if (pestana == "procesados") it.procesado else !it.procesado }
    Column(Modifier.fillMaxSize().background(Hoja).statusBarsPadding()) {
        Row(
            Modifier.fillMaxWidth().background(Hoja).padding(horizontal = 16.dp, vertical = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(painterResource(R.drawable.ic_hoja), null, tint = Color.Unspecified, modifier = Modifier.size(32.dp))
            Text(
                "Distribuidora de Productos",
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f).padding(start = 10.dp),
            )
            IconButton(
                onClick = {
                    serverInput = ServerConfig.apiBase
                    serverMsg = null
                    showServer = true
                },
                modifier = Modifier.size(48.dp),
            ) {
                Icon(
                    painterResource(R.drawable.ic_server),
                    contentDescription = stringResource(R.string.server_cd),
                    tint = Color.White,
                )
            }
            IconButton(
                onClick = {
                    pin = ""
                    showPin = true
                },
                modifier = Modifier.size(48.dp),
            ) {
                Icon(
                    painterResource(R.drawable.ic_arrow_path),
                    contentDescription = stringResource(R.string.home_update_cd),
                    tint = Color.White,
                )
            }
        }
        Column(Modifier.weight(1f).fillMaxWidth().background(Fondo).navigationBarsPadding()) {
        if (updating) {
            CircularProgressIndicator(
                color = Hoja,
                modifier = Modifier.padding(top = 12.dp).align(Alignment.CenterHorizontally),
            )
            Text(
                stringResource(R.string.update_working),
                modifier = Modifier
                    .padding(top = 8.dp)
                    .align(Alignment.CenterHorizontally)
                    .semantics { liveRegion = LiveRegionMode.Polite },
                color = Tinta,
            )
        }
        updateHint?.let { hint ->
            Text(
                hint,
                color = Color(0xFF991B1B),
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
        }
        if (error != null) {
            Text(error!!, color = Color(0xFF991B1B), modifier = Modifier.padding(16.dp))
        }
        Row(Modifier.weight(1f).fillMaxWidth()) {
            Column(Modifier.weight(0.42f).fillMaxHeight().background(Color.White)) {
                Pestanas(
                    pestana = pestana,
                    onElegir = { siguiente ->
                        pestana = siguiente
                        val sigue = pedidos.any {
                            it.numero == elegido && (if (siguiente == "procesados") it.procesado else !it.procesado)
                        }
                        if (!sigue) {
                            elegido = null
                            procesar = false
                        }
                    },
                )
                Inbox(
                    pedidos = visibles,
                    elegido = elegido,
                    vacio = if (pestana == "procesados") "No hay pedidos procesados." else "Todavía no llega ningún pedido.",
                    onOpen = {
                        elegido = it.numero
                        procesar = false
                    },
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                )
            }
            Box(Modifier.weight(0.58f).fillMaxHeight().background(Fondo)) {
                if (pedido == null) {
                    Text(
                        "Elige un pedido para verlo aquí.",
                        color = Tinta.copy(alpha = 0.7f),
                        modifier = Modifier.padding(20.dp),
                    )
                } else {
                    Detalle(
                        pedido = pedido,
                        procesar = procesar,
                        enviarLabels = enviarLabels,
                        onEnviarLabels = { enviarLabels = it },
                        onProcesar = { procesar = true },
                        onTerminado = {
                            val antes = pedidos.filter { !it.procesado }
                            val idx = antes.indexOfFirst { it.numero == pedido.numero }
                            val restantes = antes.filter { it.numero != pedido.numero }
                            val siguiente = restantes.getOrNull(idx) ?: restantes.lastOrNull()
                            val guardados = procesadosLocales.value + pedido.numero
                            procesadosLocales.value = guardados
                            guardarProcesados(context, guardados)
                            val marca = marcasLocales.value[pedido.numero] ?: marcaAhora()
                            val marcas = marcasLocales.value + (pedido.numero to marca)
                            marcasLocales.value = marcas
                            guardarMarcas(context, marcas)
                            scope.launch {
                                try {
                                    DistApi.marcarProcesado(pedido.numero)
                                } catch (_: Exception) {
                                }
                            }
                            pedidos = pedidos.map {
                                if (it.numero == pedido.numero) {
                                    it.copy(procesado = true, procesadoEn = it.procesadoEn.ifBlank { marca })
                                } else {
                                    it
                                }
                            }
                            pestana = "nuevos"
                            elegido = siguiente?.numero
                            procesar = false
                        },
                    )
                }
            }
        }
        }
    }

    if (showServer) {
        val guardar = { url: String? ->
            val saved = ServerConfig.save(context, url)
            if (saved == null) {
                serverMsg = context.getString(R.string.server_invalid)
            } else {
                servidor = saved
                pedidos = emptyList()
                elegido = null
                error = null
                showServer = false
            }
        }
        AlertDialog(
            onDismissRequest = { if (!probando) showServer = false },
            title = { Text(stringResource(R.string.server_title)) },
            text = {
                Column {
                    Text(stringResource(R.string.server_help, ServerConfig.buildDefault), fontSize = 13.sp, color = Tinta)
                    OutlinedTextField(
                        value = serverInput,
                        onValueChange = { serverInput = it.trim(); serverMsg = null },
                        label = { Text(stringResource(R.string.server_label)) },
                        placeholder = { Text("https://laptop.tailnet.ts.net/api") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    )
                    if (probando) CircularProgressIndicator(color = Hoja, modifier = Modifier.padding(top = 8.dp).size(20.dp))
                    serverMsg?.let { Text(it, fontSize = 13.sp, color = Tinta, modifier = Modifier.padding(top = 8.dp)) }
                    Row(Modifier.padding(top = 4.dp)) {
                        TextButton(
                            onClick = {
                                val base = ServerConfig.normalize(serverInput)
                                if (base == null) {
                                    serverMsg = context.getString(R.string.server_invalid)
                                } else if (!probando) {
                                    probando = true
                                    serverMsg = null
                                    scope.launch {
                                        serverMsg = ServerConfig.probar(base).fold({ "$it — $base" }, { "Error: ${it.message ?: it.javaClass.simpleName}" })
                                        probando = false
                                    }
                                }
                            },
                        ) { Text(stringResource(R.string.server_test)) }
                        TextButton(onClick = { guardar(null) }) { Text(stringResource(R.string.server_reset)) }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { guardar(serverInput) },
                    colors = ButtonDefaults.buttonColors(containerColor = Hoja),
                ) { Text(stringResource(R.string.server_save)) }
            },
            dismissButton = {
                TextButton(onClick = { showServer = false }) { Text(stringResource(R.string.update_cancel)) }
            },
        )
    }

    if (showPin) {
        AlertDialog(
            onDismissRequest = { if (!updating) showPin = false },
            title = { Text(stringResource(R.string.update_pin_title)) },
            text = {
                OutlinedTextField(
                    value = pin,
                    onValueChange = { pin = it.filter { ch -> ch.isDigit() }.take(8) },
                    label = { Text(stringResource(R.string.update_pin_label)) },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        val password = pin
                        showPin = false
                        if (updating) return@Button
                        if (ApkInstaller.needsUnknownSourcesPermission(context)) {
                            context.startActivity(ApkInstaller.unknownSourcesSettingsIntent(context))
                            updateHint = errSources
                            return@Button
                        }
                        updating = true
                        updateHint = null
                        scope.launch {
                            try {
                                val dest = File(File(context.cacheDir, "apk"), ApkDownloader.FILE_NAME)
                                val fallo = ApkDownloader.download(password, dest)
                                if (fallo != null) {
                                    val msg = fallo.optString("message").trim()
                                    updateHint = when {
                                        msg.isEmpty() || msg == "empty" || msg == "download-failed" -> errGeneric
                                        else -> msg
                                    }
                                } else {
                                    ApkInstaller.install(context, dest)
                                }
                            } catch (_: UnknownHostException) {
                                updateHint = errConnect
                            } catch (_: SocketTimeoutException) {
                                updateHint = errConnect
                            } catch (_: Exception) {
                                updateHint = errGeneric
                            }
                            updating = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Hoja),
                ) {
                    Text(stringResource(R.string.update_pin_confirm))
                }
            },
            dismissButton = {
                TextButton(onClick = { if (!updating) showPin = false }) {
                    Text(stringResource(R.string.update_cancel))
                }
            },
        )
    }
}

@Composable
private fun Pestanas(pestana: String, onElegir: (String) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf("nuevos" to "Nuevos pedidos", "procesados" to "Procesados").forEach { (id, titulo) ->
            val activa = pestana == id
            Text(
                titulo,
                color = if (activa) Color.White else Hoja,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(20.dp))
                    .background(if (activa) Hoja else Color.White)
                    .border(1.dp, Hoja, RoundedCornerShape(20.dp))
                    .clickable { onElegir(id) }
                    .padding(vertical = 10.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }
    }
}

@Composable
private fun Inbox(
    pedidos: List<Pedido>,
    elegido: Int?,
    vacio: String,
    onOpen: (Pedido) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier.verticalScroll(rememberScrollState()).background(Color.White)) {
        if (pedidos.isEmpty()) {
            Text(vacio, modifier = Modifier.padding(20.dp), color = Tinta)
            return@Column
        }
        pedidos.forEach { pedido ->
            val hoy = esHoy(pedido.fechaEsperada)
            val activo = pedido.numero == elegido
            Row(
                Modifier
                    .fillMaxWidth()
                    .clickable { onOpen(pedido) }
                    .background(if (activo) Fondo else Color.White)
                    .padding(horizontal = 16.dp, vertical = 18.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(painterResource(R.drawable.ic_inbox), null, tint = Hoja, modifier = Modifier.size(28.dp))
                Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                    Text(pedido.cliente, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Tinta)
                    Text("Pedido ${pedido.numero} · ${pedido.recibidoEn.takeLast(8).take(5)}", color = Tinta.copy(alpha = 0.7f))
                    if (pedido.procesado) {
                        Text(
                            if (pedido.procesadoEn.isNotBlank()) {
                                "Orden procesada · ${formatoMarca(pedido.procesadoEn)}"
                            } else {
                                "Orden procesada"
                            },
                            color = Hoja,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
                Text(
                    if (hoy) "Para hoy" else "Para mañana",
                    color = if (hoy) Color.White else Hoja,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .background(if (hoy) Hoja else Color.Transparent, RoundedCornerShape(20.dp))
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                )
            }
        }
    }
}

@Composable
private fun Detalle(
    pedido: Pedido,
    procesar: Boolean,
    enviarLabels: Boolean,
    onEnviarLabels: (Boolean) -> Unit,
    onProcesar: () -> Unit,
    onTerminado: () -> Unit,
) {
    val context = LocalContext.current
    val alTerminar = rememberUpdatedState(onTerminado)
    val mandar = rememberUpdatedState(enviarLabels)
    var impresion by remember { mutableStateOf(0f) }
    var cierre by remember { mutableStateOf(0f) }
    var lista by remember { mutableStateOf(false) }
    var avisoPrint by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(procesar, pedido.numero) {
        impresion = 0f
        cierre = 0f
        lista = false
        avisoPrint = null
        if (!procesar) return@LaunchedEffect
        coroutineScope {
            val trabajo = if (mandar.value) {
                async { imprimirZpl(context, paginasLabel(pedido)) }
            } else {
                null
            }
            val inicio = System.nanoTime()
            while ((System.nanoTime() - inicio) / 1_000_000_000f < 5f) {
                impresion = ((System.nanoTime() - inicio) / 1_000_000_000f / 5f).coerceIn(0f, 1f)
                delay(32)
            }
            impresion = 1f
            val aviso = trabajo?.await()
            avisoPrint = aviso
            lista = true
            val inicioCierre = System.nanoTime()
            while ((System.nanoTime() - inicioCierre) / 1_000_000_000f < 3f) {
                cierre = ((System.nanoTime() - inicioCierre) / 1_000_000_000f / 3f).coerceIn(0f, 1f)
                delay(32)
            }
            cierre = 1f
            alTerminar.value()
        }
    }
    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            Box(Modifier.padding(start = 16.dp, top = 16.dp, end = 16.dp)) {
                TarjetaPedido(pedido, enviarLabels, onEnviarLabels, onProcesar)
            }
            Column(
                Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                pedido.lineas.forEach { linea ->
                    Row(Modifier.fillMaxWidth().background(Color.White, RoundedCornerShape(12.dp)).padding(14.dp)) {
                        Text(linea.cantidad.toString(), fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Tinta)
                        Text(linea.unidad, modifier = Modifier.padding(start = 16.dp, top = 8.dp), color = Tinta)
                        Icon(painterResource(R.drawable.ic_cube), null, tint = Hoja, modifier = Modifier.padding(start = 16.dp, top = 6.dp).size(22.dp))
                        Text(linea.nombre, modifier = Modifier.padding(start = 8.dp, top = 6.dp), fontSize = 18.sp, color = Tinta)
                    }
                }
            }
        }
        AnimatedVisibility(
            visible = procesar,
            enter = slideInHorizontally(animationSpec = tween(280)) { it } + fadeIn(),
            exit = slideOutHorizontally(animationSpec = tween(220)) { it } + fadeOut(),
            modifier = Modifier.fillMaxSize(),
        ) {
            Column(Modifier.fillMaxSize().background(Hoja)) {
                Box(Modifier.weight(1f).fillMaxWidth()) {
                    Box(
                        Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(impresion.coerceIn(0f, 1f))
                            .background(Color.White.copy(alpha = 0.22f)),
                    )
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Imprimiendo", color = Color.White, fontSize = 36.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Box(
                    Modifier.weight(1f).fillMaxWidth().background(Color.White.copy(alpha = 0.08f)),
                    contentAlignment = Alignment.Center,
                ) {
                    if (lista) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Orden procesada", color = Color.White, fontSize = 36.sp, fontWeight = FontWeight.Bold)
                            if (avisoPrint != null) {
                                Text(
                                    avisoPrint!!,
                                    color = Color.White,
                                    fontSize = 16.sp,
                                    modifier = Modifier.padding(top = 12.dp, start = 24.dp, end = 24.dp),
                                )
                            }
                            Box(
                                Modifier.padding(top = 28.dp).width(240.dp).height(64.dp).clip(RoundedCornerShape(16.dp)).border(2.dp, Color.White, RoundedCornerShape(16.dp)),
                            ) {
                                Box(
                                    Modifier
                                        .fillMaxHeight()
                                        .fillMaxWidth(cierre.coerceIn(0f, 1f))
                                        .background(Color.White.copy(alpha = 0.28f)),
                                )
                                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Text("Terminar", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TarjetaPedido(
    pedido: Pedido,
    enviarLabels: Boolean,
    onEnviarLabels: (Boolean) -> Unit,
    onProcesar: () -> Unit,
) {
    val hoy = esHoy(pedido.fechaEsperada)
    Row(
        Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White),
    ) {
        Column(
            Modifier.weight(1f).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("Pedido ${pedido.numero}", color = Hoja, fontWeight = FontWeight.Bold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        checked = enviarLabels,
                        onCheckedChange = onEnviarLabels,
                        colors = CheckboxDefaults.colors(
                            checkedColor = Hoja,
                            uncheckedColor = Hoja,
                            checkmarkColor = Color.White,
                        ),
                    )
                    Text("Label", color = Tinta, fontWeight = FontWeight.SemiBold)
                }
            }
            Fila(R.drawable.ic_user, pedido.cliente, 22)
            Fila(R.drawable.ic_map_pin, pedido.direccion, 16)
            Fila(R.drawable.ic_calendar_days, if (hoy) "Para hoy" else "Para mañana", 16)
        }
        Column(Modifier.fillMaxHeight().width(132.dp).background(Hoja)) {
            Column(
                Modifier.weight(1f).fillMaxWidth().clickable(onClick = onProcesar),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("Procesar", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp, lineHeight = 20.sp)
                Text("orden", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp, lineHeight = 20.sp, modifier = Modifier.padding(top = 5.dp))
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(Color.White.copy(alpha = 0.35f)))
            Column(
                Modifier.weight(1f).fillMaxWidth(),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(pedido.lineas.sumOf { it.copias }.toString(), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 28.sp, lineHeight = 30.sp)
                Text("labels", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp, lineHeight = 16.sp, modifier = Modifier.padding(top = 5.dp))
            }
        }
    }
}

@Composable
private fun Fila(icono: Int, texto: String, tam: Int) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(painterResource(icono), null, tint = Hoja, modifier = Modifier.size(24.dp))
        Text(texto, modifier = Modifier.padding(start = 8.dp), fontSize = tam.sp, fontWeight = FontWeight.SemiBold, color = Tinta)
    }
}

private const val PREFS_PROCESADOS = "distribuidora_pedidos"
private const val CLAVE_PROCESADOS = "procesados"

private fun cargarProcesados(context: Context): Set<Int> =
    context.getSharedPreferences(PREFS_PROCESADOS, Context.MODE_PRIVATE)
        .getStringSet(CLAVE_PROCESADOS, emptySet())
        .orEmpty()
        .mapNotNull { it.toIntOrNull() }
        .toSet()

private fun guardarProcesados(context: Context, numeros: Set<Int>) {
    context.getSharedPreferences(PREFS_PROCESADOS, Context.MODE_PRIVATE)
        .edit()
        .putStringSet(CLAVE_PROCESADOS, numeros.map { it.toString() }.toSet())
        .apply()
}

private const val CLAVE_MARCAS = "procesado_en"

private fun cargarMarcas(context: Context): Map<Int, String> =
    context.getSharedPreferences(PREFS_PROCESADOS, Context.MODE_PRIVATE)
        .getString(CLAVE_MARCAS, "")
        .orEmpty()
        .lineSequence()
        .mapNotNull { linea ->
            val partes = linea.split("=", limit = 2)
            val numero = partes.getOrNull(0)?.toIntOrNull() ?: return@mapNotNull null
            val marca = partes.getOrNull(1)?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
            numero to marca
        }
        .toMap()

private fun guardarMarcas(context: Context, marcas: Map<Int, String>) {
    context.getSharedPreferences(PREFS_PROCESADOS, Context.MODE_PRIVATE)
        .edit()
        .putString(CLAVE_MARCAS, marcas.entries.joinToString("\n") { "${it.key}=${it.value}" })
        .apply()
}

private fun marcaAhora(): String =
    java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))

private fun formatoMarca(sql: String): String {
    val instante = runCatching {
        java.time.LocalDateTime.parse(sql, java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
    }.getOrNull() ?: return sql
    return instante.format(
        java.time.format.DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm", java.util.Locale.forLanguageTag("es-MX")),
    )
}

private fun esHoy(iso: String): Boolean {
    val hoy = java.time.LocalDate.now().toString()
    return iso == hoy
}

private fun crearCanal(context: Context) {
    if (Build.VERSION.SDK_INT < 26) return
    val manager = context.getSystemService(NotificationManager::class.java)
    manager.deleteNotificationChannel("pedidos")
    val canal = NotificationChannel(CANAL, "Pedidos", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Aviso cuando entra un pedido"
        enableVibration(true)
        setSound(
            sonidoNotificacion(),
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build(),
        )
    }
    manager.createNotificationChannel(canal)
}

private fun sonidoNotificacion() = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

private fun sonarPedido(context: Context) {
    val tono = RingtoneManager.getRingtone(context, sonidoNotificacion()) ?: return
    tono.audioAttributes = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
    tono.play()
}

private fun notificar(context: Context, pedido: Pedido) {
    sonarPedido(context)
    if (Build.VERSION.SDK_INT >= 33 &&
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
        return
    }
    val notif = NotificationCompat.Builder(context, CANAL)
        .setSmallIcon(R.drawable.ic_bell)
        .setContentTitle("Pedido nuevo ${pedido.numero}")
        .setContentText(pedido.cliente)
        .setAutoCancel(true)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setDefaults(NotificationCompat.DEFAULT_ALL)
        .setSound(sonidoNotificacion())
        .build()
    NotificationManagerCompat.from(context).notify(pedido.numero, notif)
}
