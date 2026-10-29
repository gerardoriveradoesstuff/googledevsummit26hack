package com.distribuidora.pedidos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.distribuidora.pedidos.data.ServerConfig
import com.distribuidora.pedidos.ui.DistribuidoraApp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ServerConfig.init(this)
        enableEdgeToEdge()
        setContent { DistribuidoraApp() }
    }
}
