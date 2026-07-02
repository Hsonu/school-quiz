# QUIZGEN Android App — Build Instructions

## Prerequisites

Before building, ensure you have the following installed:

1. **Java Development Kit (JDK) 17+**
   - Download: https://adoptium.net/
   - Verify: `java -version`

2. **Android Studio** (recommended) OR **Android SDK Command-Line Tools**
   - Download: https://developer.android.com/studio
   - Set `ANDROID_HOME` environment variable to SDK location

3. **Android SDK Components** (via Android Studio SDK Manager):
   - Android SDK Platform 34 (Android 14)
   - Android SDK Build-Tools 34.0.0
   - Android SDK Platform-Tools

---

## Step 1: Configure Server URL

Open `app/build.gradle` and change the `BASE_URL` to your deployed server:

```groovy
// Line 22 in app/build.gradle
buildConfigField "String", "BASE_URL", "\"https://your-deployed-server.com\""
```

### URL Examples:
| Environment | URL |
|---|---|
| **Production** | `"https://quizgen.yoursite.com"` |
| **Android Emulator (localhost)** | `"http://10.0.2.2:5050"` |
| **Real Device (same WiFi)** | `"http://192.168.x.x:5050"` |

> **Note:** For production, use HTTPS. The app's network security config blocks cleartext
> traffic by default except for localhost/emulator addresses.

---

## Step 2: Build Debug APK

### Using Command Line:
```bash
cd android-app
gradlew.bat assembleDebug
```

### Output Location:
```
android-app/app/build/outputs/apk/debug/app-debug.apk
```

---

## Step 3: Build Release APK

### 3a. Generate a Signing Keystore (one-time):
```bash
keytool -genkey -v -keystore quizgen-release.keystore -alias quizgen -keyalg RSA -keysize 2048 -validity 10000
```
Follow the prompts to set passwords and certificate details.

### 3b. Configure Signing in `app/build.gradle`:
Add inside the `android { }` block:
```groovy
signingConfigs {
    release {
        storeFile file('../quizgen-release.keystore')
        storePassword 'YOUR_STORE_PASSWORD'
        keyAlias 'quizgen'
        keyPassword 'YOUR_KEY_PASSWORD'
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### 3c. Build:
```bash
gradlew.bat assembleRelease
```

### Output Location:
```
android-app/app/build/outputs/apk/release/app-release.apk
```

---

## Step 4: Build Release AAB (for Google Play Store)

```bash
gradlew.bat bundleRelease
```

### Output Location:
```
android-app/app/build/outputs/bundle/release/app-release.aab
```

---

## Step 5: Install on Device

### Via ADB:
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Via File Transfer:
1. Copy the APK to your phone
2. Open the APK file on your phone
3. Allow "Install from Unknown Sources" if prompted
4. Install and open

---

## Open in Android Studio

1. Open Android Studio
2. Click **File → Open**
3. Navigate to `android-app/` folder
4. Click **OK**
5. Wait for Gradle sync to complete
6. Click **Run** (green play button)

---

## Android Permissions Used

| Permission | Why | When Requested |
|---|---|---|
| `INTERNET` | Connect to QUIZGEN server | Automatic |
| `ACCESS_NETWORK_STATE` | Check internet availability | Automatic |
| `CAMERA` | Capture photos for file uploads | When user clicks file input |
| `READ_EXTERNAL_STORAGE` | Access gallery (Android < 13) | When user uploads file |
| `READ_MEDIA_IMAGES` | Access gallery (Android 13+) | When user uploads file |
| `WRITE_EXTERNAL_STORAGE` | Save downloads (Android < 10) | When user downloads file |
| `DOWNLOAD_WITHOUT_NOTIFICATION` | Background file downloads | Automatic |

---

## Troubleshooting

### "Could not determine the dependencies of task ':app:compileDebugJavaWithJavac'"
→ Run `gradlew.bat --refresh-dependencies` to force refresh.

### WebView shows blank screen
→ Ensure your server is running and the BASE_URL is correct.
→ For emulator: use `http://10.0.2.2:PORT`

### Camera not working
→ Grant camera permission in device Settings → Apps → QUIZGEN → Permissions.

### Downloads not saving
→ Grant storage permission in device Settings → Apps → QUIZGEN → Permissions.

### App crashes on startup
→ Check `adb logcat -s QUIZGEN` for error logs.

---

## Project Structure

```
android-app/
├── app/
│   ├── build.gradle                          # App build config
│   ├── proguard-rules.pro                    # Code obfuscation rules
│   └── src/main/
│       ├── AndroidManifest.xml               # App manifest
│       ├── java/com/quizgen/app/
│       │   ├── MainActivity.java             # WebView + all features
│       │   ├── SplashActivity.java           # Splash screen
│       │   └── NoInternetActivity.java       # Offline screen
│       └── res/
│           ├── drawable/                     # Icons, backgrounds
│           ├── layout/                       # UI layouts
│           ├── mipmap-anydpi-v26/            # Adaptive app icon
│           ├── values/                       # Colors, strings, themes
│           └── xml/                          # Security, file paths
├── build.gradle                              # Root build config
├── settings.gradle                           # Project settings
├── gradle.properties                         # Gradle properties
└── gradlew.bat                               # Build script (Windows)
```
