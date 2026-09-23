package com.entregador.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder

class GpsTrackerService : Service(), LocationListener {

    private var locationManager: LocationManager? = null
    private var lastLocation: Location? = null
    private var totalKmTraveled: Double = 0.0
    private var isTracking: Boolean = false

    companion object {
        const val ACTION_START_TRACKING  = "com.entregador.ACTION_START_TRACKING"
        const val ACTION_STOP_TRACKING   = "com.entregador.ACTION_STOP_TRACKING"
        const val ACTION_LOCATION_UPDATE = "com.entregador.ACTION_LOCATION_UPDATE"
        const val EXTRA_KM_TRAVELED      = "extra_km_traveled"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID     = "gps_tracker_channel"
    }

    override fun onCreate() {
        super.onCreate()
        try {
            locationManager = getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            criarCanalNotificacao()
        } catch (t: Throwable) {
            t.printStackTrace()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            when (intent?.action) {
                ACTION_START_TRACKING -> iniciarRastreamento()
                ACTION_STOP_TRACKING  -> pararRastreamento()
            }
        } catch (t: Throwable) {
            t.printStackTrace()
        }
        return START_STICKY
    }

    @Suppress("MissingPermission")
    private fun iniciarRastreamento() {
        if (isTracking) return
        isTracking = true
        totalKmTraveled = 0.0
        lastLocation = null

        try {
            val notificacao = criarNotificacao("Monitorando quilometragem da corrida...")
            if (Build.VERSION.SDK_INT >= 29) {
                // Pass integer 8 (ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION) safely
                startForeground(NOTIFICATION_ID, notificacao, 8)
            } else {
                startForeground(NOTIFICATION_ID, notificacao)
            }
        } catch (t: Throwable) {
            t.printStackTrace()
        }

        try {
            val lm = locationManager
            if (lm != null && lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2000L, 3f, this)
            }
        } catch (t: Throwable) {
            t.printStackTrace()
        }
    }

    private fun pararRastreamento() {
        if (!isTracking) return
        isTracking = false
        try {
            locationManager?.removeUpdates(this)
        } catch (t: Throwable) {
            t.printStackTrace()
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
        } catch (t: Throwable) {
            t.printStackTrace()
        }
        try { stopSelf() } catch (t: Throwable) {}
    }

    override fun onLocationChanged(location: Location) {
        if (!isTracking) return
        try {
            val last = lastLocation
            if (last != null) {
                // Filtro anti-ghosting: só computa se a velocidade for maior que ~1.8 km/h (0.5 m/s) e a precisão for razoável
                if (location.speed > 0.5f && location.accuracy < 30f) {
                    val distMeters = last.distanceTo(location)
                    if ((location.speed * 3.6) < 150f) {
                        totalKmTraveled += (distMeters / 1000.0)
                        sendBroadcast(Intent(ACTION_LOCATION_UPDATE).apply {
                            putExtra(EXTRA_KM_TRAVELED, totalKmTraveled)
                        })
                    }
                }
            }
            // Sempre atualiza o último local se ele tiver precisão aceitável, para a próxima medição ter um bom ponto de partida
            if (location.accuracy < 30f) {
                lastLocation = location
            }
        } catch (t: Throwable) {
            t.printStackTrace()
        }
    }

    private fun criarCanalNotificacao() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val channel = NotificationChannel(CHANNEL_ID, "Rastreamento Entregador", NotificationManager.IMPORTANCE_LOW)
                val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                manager?.createNotificationChannel(channel)
            } catch (t: Throwable) {
                t.printStackTrace()
            }
        }
    }

    private fun criarNotificacao(texto: String): Notification {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, CHANNEL_ID)
                    .setContentTitle("Entregador - GPS Ativo")
                    .setContentText(texto)
                    .setSmallIcon(android.R.drawable.ic_menu_compass)
                    .build()
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(this)
                    .setContentTitle("Entregador - GPS Ativo")
                    .setContentText(texto)
                    .setSmallIcon(android.R.drawable.ic_menu_compass)
                    .build()
            }
        } catch (t: Throwable) {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("Entregador")
                .setContentText(texto)
                .build()
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}
    @Suppress("DEPRECATION")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
}
