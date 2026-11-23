package com.maumm.maummd;

import android.app.Activity;
import android.widget.Toast;
import android.webkit.JavascriptInterface;
import android.print.PrintManager;
import android.print.PrintDocumentAdapter;
import android.print.PrintAttributes;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.window.OnBackInvokedDispatcher;

import androidx.webkit.WebViewAssetLoader;

/**
 * 마음엠디 화면(assets/index.html)을 안전한 https 주소로 열어 줍니다.
 * 상담 기록은 Firebase(서울)에 저장되며, 이 앱은 화면만 담고 있습니다.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#F5F2EC"));
        setContentView(webView);

        webView.setOnApplyWindowInsetsListener((View v, WindowInsets insets) -> {
            int top, bottom;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                top = bars.top; bottom = bars.bottom;
            } else {
                top = insets.getSystemWindowInsetTop(); bottom = insets.getSystemWindowInsetBottom();
            }
            v.setPadding(0, top, 0, bottom);
            return insets;
        });

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .setDomain(HOST)
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                return true;
            }
        });

        webView.addJavascriptInterface(new DocBridge(), "NativeDoc");

        if (savedInstanceState != null) webView.restoreState(savedInstanceState);
        else webView.loadUrl("https://" + HOST + "/assets/index.html");

        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
    }

    /** 화면(JavaScript)의 문서를 안드로이드 인쇄 화면으로 엽니다. 'PDF로 저장'을 고르면 PDF가 되고, 저장한 PDF를 공유할 수 있습니다. */
    private WebView printView; // 인쇄가 끝날 때까지 붙잡아 둡니다
    private class DocBridge {
        @JavascriptInterface
        public void printHtml(String title, String html) {
            runOnUiThread(() -> {
                final String jobName = (title == null || title.isEmpty()) ? "document" : title;
                WebView pv = new WebView(MainActivity.this);
                pv.getSettings().setJavaScriptEnabled(false);
                pv.setWebViewClient(new WebViewClient() {
                    private boolean started = false;
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        if (started) return;
                        started = true;
                        try {
                            PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                            PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(jobName);
                            PrintAttributes attrs = new PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                .build();
                            pm.print(jobName, adapter, attrs);
                        } catch (Exception e) {
                            Toast.makeText(MainActivity.this, "인쇄 화면을 열 수 없어요", Toast.LENGTH_SHORT).show();
                        }
                    }
                });
                printView = pv;
                pv.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            });
        }
    }

    private void handleBack() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else finish();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() { handleBack(); }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
    }
}
