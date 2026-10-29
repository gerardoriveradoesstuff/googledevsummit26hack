plugins {
    id("com.android.application") version "9.3.1" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.3.10" apply false
    // KSP is required by the AppFunctions compiler (same version as github.com/android/appfunctions ChatApp sample)
    id("com.google.devtools.ksp") version "2.3.10" apply false
}
