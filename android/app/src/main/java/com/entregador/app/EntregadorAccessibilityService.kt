package com.entregador.app

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Build
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * EntregadorAccessibilityService escuta a tela dos aplicativos de entrega (iFood, Uber, 99, Lalamove),
 * detectando automaticamente quando o entregador entra ou sai de uma corrida.
 */
class EntregadorAccessibilityService : AccessibilityService() {

    private var currentTripState: String = "IDLE" // "IDLE", "IN_TRIP"
    private var currentAppName: String = "Desconhecido"
    private var currentKmInTrip: Double = 0.0

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val packageName = event.packageName?.toString() ?: return
        val rootNode = rootInActiveWindow ?: return

        val supportedApps = listOf("br.com.ifood.driver", "com.ubercab.driver", "com.taxis99.driver", "com.lalamove.driver.p2p")
        if (supportedApps.contains(packageName)) {
            val prefs = getSharedPreferences("entregador_prefs", android.content.Context.MODE_PRIVATE)
            val isAvailable = prefs.getBoolean("is_available", false)
            if (!isAvailable) {
                // Auto change to available
                prefs.edit().putBoolean("is_available", true).apply()
                val statusIntent = Intent("com.entregador.STATUS_CHANGED")
                statusIntent.putExtra("is_available", true)
                sendBroadcast(statusIntent)
            }
        }

        val prefs = getSharedPreferences("entregador_prefs", android.content.Context.MODE_PRIVATE)
        if (!prefs.getBoolean("is_available", false)) {
            // Se estiver indisponível (e não foi ativado pela checagem acima), ignorar.
            return
        }

        when (packageName) {
            "br.com.ifood.driver"     -> analisarTela(rootNode, "iFood")
            "com.ubercab.driver"      -> analisarTela(rootNode, "Uber")
            "com.taxis99.driver"      -> analisarTela(rootNode, "99 Food")
            "com.lalamove.driver.p2p" -> analisarTela(rootNode, "Lalamove")
        }
    }

    private fun analisarTela(rootNode: AccessibilityNodeInfo, appName: String) {
        val textos = mutableListOf<String>()
        extrairTextos(rootNode, textos)

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

    private fun extrairTextos(node: AccessibilityNodeInfo?, lista: MutableList<String>) {
        if (node == null) return
        if (!node.text.isNullOrBlank()) {
            lista.add(node.text.toString())
        }
        for (i in 0 until node.childCount) {
            try {
                extrairTextos(node.getChild(i), lista)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private fun extrairValorGanho(textos: List<String>): Double {
        for (t in textos) {
            if (t.contains("R$", ignoreCase = true)) {
                val regex = Regex("R\\$\\s*([0-9]+[.,][0-9]{2})")
                val match = regex.find(t)
                if (match != null) {
                    val strVal = match.groupValues[1].replace(".", "").replace(",", ".")
                    return strVal.toDoubleOrNull() ?: 0.0
                }
            }
        }
        return 0.0
    }

    private fun iniciarCorridaAuto(appName: String) {
        try {
            // 1. Inicia o rastreador de GPS como serviço em primeiro plano
            val gpsIntent = Intent(this, GpsTrackerService::class.java).apply {
                action = GpsTrackerService.ACTION_START_TRACKING
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(gpsIntent)
            } else {
                startService(gpsIntent)
            }

            // 2. Atualiza o Widget Flutuante
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
            // 1. Para o GPS
            val gpsIntent = Intent(this, GpsTrackerService::class.java).apply {
                action = GpsTrackerService.ACTION_STOP_TRACKING
            }
            startService(gpsIntent)

            // 2. Salva os dados acumulados no repositório
            val repo = DataRepository.getInstance(this)
            repo.registrarCorridaFinalizada(appName, valorGanho, currentKmInTrip)

            // 3. Atualiza o Widget Flutuante
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
