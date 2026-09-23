package com.entregador.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView

class MainActivity : Activity() {

    private var webView: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        inicializarUI()
    }

    private fun inicializarUI() {
        try {
            val wv = WebView(this)
            configurarWebViewSafely(wv)
            setContentView(wv)
            webView = wv
            wv.loadUrl("file:///android_asset/index.html")
        } catch (e: Exception) {
            e.printStackTrace()
            val fallbackLayout = FrameLayout(this).apply {
                setBackgroundColor(0xFF0F172A.toInt())
            }
            val tv = TextView(this).apply {
                text = "Entregador\n\nErro ao inicializar interface. Por favor, reinicie o aplicativo."
                setTextColor(0xFFF1F5F9.toInt())
                textSize = 16f
                setPadding(40, 100, 40, 40)
            }
            fallbackLayout.addView(tv)
            setContentView(fallbackLayout)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configurarWebViewSafely(wv: WebView) {
        wv.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            
            allowFileAccess = false
            allowContentAccess = false
            javaScriptCanOpenWindowsAutomatically = false
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR0) {
                @Suppress("DEPRECATION")
                allowFileAccessFromFileURLs = false
                @Suppress("DEPRECATION")
                allowUniversalAccessFromFileURLs = false
            }
            
            setSupportZoom(false)
        }

        wv.addJavascriptInterface(WebAppInterface(this), "AndroidNative")

        wv.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return true
                return !url.startsWith("file:///android_asset/")
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                try {
                    val repo = DataRepository.getInstance(this@MainActivity)
                    val rawJson = repo.getJsonString()
                    
                    val safeJson = rawJson
                        .replace("\\", "\\\\")
                        .replace("'", "\\'")
                        .replace("\n", "\\n")
                        .replace("\r", "")

                    view?.evaluateJavascript(
                        "(function(){ try { localStorage.setItem('entregador_v4', '$safeJson'); if(typeof DB !== 'undefined'){ DB.load(); if(typeof renderPage !== 'undefined') renderPage(STATE.page); } } catch(e){ console.error(e); } })();",
                        null
                    )
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    class WebAppInterface(private val ctx: android.content.Context) {
        @JavascriptInterface
        fun updateNativeData(jsonStr: String) {
            try {
                if (jsonStr.isNotBlank() && jsonStr.startsWith("{")) {
                    DataRepository.getInstance(ctx).salvarJsonString(jsonStr)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        @JavascriptInterface
        fun setStatus(isAvailable: Boolean) {
            try {
                val prefs = ctx.getSharedPreferences("entregador_prefs", MODE_PRIVATE)
                prefs.edit().putBoolean("is_available", isAvailable).apply()
                
                val intent = Intent("com.entregador.STATUS_CHANGED").apply {
                    putExtra("is_available", isAvailable)
                }
                ctx.sendBroadcast(intent)
            } catch (e: Exception) {
                e.printStackTrace()
            }
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
