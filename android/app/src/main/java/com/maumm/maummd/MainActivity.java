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
        ReminderReceiver.ensureChannel(this);
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

        // <input type="file"> 를 누르면 파일 · 사진 고르기 (카메라로 바로 찍기 포함)
        webView.setWebChromeClient(new android.webkit.WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, android.webkit.ValueCallback<Uri[]> callback, FileChooserParams params) {
                return openChooser(callback, params);
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

        /** 알림 예약: 화면(JavaScript)이 앞으로 35일 동안의 알림 목록을 넘겨주면 휴대폰 알림으로 맡겨요. */
        @android.webkit.JavascriptInterface
        public void setReminders(String json) {
            ReminderReceiver.schedule(getApplicationContext(), json == null ? "[]" : json);
            try { if (new org.json.JSONArray(json).length() > 0) runOnUiThread(MainActivity.this::askNotifyPerm); } catch (Exception ignored) { }
        }
        @android.webkit.JavascriptInterface
        public void testNotification(String title, String body) { ReminderReceiver.show(getApplicationContext(), 7, title, body); }
        @android.webkit.JavascriptInterface
        public void askNotify() { runOnUiThread(MainActivity.this::askNotifyPerm); }
        /** 문자 · 카카오톡 · 이메일 · 다른 앱으로 바로 보내기 (글자). kind: sms | kakao | email | any */
        @android.webkit.JavascriptInterface
        public void sendTo(String kind, String name, String b64, String text, String subject, String address) {
            runOnUiThread(() -> {
                try {
                    Intent i;
                    if ("sms".equals(kind)) { i = new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:" + (address == null ? "" : address))); i.putExtra("sms_body", text); }
                    else if ("email".equals(kind)) { i = new Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:" + (address == null ? "" : address))); i.putExtra(Intent.EXTRA_SUBJECT, subject); i.putExtra(Intent.EXTRA_TEXT, text); }
                    else { i = new Intent(Intent.ACTION_SEND); i.setType("text/plain"); i.putExtra(Intent.EXTRA_TEXT, text); if (subject != null) i.putExtra(Intent.EXTRA_SUBJECT, subject); }
                    if ("kakao".equals(kind)) {
                        i.setPackage("com.kakao.talk");
                        try { startActivity(i); return; } catch (android.content.ActivityNotFoundException e) {
                            android.widget.Toast.makeText(MainActivity.this, "카카오톡이 설치되어 있지 않아요 — 다른 앱을 골라 주세요", android.widget.Toast.LENGTH_SHORT).show(); i.setPackage(null); }
                    }
                    if ("sms".equals(kind) || "email".equals(kind)) { try { startActivity(i); return; } catch (android.content.ActivityNotFoundException e) { i = new Intent(Intent.ACTION_SEND); i.setType("text/plain"); i.putExtra(Intent.EXTRA_TEXT, text); } }
                    startActivity(Intent.createChooser(i, "보내기"));
                } catch (Exception e) {
                    android.widget.Toast.makeText(MainActivity.this, "보내지 못했어요", android.widget.Toast.LENGTH_SHORT).show();
                }
            });
        }

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

    // ---------- 알림 권한 ----------
    private boolean askedNotify = false;
    private void askNotifyPerm() {
        if (askedNotify) return;
        askedNotify = true;
        if (android.os.Build.VERSION.SDK_INT >= 33
            && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{ android.Manifest.permission.POST_NOTIFICATIONS }, 2001);
        }
    }

    // ---------- 파일 · 사진 고르기 (카메라로 바로 찍기 포함) ----------
    private static final int REQ_CHOOSE = 4101;
    private android.webkit.ValueCallback<Uri[]> chooseCb;
    private Uri cameraUri;
    private boolean openChooser(android.webkit.ValueCallback<Uri[]> callback, android.webkit.WebChromeClient.FileChooserParams params) {
        if (chooseCb != null) chooseCb.onReceiveValue(null);
        chooseCb = callback; cameraUri = null;
        String[] acc = params != null ? params.getAcceptTypes() : null;
        boolean imageOnly = acc != null && acc.length > 0;
        if (acc != null) for (String a : acc) if (a == null || !a.startsWith("image")) imageOnly = false;
        Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType(imageOnly ? "image/*" : "*/*");
        Intent chooser = Intent.createChooser(pick, "파일 · 사진 선택");
        try {
            java.io.File dir = new java.io.File(getCacheDir(), "camera");
            dir.mkdirs();
            java.io.File f = new java.io.File(dir, "scan_" + System.currentTimeMillis() + ".jpg");
            cameraUri = androidx.core.content.FileProvider.getUriForFile(this, getPackageName() + ".files", f);
            Intent cam = new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);
            cam.putExtra(android.provider.MediaStore.EXTRA_OUTPUT, cameraUri);
            cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            if (params != null && params.isCaptureEnabled()) {
                try { startActivityForResult(cam, REQ_CHOOSE); return true; } catch (Exception e) { /* 카메라 앱이 없으면 고르기 화면으로 */ }
            }
            chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{ cam });
        } catch (Exception e) { cameraUri = null; }
        try { startActivityForResult(chooser, REQ_CHOOSE); } catch (Exception e) { chooseCb = null; return false; }
        return true;
    }
    private void chooserResult(int resultCode, Intent data) {
        if (chooseCb == null) return;
        Uri[] r = null;
        if (resultCode == RESULT_OK) {
            if (data != null && data.getData() != null) r = new Uri[]{ data.getData() };
            else if (cameraUri != null) r = new Uri[]{ cameraUri };
        }
        chooseCb.onReceiveValue(r);
        chooseCb = null; cameraUri = null;
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_CHOOSE) chooserResult(resultCode, data);
    }
}
