/* =====================================================================
   MainActivity — میزبانِ اندرویدیِ «سامانه تعیین ساختار»
   ---------------------------------------------------------------------
   کلِ برنامه همان اپلیکیشن وب است. این کلاس فقط کارهایی را انجام می‌دهد
   که وب به‌تنهایی در وب‌ویو از آن‌ها محروم است:

     ۱) سِروِ فایل‌ها از assets روی مبدأِ امنِ https — نه file://.
        دلیلش localStorage است: روی مبدأِ file:// وب‌ویو حافظهٔ محلی را
        ناپایدار و در بعضی دستگاه‌ها خاموش می‌کند، و کارِ ذخیره‌شدهٔ
        کاربر (session.js و practice.js) از بین می‌رود.
     ۲) رساندنِ حاشیه‌های ایمن (بریدگی، نوار وضعیت، نوار حرکتی، کیبورد)
        به CSS. اندروید env(safe-area-inset-*) را پر نمی‌کند — این کار
        فقط در سافاری و PWAی کروم خودکار است — پس مقادیر را به‌شکل
        متغیرهای CSS تزریق می‌کنیم.
     ۳) دکمهٔ بازگشتِ اندروید: به فازِ قبلی برمی‌گردد، نه بیرون از برنامه.
        تاریخچهٔ فازها را switchPhase در js/app.js می‌سازد.
     ۴) علامت‌گذاریِ صفحه با کلاسِ is-android-app، تا CSS بتواند چیزهایی
        که فقط روی دسکتاپ معنا دارند (مثل چاپِ گزارش) را پنهان کند.
   ===================================================================== */
package ir.spectra.structure;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.ComponentActivity;
import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewFeature;

public class MainActivity extends ComponentActivity {

    /** میزبانِ رزروشدهٔ اندروید برای دارایی‌های محلی — به شبکه نمی‌رود. */
    private static final String APP_HOST  = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + APP_HOST + "/assets/www/index.html";

    /** هم‌رنگِ --bg-0 در css/styles.css تا هنگام بارگذاری سفیدی نزند. */
    private static final int BG_COLOR = Color.parseColor("#0b0f1f");

    private WebView web;

    /** حاشیه‌های ایمن، بر حسب dp (که در وب‌ویو با CSS px یکی است). */
    private int safeTop, safeRight, safeBottom, safeLeft;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        web.setBackgroundColor(BG_COLOR);
        web.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(web);

        configureWebView();
        wireInsets();
        wireBackButton();

        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) {
            web.loadUrl(START_URL);
        }
    }

    /* ------------------------------------------------------------------
       پیکربندی وب‌ویو
       ------------------------------------------------------------------ */
    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage — کارِ ذخیره‌شده

        // برنامه آفلاین است و هیچ فایلی از بیرونِ APK نمی‌خواند.
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setGeolocationEnabled(false);
        s.setMediaPlaybackRequiresUserGesture(true);

        // <meta viewport> صفحه محترم شمرده شود؛ بزرگ‌نمایی برای وارسیِ
        // طیف‌ها باز بماند ولی دکمه‌های زوم روی صفحه نیایند.
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);

        /* دارایی‌ها از داخل APK می‌آیند و shouldInterceptRequest همیشه
           تازه‌ترین نسخه را می‌دهد. کَشِ HTTP فقط باعث می‌شود بعد از
           به‌روزرسانیِ برنامه، JS کهنه سرو شود — همان دامی که serve.py
           هم با no-store از آن پرهیز می‌کند. */
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);

        /* برنامه از پیش تیره است و color-scheme:dark اعلام کرده؛ تیره‌سازیِ
           الگوریتمیِ وب‌ویو رویش دوباره تیره می‌زند و کنتراست را می‌کُشد. */
        if (WebViewFeature.isFeatureSupported(WebViewFeature.ALGORITHMIC_DARKENING)) {
            WebSettingsCompat.setAlgorithmicDarkeningAllowed(s, false);
        }

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(APP_HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view,
                                                             WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            /* برنامه پیوندِ بیرونی ندارد، ولی اگر روزی اضافه شد نباید
               داخلِ پوستهٔ برنامه باز شود. */
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (APP_HOST.equals(uri.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (ActivityNotFoundException ignored) {
                    return false;
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                markAsAndroidApp();
                pushInsetsToPage();
            }
        });
    }

    /** به صفحه می‌گوید داخلِ برنامهٔ اندرویدی اجرا می‌شود. */
    private void markAsAndroidApp() {
        web.evaluateJavascript(
                "document.documentElement.classList.add('is-android-app');", null);
    }

    /* ------------------------------------------------------------------
       حاشیه‌های ایمن  ->  متغیرهای CSS
       ------------------------------------------------------------------ */
    private void wireInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(web, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());

            float density = getResources().getDisplayMetrics().density;
            safeTop    = Math.round(bars.top / density);
            safeLeft   = Math.round(bars.left / density);
            safeRight  = Math.round(bars.right / density);
            // کیبورد که باز است، باید بیشترِ این دو را در نظر گرفت تا
            // فیلدِ فعال زیرِ کیبورد نماند.
            safeBottom = Math.round(Math.max(bars.bottom, ime.bottom) / density);

            pushInsetsToPage();
            return windowInsets;
        });
    }

    private void pushInsetsToPage() {
        if (web == null) return;
        String js = "(function(){var s=document.documentElement.style;"
                + "s.setProperty('--safe-top','"    + safeTop    + "px');"
                + "s.setProperty('--safe-right','"  + safeRight  + "px');"
                + "s.setProperty('--safe-bottom','" + safeBottom + "px');"
                + "s.setProperty('--safe-left','"   + safeLeft   + "px');})();";
        web.evaluateJavascript(js, null);
    }

    /* ------------------------------------------------------------------
       دکمهٔ بازگشت
       ------------------------------------------------------------------ */
    private void wireBackButton() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (web.canGoBack()) {
                    web.goBack();
                    return;
                }
                // در فازِ نخست: رفتارِ عادیِ اندروید (خروج از برنامه).
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
            }
        });
    }

    /* ------------------------------------------------------------------
       چرخهٔ عمر
       ------------------------------------------------------------------ */
    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
