package com.quizgen.app;

import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.view.animation.AnimationSet;
import android.view.animation.TranslateAnimation;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class NoInternetActivity extends AppCompatActivity {

    private ConnectivityManager.NetworkCallback autoRetryCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Status bar styling
        Window window = getWindow();
        window.setStatusBarColor(getColor(R.color.surface));
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(true);

        setContentView(R.layout.activity_no_internet);

        // Animate elements
        ImageView icon = findViewById(R.id.noInternetIcon);
        TextView title = findViewById(R.id.noInternetTitle);
        TextView subtitle = findViewById(R.id.noInternetSubtitle);
        Button retryBtn = findViewById(R.id.retryButton);

        // Bounce-in animation for icon
        AnimationSet iconAnim = new AnimationSet(true);
        TranslateAnimation slide = new TranslateAnimation(
                Animation.RELATIVE_TO_SELF, 0,
                Animation.RELATIVE_TO_SELF, 0,
                Animation.RELATIVE_TO_SELF, -0.3f,
                Animation.RELATIVE_TO_SELF, 0);
        slide.setDuration(600);
        AlphaAnimation fade = new AlphaAnimation(0f, 1f);
        fade.setDuration(600);
        iconAnim.addAnimation(slide);
        iconAnim.addAnimation(fade);
        icon.startAnimation(iconAnim);

        // Fade in text
        AlphaAnimation titleFade = new AlphaAnimation(0f, 1f);
        titleFade.setDuration(500);
        titleFade.setStartOffset(300);
        titleFade.setFillAfter(true);
        title.setAlpha(0f);
        title.startAnimation(titleFade);

        AlphaAnimation subFade = new AlphaAnimation(0f, 1f);
        subFade.setDuration(500);
        subFade.setStartOffset(500);
        subFade.setFillAfter(true);
        subtitle.setAlpha(0f);
        subtitle.startAnimation(subFade);

        AlphaAnimation btnFade = new AlphaAnimation(0f, 1f);
        btnFade.setDuration(500);
        btnFade.setStartOffset(700);
        btnFade.setFillAfter(true);
        retryBtn.setAlpha(0f);
        retryBtn.startAnimation(btnFade);

        // Retry button
        retryBtn.setOnClickListener(v -> {
            if (isNetworkAvailable()) {
                navigateToMain();
            } else {
                // Shake animation on retry button
                TranslateAnimation shake = new TranslateAnimation(0, 10, 0, 0);
                shake.setDuration(50);
                shake.setRepeatMode(Animation.REVERSE);
                shake.setRepeatCount(5);
                retryBtn.startAnimation(shake);
            }
        });

        // Auto-retry when network becomes available
        setupAutoRetry();
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm == null) return false;

        Network network = cm.getActiveNetwork();
        if (network == null) return false;

        NetworkCapabilities caps = cm.getNetworkCapabilities(network);
        return caps != null && (
                caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        );
    }

    private void setupAutoRetry() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm == null) return;

        autoRetryCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(@NonNull Network network) {
                runOnUiThread(() -> navigateToMain());
            }
        };

        NetworkRequest request = new NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();
        cm.registerNetworkCallback(request, autoRetryCallback);
    }

    private void navigateToMain() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(intent);
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
        finish();
    }

    @Override
    protected void onDestroy() {
        if (autoRetryCallback != null) {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            if (cm != null) {
                cm.unregisterNetworkCallback(autoRetryCallback);
            }
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        // Exit app on back from no internet screen
        finishAffinity();
    }
}
