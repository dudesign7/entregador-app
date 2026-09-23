package com.entregador.app

import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.*
import android.widget.LinearLayout
import android.widget.TextView
import java.util.Locale

class FloatingWidgetService : Service() {

    private var windowManager: WindowManager? = null
    private var floatingView: View? = null
    private var params: WindowManager.LayoutParams? = null

    private var txtAppBadge: TextView? = null
    private var txtStatus: TextView? = null
    private var txtTripKm: TextView? = null
    private var txtCostEstimate: TextView? = null
    private var txtDaySummary: TextView? = null

    private var initialX = 0; private var initialY = 0
    private var initialTouchX = 0f; private var initialTouchY = 0f
    private var receiverRegistered = false
    private var isPaused = false
    private var btnPause: TextView? = null

    private val statusReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: android.content.Context?, intent: android.content.Intent?) {
            val isAvail = intent?.getBooleanExtra("is_available", false) ?: false
            floatingView?.visibility = if (isAvail) android.view.View.VISIBLE else android.view.View.GONE
        }
    }

    private val locationReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
            try {
                if (intent?.action == GpsTrackerService.ACTION_LOCATION_UPDATE) {
                    val km = intent.getDoubleExtra(GpsTrackerService.EXTRA_KM_TRAVELED, 0.0)
                    if(!isPaused) atualizarKmEmCorrida(km)
                }
            } catch (t: Throwable) {
                t.printStackTrace()
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        tentarInicializarWidget()
    }

    private fun tentarInicializarWidget() {
        if (floatingView != null) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) return

        try {
            windowManager = getSystemService(WINDOW_SERVICE) as? WindowManager
            if (windowManager != null) {
                inicializarLayoutView()
                registrarReceiver()
            }
        } catch (t: Throwable) {
            t.printStackTrace()
        }
    }

    private fun registrarReceiver() {
        if (receiverRegistered) return
        try {
                        val filter = IntentFilter(GpsTrackerService.ACTION_LOCATION_UPDATE)
            val statusFilter = IntentFilter("com.entregador.STATUS_CHANGED")
            if (Build.VERSION.SDK_INT >= 33) {
                registerReceiver(locationReceiver, filter, 4)
                registerReceiver(statusReceiver, statusFilter, 4)
            } else {
                @Suppress("UnspecifiedRegisterReceiverFlag")
                registerReceiver(locationReceiver, filter)
                @Suppress("UnspecifiedRegisterReceiverFlag")
                registerReceiver(statusReceiver, statusFilter)
            }
            receiverRegistered = true
        } catch (t: Throwable) {
            t.printStackTrace()
        }
    }

    private fun criarWidgetView(): View {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xE60F172A.toInt())
            setPadding(32, 24, 32, 24)
            elevation = 16f
        }

        // Header row
        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val badgeTv = TextView(this).apply {
            text = "ðŸšš ENTREGADOR"
            setTextColor(0xFF22C55E.toInt())
            textSize = 11f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        val closeTv = TextView(this).apply {
            text = " âœ• "
            setTextColor(0xFF94A3B8.toInt())
            textSize = 14f
            setPadding(8, 4, 8, 4)
            setOnClickListener {
                try { stopSelf() } catch (t: Throwable) {}
            }
        }
        headerRow.addView(badgeTv)
        headerRow.addView(closeTv)

        val statusTv = TextView(this).apply {
            text = "ðŸŸ¡ AGUARDANDO"
            setTextColor(0xFFF59E0B.toInt())
            textSize = 12f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            setPadding(0, 10, 0, 0)
        }

        val kmRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 6, 0, 0)
        }
        val kmTv = TextView(this).apply {
            text = "0.0 km"
            setTextColor(0xFF3B82F6.toInt())
            textSize = 18f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        val costTv = TextView(this).apply {
            text = " (R$ 0,00)"
            setTextColor(0xFFEF4444.toInt())
            textSize = 14f
            gravity = Gravity.CENTER_VERTICAL
        }
        kmRow.addView(kmTv)
        kmRow.addView(costTv)

        val summaryTv = TextView(this).apply {
            text = "Hoje: R$ 0,00 | 0,0 km"
            setTextColor(0xFF94A3B8.toInt())
            textSize = 11f
            setPadding(0, 10, 0, 0)
        }

        root.addView(headerRow)
        root.addView(statusTv)
        root.addView(kmRow)
        root.addView(summaryTv)
        val pauseBtn = TextView(this).apply {
            text = "⏸️ Pausar GPS"
            setTextColor(0xFFE2E8F0.toInt())
            textSize = 12f
            setPadding(0, 16, 0, 0)
            setOnClickListener {
                isPaused = !isPaused
                text = if (isPaused) "▶️ Retomar GPS" else "⏸️ Pausar GPS"
                setTextColor(if (isPaused) 0xFFF59E0B.toInt() else 0xFFE2E8F0.toInt())
            }
        }
        btnPause = pauseBtn
        root.addView(pauseBtn)

        txtAppBadge     = badgeTv
        txtStatus       = statusTv
        txtTripKm       = kmTv
        txtCostEstimate = costTv
        txtDaySummary   = summaryTv

        root.setOnTouchListener { _, event ->
            try {
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        initialX = params?.x ?: 0; initialY = params?.y ?: 0
                        initialTouchX = event.rawX; initialTouchY = event.rawY; true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        params?.x = initialX + (event.rawX - initialTouchX).toInt()
                        params?.y = initialY + (event.rawY - initialTouchY).toInt()
                        floatingView?.let { windowManager?.updateViewLayout(it, params) }
                        true
                    }
                    else -> false
                }
            } catch (t: Throwable) {
                false
            }
        }
        return root
    }

    private fun inicializarLayoutView() {
        val view = criarWidgetView()
        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

        val p = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        ).apply { gravity = Gravity.TOP or Gravity.START; x = 16; y = 200 }

        try {
            windowManager?.addView(view, p)
            floatingView = view
            params = p
            atualizarResumoHoje()
        } catch (t: Throwable) {
            t.printStackTrace()
            floatingView = null
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        tentarInicializarWidget()

        intent?.let {
            try {
                val app   = it.getStringExtra("app_name") ?: return@let
                val state = it.getStringExtra("state") ?: "IDLE"
                txtAppBadge?.text = "ðŸšš $app"
                when (state) {
                    "IN_TRIP"  -> { txtStatus?.text = "ðŸŸ¢ EM CORRIDA";     txtStatus?.setTextColor(0xFF22C55E.toInt()) }
                    "FINISHED" -> { txtStatus?.text = "âœ… ENTREGA FEITA";  txtStatus?.setTextColor(0xFF3B82F6.toInt()); atualizarResumoHoje() }
                    else       -> { txtStatus?.text = "ðŸŸ¡ AGUARDANDO";     txtStatus?.setTextColor(0xFFF59E0B.toInt()) }
                }
            } catch (t: Throwable) {
                t.printStackTrace()
            }
        }
        return START_STICKY
    }

    private fun atualizarKmEmCorrida(km: Double) {
        try {
            val repo = DataRepository.getInstance(this)
            val cost = if (repo.getKmPerLiterEstimate() > 0) (km / repo.getKmPerLiterEstimate()) * repo.getFuelPrice() else 0.0
            txtTripKm?.text       = String.format(Locale.getDefault(), "%.1f km", km)
            txtCostEstimate?.text = String.format(Locale.getDefault(), " (R\$ %.2f)", cost)
        } catch (t: Throwable) {
            t.printStackTrace()
        }
    }

    private fun atualizarResumoHoje() {
        try {
            txtDaySummary?.text = DataRepository.getInstance(this).getResumoHojeFormatado()
        } catch (t: Throwable) {
            t.printStackTrace()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (receiverRegistered) {
            try { unregisterReceiver(locationReceiver)
            try { unregisterReceiver(statusReceiver) } catch (t: Throwable) {} } catch (t: Throwable) {}
        }
        try {
            floatingView?.let { windowManager?.removeView(it) }
        } catch (t: Throwable) {}
    }

    override fun onBind(intent: Intent?): IBinder? = null
}

