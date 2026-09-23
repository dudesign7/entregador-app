package com.entregador.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView

class MainActivity : Activity() {

    private var webView: WebView? = null
    private var showingDialog = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        inicializarUI()
    }

    private fun inicializarUI() {
        try {
            val wv = WebView(this)
            configurarWebView(wv)
            setContentView(wv)
            webView = wv
            wv.loadUrl("file:///android_asset/index.html")
        } catch (e: Exception) {
            e.printStackTrace()
            // Fallback layout if WebView initialization fails on custom Android ROMs
            val fallbackLayout = FrameLayout(this).apply {
                setBackgroundColor(0xFF0F172A.toInt())
            }
            val tv = TextView(this).apply {
                text = "🚚 Entregador\n\nWebView indisponivel no sistema. Atualize o componente WebView na Play Store."
                setTextColor(0xFFF1F5F9.toInt())
                textSize = 16f
                setPadding(40, 100, 40, 40)
            }
            fallbackLayout.addView(tv)
            setContentView(fallbackLayout)
        }
    }

    override fun onResume() {
        super.onResume()
        if (!showingDialog) {
            verificarProximaPermissao()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configurarWebView(wv: WebView) {
        wv.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            javaScriptCanOpenWindowsAutomatically = true
            setSupportZoom(false)
        }

        wv.addJavascriptInterface(WebAppInterface(this), "AndroidNative")

        wv.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean = false

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                try {
                    val repo = DataRepository.getInstance(this@MainActivity)
                    val json = repo.getJsonString()
                        .replace("\\", "\\\\")
                        .replace("'", "\\'")
                        .replace("\n", "\\n")
                        .replace("\r", "")
                    view?.evaluateJavascript(
                        "(function(){ try { localStorage.setItem('entregador_v3', '$json'); if(typeof DB !== 'undefined'){ DB.load(); renderPage(STATE.page); } } catch(e){} })();",
                        null
                    )
                } catch (e: Exception) { e.printStackTrace() }
            }
        }
    }

    private fun verificarProximaPermissao() {
        if (isFinishing || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1 && isDestroyed)) return

        // 1. GPS Permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ), 100)
                return
            }
        }

        // 2. Overlay Permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            showingDialog = true
            AlertDialog.Builder(this)
                .setTitle("Permissao de Overlay")
                .setMessage("Para exibir o Widget flutuante por cima do iFood/Uber, ative 'Aparecer na frente de outros apps'.")
                .setPositiveButton("Configurar") { _, _ ->
                    showingDialog = false
                    try {
                        startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
                    } catch (e: Exception) { e.printStackTrace() }
                }
                .setNegativeButton("Pular") { _, _ ->
                    showingDialog = false
                    verificarAcessibilidade()
                }
                .setOnDismissListener { showingDialog = false }
                .show()
            return
        } else {
            // Permission granted – start widget service safely
            try {
                startService(Intent(this, FloatingWidgetService::class.java))
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // 3. Accessibility Permission
        verificarAcessibilidade()
    }

    private fun verificarAcessibilidade() {
        if (isFinishing || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1 && isDestroyed)) return

        if (!isAccessibilityEnabled()) {
            showingDialog = true
            AlertDialog.Builder(this)
                .setTitle("Permissao de Acessibilidade")
                .setMessage("Para detectar corridas automaticamente no iFood, Uber, 99 e Lalamove, ative o 'Monitor de Entregas' em Acessibilidade.")
                .setPositiveButton("Configurar") { _, _ ->
                    showingDialog = false
                    try {
                        startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                    } catch (e: Exception) { e.printStackTrace() }
                }
                .setNegativeButton("Pular") { _, _ ->
                    showingDialog = false
                }
                .setOnDismissListener { showingDialog = false }
                .show()
        }
    }

    private fun isAccessibilityEnabled(): Boolean {
        return try {
            val expected = "$packageName/${EntregadorAccessibilityService::class.java.canonicalName}"
            val enabled  = Settings.Secure.getString(contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
            enabled?.contains(expected) == true
        } catch (e: Exception) { false }
    }

    class WebAppInterface(private val ctx: android.content.Context) {
        @JavascriptInterface
        fun updateNativeData(jsonStr: String) {
            try { DataRepository.getInstance(ctx).salvarJsonString(jsonStr) } catch (e: Exception) { e.printStackTrace() }
        }

        @JavascriptInterface
        fun setStatus(isAvailable: Boolean) {
            try {
                val prefs = ctx.getSharedPreferences("entregador_prefs", android.content.Context.MODE_PRIVATE)
                prefs.edit().putBoolean("is_available", isAvailable).apply()
                // Broadcast to update widget immediately
                val intent = Intent("com.entregador.STATUS_CHANGED")
                intent.putExtra("is_available", isAvailable)
                ctx.sendBroadcast(intent)
            } catch (e: Exception) { e.printStackTrace() }
        }
    }

    override fun onBackPressed() {
        val wv = webView
        if (wv != null && wv.canGoBack()) {
            wv.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
