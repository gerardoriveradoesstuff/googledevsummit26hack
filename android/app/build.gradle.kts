plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.distribuidora.pedidos"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "com.distribuidora.pedidos"
        minSdk = 26
        targetSdk = 37
        versionCode = 13
        versionName = "1.12"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            optimization {
                enable = false
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
    }
}

androidComponents {
    onVariants(selector().all()) { variant ->
        variant.outputs.forEach { output ->
            output.outputFileName.set("Distribuidora.apk")
        }
    }
}

val apkDir = rootProject.layout.projectDirectory.dir("../apk")

tasks.register<Copy>("copyDebugApk") {
    from(layout.buildDirectory.dir("outputs/apk/debug"))
    include("Distribuidora.apk")
    into(apkDir)
    duplicatesStrategy = DuplicatesStrategy.INCLUDE
}

afterEvaluate {
    tasks.named("assembleDebug") {
        finalizedBy("copyDebugApk")
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_11)
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.2")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation(platform("androidx.compose:compose-bom:2026.06.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.animation:animation")
    testImplementation("junit:junit:4.13.2")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
