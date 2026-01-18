package com.nuvio.streaming.shared.rust

import android.util.Log
import uniffi.nuvio_core.*

/**
 * Bridge layer between Android and Rust SDK using UniFFI bindings.
 *
 * This object provides a centralized interface for loading and interacting with the
 * native Rust SDK library (nuvio_core). It handles native library initialization
 * and provides access to UniFFI-generated Kotlin bindings.
 *
 * ## Usage
 *
 * Initialize the Rust SDK at application startup:
 * ```kotlin
 * class NuvioApplication : Application() {
 *     override fun onCreate() {
 *         super.onCreate()
 *         RustBridge.initialize()
 *     }
 * }
 * ```
 *
 * Then use the SDK types directly via UniFFI imports:
 * ```kotlin
 * import uniffi.nuvio_core.Meta
 *
 * val meta = Meta(
 *     id = "tt0133093",
 *     name = "The Matrix",
 *     description = "A computer hacker learns...",
 *     posterUrl = "https://example.com/poster.jpg",
 *     backgroundUrl = null,
 *     imdbId = "tt0133093",
 *     tmdbId = 603
 * )
 * ```
 *
 * ## Architecture
 *
 * The Rust SDK uses UniFFI to auto-generate Kotlin bindings from Rust code. These
 * bindings are imported via `uniffi.nuvio_core.*` and provide type-safe access to:
 * - Meta (content metadata)
 * - Stream (streaming sources)
 * - Catalog (content catalogs)
 * - Profile (user profiles)
 * - NuvioException (error handling)
 *
 * @see <a href="https://mozilla.github.io/uniffi-rs/">UniFFI Documentation</a>
 */
object RustBridge {
    private const val TAG = "RustBridge"
    private const val LIBRARY_NAME = "nuvio_core"

    @Volatile
    private var isInitialized = false

    /**
     * Initialize the Rust SDK native library.
     *
     * This method loads the native library (.so file) containing the Rust SDK
     * implementation. It should be called once during application initialization,
     * typically in Application.onCreate().
     *
     * This method is thread-safe and idempotent - calling it multiple times will
     * only load the library once.
     *
     * @throws UnsatisfiedLinkError if the native library cannot be loaded
     * @throws SecurityException if the security manager denies library loading
     */
    @Synchronized
    fun initialize() {
        if (isInitialized) {
            Log.d(TAG, "Rust SDK already initialized, skipping")
            return
        }

        try {
            Log.i(TAG, "Loading Rust SDK native library: $LIBRARY_NAME")
            System.loadLibrary(LIBRARY_NAME)
            isInitialized = true
            Log.i(TAG, "Rust SDK successfully loaded")
        } catch (e: UnsatisfiedLinkError) {
            Log.e(TAG, "Failed to load Rust SDK native library", e)
            throw RustBridgeException(
                "Failed to load native library '$LIBRARY_NAME'. " +
                    "Ensure the .so file is present in jniLibs for your device architecture.",
                e
            )
        } catch (e: SecurityException) {
            Log.e(TAG, "Security manager denied library loading", e)
            throw RustBridgeException(
                "Security manager denied loading native library '$LIBRARY_NAME'",
                e
            )
        }
    }

    /**
     * Check if the Rust SDK has been successfully initialized.
     *
     * @return true if the native library has been loaded, false otherwise
     */
    fun isInitialized(): Boolean = isInitialized
}

/**
 * Exception thrown when the Rust SDK bridge encounters initialization errors.
 *
 * This exception wraps underlying errors from native library loading and provides
 * additional context for debugging.
 *
 * @property message Error description
 * @property cause The underlying exception that caused this error
 */
class RustBridgeException(
    message: String,
    cause: Throwable? = null
) : RuntimeException(message, cause)
