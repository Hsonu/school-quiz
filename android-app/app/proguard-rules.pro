# ProGuard rules for QUIZGEN
# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView related classes
-keepattributes JavascriptInterface
-keepattributes *Annotation*

# Keep Material Design classes
-keep class com.google.android.material.** { *; }
-dontwarn com.google.android.material.**

# Keep AndroidX classes
-keep class androidx.** { *; }
-dontwarn androidx.**

# Don't obfuscate for debugging purposes
-keepattributes SourceFile,LineNumberTable
