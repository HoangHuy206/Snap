package app.vidqr.studio;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.OvershootInterpolator;
import android.webkit.WebSettings;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static boolean hasPlayedIntro = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(VidQRMediaPlugin.class);
        super.onCreate(savedInstanceState);

        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebSettings webSettings = this.bridge.getWebView().getSettings();
            webSettings.setSupportZoom(false);
            webSettings.setBuiltInZoomControls(false);
            webSettings.setDisplayZoomControls(false);
        }

        if (savedInstanceState == null && !hasPlayedIntro) {
            hasPlayedIntro = true;
            showAppIntroOverlay();
        }
    }

    private void showAppIntroOverlay() {
        final ViewGroup root = findViewById(android.R.id.content);
        if (root == null) return;

        final FrameLayout overlay = new FrameLayout(this);
        overlay.setClickable(true);
        overlay.setFocusable(true);
        overlay.setElevation(dp(40));

        GradientDrawable bg = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[]{
                        Color.parseColor("#070B14"),
                        Color.parseColor("#11182D"),
                        Color.parseColor("#0A0E1A")
                }
        );
        overlay.setBackground(bg);

        final View glowView = new View(this);
        GradientDrawable glowDrawable = new GradientDrawable();
        glowDrawable.setShape(GradientDrawable.OVAL);
        glowDrawable.setGradientType(GradientDrawable.RADIAL_GRADIENT);
        glowDrawable.setGradientRadius(dp(120));
        glowDrawable.setColors(new int[]{
                Color.argb(105, 99, 102, 241),
                Color.argb(40, 6, 182, 212),
                Color.TRANSPARENT
        });
        glowView.setBackground(glowDrawable);
        glowView.setAlpha(0f);
        FrameLayout.LayoutParams glowLp = new FrameLayout.LayoutParams(dp(240), dp(240));
        glowLp.gravity = Gravity.CENTER;
        glowLp.bottomMargin = dp(40);
        overlay.addView(glowView, glowLp);

        LinearLayout centerStack = new LinearLayout(this);
        centerStack.setOrientation(LinearLayout.VERTICAL);
        centerStack.setGravity(Gravity.CENTER_HORIZONTAL);
        FrameLayout.LayoutParams stackLp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        stackLp.gravity = Gravity.CENTER;
        stackLp.bottomMargin = dp(12);

        final QrEmblemView emblem = new QrEmblemView(this);
        emblem.setAlpha(0f);
        emblem.setScaleX(0.68f);
        emblem.setScaleY(0.68f);
        LinearLayout.LayoutParams emblemLp = new LinearLayout.LayoutParams(dp(104), dp(104));
        centerStack.addView(emblem, emblemLp);

        final TextView titleView = new TextView(this);
        titleView.setText("VidQR Studio");
        titleView.setTextColor(Color.WHITE);
        titleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 27);
        titleView.setTypeface(Typeface.DEFAULT_BOLD);
        titleView.setGravity(Gravity.CENTER);
        titleView.setAlpha(0f);
        titleView.setTranslationY(dp(16));
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        titleLp.topMargin = dp(20);
        centerStack.addView(titleView, titleLp);

        final TextView subtitleView = new TextView(this);
        subtitleView.setText("QR Video & File Động • Tải MXH Không Logo");
        subtitleView.setTextColor(Color.parseColor("#94A3B8"));
        subtitleView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        subtitleView.setGravity(Gravity.CENTER);
        subtitleView.setAlpha(0f);
        subtitleView.setTranslationY(dp(14));
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        subLp.topMargin = dp(6);
        centerStack.addView(subtitleView, subLp);

        final FrameLayout track = new FrameLayout(this);
        GradientDrawable trackBg = new GradientDrawable();
        trackBg.setColor(Color.argb(28, 255, 255, 255));
        trackBg.setCornerRadius(dp(3));
        track.setBackground(trackBg);
        track.setAlpha(0f);
        LinearLayout.LayoutParams trackLp = new LinearLayout.LayoutParams(dp(148), dp(5));
        trackLp.topMargin = dp(22);
        centerStack.addView(track, trackLp);

        final View fillBar = new View(this);
        GradientDrawable fillBg = new GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                new int[]{Color.parseColor("#6366F1"), Color.parseColor("#06B6D4")}
        );
        fillBg.setCornerRadius(dp(3));
        fillBar.setBackground(fillBg);
        fillBar.setPivotX(0f);
        fillBar.setScaleX(0f);
        track.addView(fillBar, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        overlay.addView(centerStack, stackLp);
        root.addView(overlay, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        emblem.animate()
                .alpha(1f)
                .scaleX(1f)
                .scaleY(1f)
                .setStartDelay(50)
                .setDuration(600)
                .setInterpolator(new OvershootInterpolator(1.25f))
                .start();

        glowView.animate()
                .alpha(1f)
                .scaleX(1.15f)
                .scaleY(1.15f)
                .setStartDelay(100)
                .setDuration(750)
                .setInterpolator(new DecelerateInterpolator())
                .start();

        titleView.animate()
                .alpha(1f)
                .translationY(0f)
                .setStartDelay(280)
                .setDuration(520)
                .setInterpolator(new DecelerateInterpolator())
                .start();

        subtitleView.animate()
                .alpha(1f)
                .translationY(0f)
                .setStartDelay(420)
                .setDuration(520)
                .setInterpolator(new DecelerateInterpolator())
                .start();

        track.animate()
                .alpha(1f)
                .setStartDelay(420)
                .setDuration(420)
                .start();

        ObjectAnimator progressAnim = ObjectAnimator.ofFloat(fillBar, View.SCALE_X, 0f, 1f);
        progressAnim.setStartDelay(480);
        progressAnim.setDuration(1250);
        progressAnim.setInterpolator(new AccelerateDecelerateInterpolator());
        progressAnim.start();

        emblem.startLaserScan();

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            emblem.stopLaserScan();
            overlay.animate()
                    .alpha(0f)
                    .scaleX(1.06f)
                    .scaleY(1.06f)
                    .setDuration(420)
                    .setInterpolator(new AccelerateDecelerateInterpolator())
                    .setListener(new AnimatorListenerAdapter() {
                        @Override
                        public void onAnimationEnd(Animator animation) {
                            root.removeView(overlay);
                        }
                    })
                    .start();
        }, 1950);
    }

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                value,
                getResources().getDisplayMetrics()
        ));
    }

    private static final class QrEmblemView extends View {
        private final Paint cardPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint qrPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint centerBadgePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint playPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint laserPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF workRect = new RectF();
        private final Path playPath = new Path();
        private float scanFraction = 0f;
        private ValueAnimator laserAnimator;

        QrEmblemView(Context context) {
            super(context);
            cardPaint.setColor(Color.parseColor("#151D36"));
            borderPaint.setStyle(Paint.Style.STROKE);
            borderPaint.setStrokeWidth(dpf(2.4f));
            qrPaint.setColor(Color.argb(235, 255, 255, 255));
            playPaint.setColor(Color.WHITE);
        }

        void startLaserScan() {
            laserAnimator = ValueAnimator.ofFloat(0f, 1f);
            laserAnimator.setDuration(720);
            laserAnimator.setRepeatMode(ValueAnimator.REVERSE);
            laserAnimator.setRepeatCount(3);
            laserAnimator.setInterpolator(new AccelerateDecelerateInterpolator());
            laserAnimator.addUpdateListener(anim -> {
                scanFraction = (float) anim.getAnimatedValue();
                invalidate();
            });
            laserAnimator.start();
        }

        void stopLaserScan() {
            if (laserAnimator != null) {
                laserAnimator.cancel();
            }
        }

        @Override
        protected void onSizeChanged(int w, int h, int oldw, int oldh) {
            super.onSizeChanged(w, h, oldw, oldh);
            borderPaint.setShader(new LinearGradient(
                    0, 0, w, h,
                    Color.parseColor("#7E86FC"),
                    Color.parseColor("#06B6D4"),
                    Shader.TileMode.CLAMP
            ));
            centerBadgePaint.setShader(new LinearGradient(
                    w * 0.35f, h * 0.35f, w * 0.65f, h * 0.65f,
                    Color.parseColor("#6366F1"),
                    Color.parseColor("#06B6D4"),
                    Shader.TileMode.CLAMP
            ));
            laserPaint.setShader(new LinearGradient(
                    dpf(10), 0, w - dpf(10), 0,
                    new int[]{Color.TRANSPARENT, Color.parseColor("#22D3EE"), Color.TRANSPARENT},
                    new float[]{0f, 0.5f, 1f},
                    Shader.TileMode.CLAMP
            ));
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            float w = getWidth();
            float h = getHeight();
            float radius = dpf(24);

            workRect.set(dpf(2), dpf(2), w - dpf(2), h - dpf(2));
            canvas.drawRoundRect(workRect, radius, radius, cardPaint);
            canvas.drawRoundRect(workRect, radius, radius, borderPaint);

            float pad = w * 0.19f;
            float box = w * 0.21f;
            drawFinder(canvas, pad, pad, box);
            drawFinder(canvas, w - pad - box, pad, box);
            drawFinder(canvas, pad, h - pad - box, box);

            float dot = w * 0.075f;
            float brStart = w - pad - box;
            drawCell(canvas, brStart, brStart, dot);
            drawCell(canvas, brStart + dot * 1.45f, brStart, dot);
            drawCell(canvas, brStart, brStart + dot * 1.45f, dot);
            drawCell(canvas, brStart + dot * 1.45f, brStart + dot * 1.45f, dot);

            float badgeSize = w * 0.25f;
            float cx = w / 2f;
            float cy = h / 2f;
            workRect.set(cx - badgeSize / 2f, cy - badgeSize / 2f, cx + badgeSize / 2f, cy + badgeSize / 2f);
            canvas.drawRoundRect(workRect, dpf(8), dpf(8), centerBadgePaint);

            playPath.reset();
            playPath.moveTo(cx - badgeSize * 0.14f, cy - badgeSize * 0.22f);
            playPath.lineTo(cx + badgeSize * 0.24f, cy);
            playPath.lineTo(cx - badgeSize * 0.14f, cy + badgeSize * 0.22f);
            playPath.close();
            canvas.drawPath(playPath, playPaint);

            float scanY = pad + (h - pad * 2f) * scanFraction;
            workRect.set(dpf(10), scanY - dpf(2), w - dpf(10), scanY + dpf(2));
            canvas.drawRoundRect(workRect, dpf(2), dpf(2), laserPaint);
        }

        private void drawFinder(Canvas canvas, float x, float y, float size) {
            qrPaint.setStyle(Paint.Style.STROKE);
            qrPaint.setStrokeWidth(dpf(3.2f));
            workRect.set(x, y, x + size, y + size);
            canvas.drawRoundRect(workRect, dpf(4.5f), dpf(4.5f), qrPaint);

            qrPaint.setStyle(Paint.Style.FILL);
            float inset = size * 0.30f;
            workRect.set(x + inset, y + inset, x + size - inset, y + size - inset);
            canvas.drawRoundRect(workRect, dpf(1.5f), dpf(1.5f), qrPaint);
        }

        private void drawCell(Canvas canvas, float x, float y, float size) {
            qrPaint.setStyle(Paint.Style.FILL);
            workRect.set(x, y, x + size, y + size);
            canvas.drawRoundRect(workRect, dpf(2f), dpf(2f), qrPaint);
        }

        private float dpf(float value) {
            return TypedValue.applyDimension(
                    TypedValue.COMPLEX_UNIT_DIP,
                    value,
                    getResources().getDisplayMetrics()
            );
        }
    }
}
