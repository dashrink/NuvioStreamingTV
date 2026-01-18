package com.nuvio.streaming.mobile

import android.app.Application
import android.util.Log
import com.nuvio.streaming.shared.rust.RustBridge
import com.nuvio.streaming.shared.rust.RustBridgeException
import dagger.hilt.android.HiltAndroidApp

/**
 * Application class for the Nuvio Streaming mobile app (phone/tablet).
 *
 * This class serves as the entry point for the mobile application and handles:
 * - Hilt dependency injection initialization via @HiltAndroidApp annotation
 * - Rust SDK native library initialization through RustBridge
 * - Application-level lifecycle management
 *
 * ## Dependency Injection
 *
 * The @HiltAndroidApp annotation triggers Hilt's code generation at compile time,
 * creating the necessary dependency injection infrastructure for the entire app.
 * This enables constructor injection in Activities, ViewModels, and other components.
 *
 * ## Rust SDK Integration
 *
 * During onCreate(), the application initializes the Rust SDK native library using
 * RustBridge.initialize(). This loads the nuvio_core.so library and makes UniFFI-generated
 * Kotlin bindings available throughout the app. Initialization failures are logged but
 * do not crash the app, allowing graceful degradation.
 *
 * ## Usage
 *
 * This class is referenced in AndroidManifest.xml:
 * ```xml
 * <application android:name=".MobileApplication">
 *     <!-- activities and services -->
 * </application>
 * ```
 *
 * Dependencies are then injected in Activities using @AndroidEntryPoint:
 * ```kotlin
 * @AndroidEntryPoint
 * class MainActivity : ComponentActivity() {
 *     // Dependencies are automatically injected by Hilt
 * }
 * ```
 *
 * @see com.nuvio.streaming.shared.rust.RustBridge
 * @see com.nuvio.streaming.mobile.MainActivity
 */
@HiltAndroidApp
class MobileApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "Initializing Nuvio Streaming mobile application")

        initializeRustSdk()

        Log.i(TAG, "Mobile application initialization complete")
    }

    /**
     * Initialize the Rust SDK native library.
     *
     * Attempts to load the nuvio_core native library via RustBridge. If initialization
     * fails, the error is logged but the app continues to launch. This allows the app
     * to display an error message to the user rather than crashing on startup.
     *
     * In production, you may want to implement retry logic or show a user-friendly
     * error dialog when the SDK fails to initialize.
     */
    private fun initializeRustSdk() {
        try {
            RustBridge.initialize()
            Log.i(TAG, "Rust SDK initialized successfully")
        } catch (e: RustBridgeException) {
            Log.e(TAG, "Failed to initialize Rust SDK - app functionality may be limited", e)
            // TODO: Consider showing user-facing error dialog or retry mechanism
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error during Rust SDK initialization", e)
        }
    }

    companion object {
        private const val TAG = "MobileApplication"
    }
}
