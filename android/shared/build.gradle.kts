plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.nuvio.streaming.shared"
    compileSdk = libs.versions.compileSdk.get().toInt()

    defaultConfig {
        minSdk = libs.versions.minSdk.get().toInt()

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")

        // Configure NDK for Rust SDK native libraries
        ndk {
            abiFilters += listOf("arm64-v8a", "armeabi-v7a", "x86_64", "x86")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    // Configure JNI libraries directory for Rust SDK
    sourceSets {
        getByName("main") {
            jniLibs.srcDirs("src/main/jniLibs")
        }
    }
}

// Task to copy Rust SDK native libraries
tasks.register("copyRustLibs") {
    doLast {
        val rustSdkPath = file("../../rust-sdk/target")
        val jniLibsPath = file("src/main/jniLibs")

        // Architecture mappings: Rust target -> Android ABI
        val architectures = mapOf(
            "aarch64-linux-android" to "arm64-v8a",
            "armv7-linux-androideabi" to "armeabi-v7a",
            "x86_64-linux-android" to "x86_64",
            "i686-linux-android" to "x86"
        )

        architectures.forEach { (rustTarget, androidAbi) ->
            val libFile = file("$rustSdkPath/$rustTarget/release/libnuvio_core.so")
            if (libFile.exists()) {
                val destDir = file("$jniLibsPath/$androidAbi")
                destDir.mkdirs()
                copy {
                    from(libFile)
                    into(destDir)
                }
                println("Copied libnuvio_core.so for $androidAbi")
            } else {
                println("Warning: $libFile not found, skipping $androidAbi")
            }
        }
    }
}

// Run copyRustLibs before preBuild
tasks.named("preBuild") {
    dependsOn("copyRustLibs")
}

dependencies {
    // Kotlin Standard Library
    implementation(libs.kotlin.stdlib)
    implementation(libs.kotlin.coroutines.core)
    implementation(libs.kotlin.coroutines.android)

    // AndroidX Core
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)

    // Hilt Dependency Injection
    implementation(libs.hilt.android)
    ksp(libs.hilt.android.compiler)

    // Room Database
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    // DataStore (for preferences)
    implementation(libs.datastore.preferences)

    // JNA for UniFFI Rust SDK integration
    implementation(libs.jna)

    // ExoPlayer (shared media playback logic)
    implementation(libs.exoplayer)
    implementation(libs.exoplayer.dash)

    // Testing
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.espresso.core)
}
