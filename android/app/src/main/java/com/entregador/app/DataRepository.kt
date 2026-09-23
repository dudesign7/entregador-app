package com.entregador.app

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

/**
 * DataRepository armazena e gerencia os dados diários, semanais e de combustível
 * sincronizado diretamente com a estrutura JSON consumida pelo Dashboard Web (db.js).
 */
class DataRepository(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("entregador_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_DB_JSON = "entregador_db_data"
        @Volatile private var instance: DataRepository? = null

        fun getInstance(context: Context): DataRepository {
            return instance ?: synchronized(this) {
                instance ?: DataRepository(context.applicationContext).also { instance = it }
            }
        }
    }

    init {
        if (!prefs.contains(KEY_DB_JSON)) {
            inicializarDataPadrao()
        }
    }

    private fun inicializarDataPadrao() {
        val root = JSONObject().apply {
            put("days", JSONArray())
            put("fuel_logs", JSONArray())
            put("maintenance", JSONObject().apply {
                put("odometer_total", 12500.0)
                put("last_oil_km", 11200.0)
                put("oil_interval_km", 3000)
                put("last_revision_km", 9800.0)
                put("revision_interval_km", 6000)
            })
            put("settings", JSONObject().apply {
                put("fuel_price", 8.00)
                put("bike_km_l_estimate", 27.5)
                put("bike_model", "CG 105cc")
            })
        }
        salvarJson(root)
    }

    fun getJsonString(): String {
        return prefs.getString(KEY_DB_JSON, "{}") ?: "{}"
    }

    fun salvarJsonString(jsonStr: String) {
        prefs.edit().putString(KEY_DB_JSON, jsonStr).apply()
    }

    private fun getJsonObject(): JSONObject {
        return try {
            JSONObject(getJsonString())
        } catch (e: Exception) {
            JSONObject()
        }
    }

    private fun salvarJson(obj: JSONObject) {
        salvarJsonString(obj.toString())
    }

    fun registrarCorridaFinalizada(appName: String, earnings: Double, kmTraveled: Double) {
        val obj = getJsonObject()
        val daysArray = obj.optJSONArray("days") ?: JSONArray()
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())

        var todayObj: JSONObject? = null
        var todayIdx = -1

        for (i in 0 until daysArray.length()) {
            val d = daysArray.getJSONObject(i)
            if (d.optString("date") == todayStr) {
                todayObj = d
                todayIdx = i
                break
            }
        }

        if (todayObj == null) {
            todayObj = JSONObject().apply {
                put("id", "day-" + System.currentTimeMillis())
                put("date", todayStr)
                put("weekday", SimpleDateFormat("EEE", Locale("pt", "BR")).format(Date()))
                put("km", 0.0)
                put("earnings", 0.0)
                put("apps", JSONObject().apply {
                    put("ifood", 0.0)
                    put("uber", 0.0)
                    put("noventa_nove", 0.0)
                    put("lalamove", 0.0)
                })
                put("tips", 0.0)
                put("notes", "")
                put("trips", JSONArray())
            }
            daysArray.put(todayObj)
        }

        val appKey = when (appName.lowercase()) {
            "ifood" -> "ifood"
            "uber" -> "uber"
            "99", "99food", "99 food" -> "noventa_nove"
            "lalamove" -> "lalamove"
            else -> "ifood"
        }

        // Add trip to trips array
        val tripsArray = todayObj.optJSONArray("trips") ?: JSONArray()
        val newTrip = JSONObject().apply {
            put("id", "trip-" + System.currentTimeMillis())
            put("timestamp", SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).format(Date()))
            put("platform", appKey)
            put("value", earnings)
            put("km", kmTraveled)
            put("time_minutes", 0) // Cannot accurately compute without start/stop tracking precisely, handled roughly
            put("notes", "")
            put("auto_detected", true)
        }
        // Insert at beginning of array
        val newTripsArray = JSONArray()
        newTripsArray.put(newTrip)
        for (i in 0 until tripsArray.length()) {
            newTripsArray.put(tripsArray.getJSONObject(i))
        }
        todayObj.put("trips", newTripsArray)

        // Recalculate totals
        var totalKm = 0.0
        var totalEarnings = 0.0
        val appsObj = JSONObject().apply {
            put("ifood", 0.0)
            put("uber", 0.0)
            put("noventa_nove", 0.0)
            put("lalamove", 0.0)
        }

        for (i in 0 until newTripsArray.length()) {
            val t = newTripsArray.getJSONObject(i)
            totalKm += t.optDouble("km", 0.0)
            totalEarnings += t.optDouble("value", 0.0)
            val p = t.optString("platform", "ifood")
            appsObj.put(p, appsObj.optDouble(p, 0.0) + t.optDouble("value", 0.0))
        }

        todayObj.put("km", totalKm)
        todayObj.put("earnings", totalEarnings)
        todayObj.put("apps", appsObj)

        // Update Odometer Total
        val maintenance = obj.optJSONObject("maintenance") ?: JSONObject()
        val currentOdo = maintenance.optDouble("odometer_total", 0.0)
        maintenance.put("odometer_total", currentOdo + kmTraveled)
        obj.put("maintenance", maintenance)

        salvarJson(obj)
    }

    /**
     * Retorna o resumo formatado do dia de hoje para exibir no Widget.
     */
    fun getResumoHojeFormatado(): String {
        val obj = getJsonObject()
        val daysArray = obj.optJSONArray("days") ?: JSONArray()
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())

        for (i in 0 until daysArray.length()) {
            val d = daysArray.getJSONObject(i)
            if (d.optString("date") == todayStr) {
                val earn = d.optDouble("earnings", 0.0) + d.optDouble("tips", 0.0)
                val km = d.optDouble("km", 0.0)
                return String.format(Locale.getDefault(), "Hoje: R$ %.2f | %.1f km", earn, km)
            }
        }
        return "Hoje: R$ 0,00 | 0,0 km"
    }

    fun getFuelPrice(): Double {
        val settings = getJsonObject().optJSONObject("settings")
        return settings?.optDouble("fuel_price", 8.00) ?: 8.00
    }

    fun getKmPerLiterEstimate(): Double {
        val settings = getJsonObject().optJSONObject("settings")
        return settings?.optDouble("bike_km_l_estimate", 27.5) ?: 27.5
    }
}
