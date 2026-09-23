package com.entregador.app

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Build
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Serviço de Acessibilidade Otimizado para Produção
 * Previne vazamentos de memória (Memory Leaks) através da reciclagem estrita de nós.
 */
class EntregadorAccessibilityService : AccessibilityService() {

    private var currentTripState: String = "IDLE"
    private var currentAppName: String = "Desconhecido"
    private var lastEventTimestamp: Long = 0

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        // Debounce para evitar sobrecarga em scrolls rápidos (mínimo 300ms entre varreduras)
        val now = System.currentTimeMillis()
        if (now - lastEventTimestamp < 300) return
        lastEventTimestamp = now

        val packageName = event.packageName?.toString() ?: return
        val supportedApps = listOf(
            "br.com.ifood.driver", 
            "com.ubercab.driver", 
            "com.taxis99.driver", 
            "com.lalamove.driver.p2p"
        )

        if (!supportedApps.contains(packageName)) return

        val prefs = getSharedPreferences("entregador_prefs", MODE_PRIVATE)
        
        // Auto-ativar disponibilidade ao abrir apps de entrega
        val isAvailable = prefs.getBoolean("is_available", false)
        if (!isAvailable) {
            prefs.edit().putBoolean("is_available", true).apply()
            val statusIntent = Intent("com.entregador.STATUS_CHANGED").apply {
                putExtra("is_available", true)
            }
            sendBroadcast(statusIntent)
        }

        val rootNode = rootInActiveWindow ?: return
        try {
            when (packageName) {
                "br.com.ifood.driver"     -> analisarTelaSafely(rootNode, "iFood")
                "com.ubercab.driver"      -> analisarTelaSafely(rootNode, "Uber")
                "com.taxis99.driver"      -> analisarTelaSafely(rootNode, "99 Food")
                "com.lalamove.driver.p2p" -> analisarTelaSafely(rootNode, "Lalamove")
            }
        } finally {
            try {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
                    rootNode.recycle()
                }
            } catch (_: Exception) {}
        }
    }

    private fun analisarTelaSafely(rootNode: AccessibilityNodeInfo, appName: String) {
        val textos = mutableListOf<String>()
        extrairTextosRecursoSeguro(rootNode, textos, maxDepth = 10)

        val emCorridaKeywords = listOf(
            "corrida em andamento", "a caminho do cliente", "coleta em andamento",
            "iniciar viagem", "pedido aceito", "entrega em andamento", "rota de entrega"
        )

        val finalizadoKeywords = listOf(
            "pedido entregue", "corrida finalizada", "viagem concluída",
            "você ganhou r$", "entrega concluída", "ganho da corrida"
        )

        val estaEmCorrida = textos.any { text ->
            emCorridaKeywords.any { kw -> text.contains(kw, ignoreCase = true) }
        }

        val estaFinalizado = textos.any { text ->
            finalizadoKeywords.any { kw -> text.contains(kw, ignoreCase = true) }
        }

        if (estaEmCorrida && currentTripState != "IN_TRIP") {
            currentTripState = "IN_TRIP"
            currentAppName = appName
            iniciarCorridaAuto(appName)
        } else if (estaFinalizado && currentTripState == "IN_TRIP") {
            currentTripState = "IDLE"
            val valorGanho = extrairValorGanho(textos)
            finalizarCorridaAuto(appName, valorGanho)
        }
    }

    private fun extrairTextosRecursoSeguro(
        node: AccessibilityNodeInfo?, 
        lista: MutableList<String>, 
        maxDepth: Int
    ) {
        if (node == null || maxDepth <= 0) return

        node.text?.let {
            if (it.isNotBlank()) lista.add(it.toString())
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            try {
                extrairTextosRecursoSeguro(child, lista, maxDepth - 1)
            } finally {
                try {
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
                        child.recycle()
                    }
                } catch (_: Exception) {}
            }
        }
    }

    private fun extrairValorGanho(textos: List<String>): Double {
        val regex = Regex("""R\$\s*([0-9]+[.,][0-9]{2})""", RegexOption.IGNORE_CASE)
        for (t in textos) {
            val match = regex.find(t)
            if (match != null) {
                val cleanVal = match.groupValues[1].replace(".", "").replace(",", ".")
                return cleanVal.toDoubleOrNull() ?: 0.0
            }
        }
        return 0.0
    }

    private fun iniciarCorridaAuto(appName: String) {
        try {
            val gpsIntent = Intent(this, GpsTrackerService::class.java).apply {
                action = GpsTrackerService.ACTION_START_TRACKING
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(gpsIntent)
            } else {
                startService(gpsIntent)
            }

            val widgetIntent = Intent(this, FloatingWidgetService::class.java).apply {
                putExtra("app_name", appName)
                putExtra("status", "CORRIDA EM ANDAMENTO")
                putExtra("state", "IN_TRIP")
            }
            startService(widgetIntent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun finalizarCorridaAuto(appName: String, valorGanho: Double) {
        try {
            val gpsIntent = Intent(this, GpsTrackerService::class.java).apply {
                action = GpsTrackerService.ACTION_STOP_TRACKING
            }
            startService(gpsIntent)

            val repo = DataRepository.getInstance(this)
            repo.registrarCorridaFinalizada(appName, valorGanho, 0.0)

            val widgetIntent = Intent(this, FloatingWidgetService::class.java).apply {
                putExtra("app_name", appName)
                putExtra("status", "CORRIDA FINALIZADA")
                putExtra("state", "FINISHED")
            }
            startService(widgetIntent)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onInterrupt() {}
}
