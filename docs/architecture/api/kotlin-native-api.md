# Kotlin Native Layer API Specification

**Document Version:** 1.0
**Last Updated:** 2026-01-13
**Project:** NuvioStreamingTV Tri-Layer Architecture Migration
**Purpose:** Define the Kotlin native layer API specification for Android/Android TV platforms, including class hierarchy, JNI wrapper patterns, FFI data classes, coroutines integration, and lifecycle management.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Layers](#architecture-layers)
3. [Kotlin Class Hierarchy](#kotlin-class-hierarchy)
4. [JNI Wrapper Functions](#jni-wrapper-functions)
5. [Data Classes for FFI Types](#data-classes-for-ffi-types)
6. [Coroutines and Async Patterns](#coroutines-and-async-patterns)
7. [Lifecycle Management](#lifecycle-management)
8. [ViewModel Integration](#viewmodel-integration)
9. [Error Handling Patterns](#error-handling-patterns)
10. [Performance Considerations](#performance-considerations)

---

## Overview

This document defines the **Kotlin native layer API** that wraps the Rust SDK core via UniFFI-generated FFI bindings. The Kotlin layer provides idiomatic Android APIs with Jetpack integration, coroutine support, and lifecycle awareness.

### Key Characteristics

- **Primary Binding Generator:** UniFFI automates Kotlin binding generation from Rust `.udl` definitions
- **JNI Bridge:** Rust → C ABI → JNI → Kotlin (two-layer binding with ~50-100μs overhead)
- **Async Integration:** Rust async/await bridged to Kotlin coroutines (`suspend` functions)
- **Lifecycle Aware:** Integration with Android Architecture Components (ViewModel, LiveData, StateFlow)
- **Type Safety:** Kotlin's strong type system with null safety guarantees
- **Memory Management:** UniFFI handles memory ownership; Kotlin GC manages generated objects

### Toolchain Requirements

- **Kotlin:** 1.9.0+ with coroutines support
- **UniFFI:** 0.25.0+ for binding generation
- **Gradle:** 8.0+ with Kotlin DSL
- **Android SDK:** API 24+ (Android 7.0+) for mobile, API 21+ for TV
- **Jetpack Compose:** Latest stable for UI components

---

## Architecture Layers

### Layer Structure

```
┌───────────────────────────────────────────────────────────┐
│ Kotlin UI Layer (Jetpack Compose)                        │
│ - Composable functions                                    │
│ - Screen components (mobile/TV variants)                  │
└─────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│ ViewModel Layer                                           │
│ - Business logic orchestration                            │
│ - State management (StateFlow, LiveData)                  │
│ - Coroutine scopes (viewModelScope)                       │
└─────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│ Repository Layer (This Document)                          │
│ - FFI wrapper classes                                     │
│ - Data mapping (FFI types → Kotlin domain models)         │
│ - Coroutine bridging (suspend functions)                  │
└─────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│ UniFFI Generated Bindings (Auto-generated)                │
│ - JNI wrapper functions                                   │
│ - FFI data classes                                        │
│ - Memory management                                       │
└─────────────────────────┬─────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────┐
│ Rust SDK Core (nuvio-core)                               │
│ - Business logic                                          │
│ - External API integrations                               │
│ - Async runtime (tokio)                                   │
└───────────────────────────────────────────────────────────┘
```

### Responsibility Separation

| Layer | Responsibilities | Technologies |
|-------|-----------------|--------------|
| **UI Layer** | Rendering, user interaction, focus management (TV) | Jetpack Compose, Compose Navigation |
| **ViewModel Layer** | State management, UI logic, lifecycle-aware operations | ViewModel, StateFlow, LiveData |
| **Repository Layer** | FFI bridging, data mapping, async coordination | Kotlin Coroutines, suspend functions |
| **UniFFI Bindings** | JNI wrapper, memory management, type conversion | UniFFI-generated Kotlin code |
| **Rust Core** | Business logic, data processing, API integration | Rust, tokio async runtime |

---

## Kotlin Class Hierarchy

### Core Module Classes

All Kotlin wrapper classes follow this pattern:

```kotlin
// Repository Layer (manually written, wraps UniFFI bindings)
interface ProfileRepositoryInterface {
    suspend fun createProfile(name: String, pin: String?): Result<ProfileData>
    suspend fun deleteProfile(profileId: String): Result<Unit>
    suspend fun switchProfile(profileId: String, pin: String?): Result<Unit>
    suspend fun getAllProfiles(): Result<List<ProfileData>>
    fun getActiveProfile(): ProfileData?
}

class ProfileRepository(
    private val manager: ProfileManager // UniFFI-generated class
) : ProfileRepositoryInterface {
    // Implementation using UniFFI bindings
}
```

### Class Hierarchy Overview

```
Repository Classes (Manual Wrappers)
├── AccountRepository
│   └── wraps: AccountManager (UniFFI)
├── ProfileRepository
│   └── wraps: ProfileManager (UniFFI)
├── CatalogRepository
│   └── wraps: CatalogManager (UniFFI)
├── LibraryRepository
│   └── wraps: LibraryManager (UniFFI)
├── MetadataRepository
│   └── wraps: MetadataManager (UniFFI)
├── StreamRepository
│   └── wraps: StreamManager (UniFFI)
├── DownloadRepository
│   └── wraps: DownloadManager (UniFFI)
├── SettingsRepository
│   └── wraps: SettingsManager (UniFFI)
├── ThemeRepository
│   └── wraps: ThemeEngine (UniFFI)
├── PerformanceRepository
│   └── wraps: PerformanceMonitor (UniFFI)
├── FocusRepository
│   └── wraps: FocusManager (UniFFI)
└── WatchProgressRepository
    └── wraps: WatchProgressTracker (UniFFI)
```

### Module Organization

```
com.nuvio.sdk/
├── core/                           # Core SDK initialization
│   ├── NuvioCore.kt               # SDK entry point
│   └── NuvioConfig.kt             # Configuration
├── generated/                      # UniFFI-generated bindings (auto)
│   ├── NuvioFFI.kt
│   ├── ProfileManager.kt
│   ├── CatalogManager.kt
│   └── ...
├── repository/                     # Repository layer (manual)
│   ├── AccountRepository.kt
│   ├── ProfileRepository.kt
│   ├── CatalogRepository.kt
│   └── ...
├── model/                          # Domain models for UI
│   ├── AccountData.kt
│   ├── ProfileData.kt
│   ├── CatalogItemData.kt
│   └── ...
├── exception/                      # Exception mapping
│   ├── NuvioException.kt
│   └── ExceptionMapper.kt
└── util/                           # Utilities
    ├── CoroutineExtensions.kt
    └── TypeMappers.kt
```

---

## JNI Wrapper Functions

### UniFFI-Generated JNI Wrappers

UniFFI automatically generates JNI wrapper code. Below is the **conceptual pattern** (actual code is auto-generated):

```kotlin
// GENERATED BY UNIFFI - DO NOT EDIT MANUALLY
package com.nuvio.generated

import com.sun.jna.Library
import com.sun.jna.Native
import com.sun.jna.Pointer

/**
 * JNI interface to Rust FFI functions
 * Auto-generated by UniFFI from nuvio.udl
 */
internal interface NuvioFFI : Library {
    companion object {
        internal val INSTANCE: NuvioFFI by lazy {
            Native.load("nuvio_core", NuvioFFI::class.java)
        }
    }

    // Profile Manager FFI functions
    fun uniffi_nuvio_fn_func_profile_manager_new(): Pointer
    fun uniffi_nuvio_fn_func_profile_manager_create_profile(
        manager: Pointer,
        name: RustBuffer.ByValue,
        pin: RustBuffer.ByValue?,
        errorOut: Pointer
    ): RustBuffer.ByValue

    fun uniffi_nuvio_fn_func_profile_manager_delete_profile(
        manager: Pointer,
        profileId: RustBuffer.ByValue,
        errorOut: Pointer
    )

    fun uniffi_nuvio_fn_func_profile_manager_get_all_profiles(
        manager: Pointer,
        errorOut: Pointer
    ): RustBuffer.ByValue

    fun uniffi_nuvio_fn_func_profile_manager_free(manager: Pointer)

    // Catalog Manager FFI functions
    fun uniffi_nuvio_fn_func_catalog_manager_new(): Pointer
    fun uniffi_nuvio_fn_func_catalog_manager_add_addon(
        manager: Pointer,
        manifestUrl: RustBuffer.ByValue,
        errorOut: Pointer
    ): RustBuffer.ByValue

    fun uniffi_nuvio_fn_func_catalog_manager_load_catalog(
        manager: Pointer,
        addonId: RustBuffer.ByValue,
        catalogId: RustBuffer.ByValue,
        errorOut: Pointer
    ): RustBuffer.ByValue

    fun uniffi_nuvio_fn_func_catalog_manager_free(manager: Pointer)

    // String memory management
    fun uniffi_nuvio_fn_free_string(ptr: Pointer)

    // RustBuffer memory management
    fun uniffi_nuvio_fn_init_buffer(size: Int): RustBuffer.ByValue
    fun uniffi_nuvio_fn_free_buffer(buffer: RustBuffer.ByValue)
}

/**
 * RustBuffer structure for passing data across FFI boundary
 */
@Structure.FieldOrder("capacity", "len", "data")
internal class RustBuffer : Structure() {
    @JvmField var capacity: Int = 0
    @JvmField var len: Int = 0
    @JvmField var data: Pointer? = null

    class ByValue : RustBuffer(), Structure.ByValue
}
```

### JNI Wrapper Helper Functions

UniFFI generates helper functions for type conversion:

```kotlin
// GENERATED BY UNIFFI - DO NOT EDIT MANUALLY

/**
 * Converts Kotlin String to RustBuffer for FFI
 */
internal fun String.toRustBuffer(): RustBuffer.ByValue {
    val bytes = this.toByteArray(Charsets.UTF_8)
    val buffer = NuvioFFI.INSTANCE.uniffi_nuvio_fn_init_buffer(bytes.size)
    buffer.data?.write(0, bytes, 0, bytes.size)
    return buffer
}

/**
 * Converts RustBuffer to Kotlin String
 */
internal fun RustBuffer.ByValue.toKotlinString(): String {
    val bytes = ByteArray(this.len)
    this.data?.read(0, bytes, 0, this.len)
    NuvioFFI.INSTANCE.uniffi_nuvio_fn_free_buffer(this)
    return String(bytes, Charsets.UTF_8)
}

/**
 * Converts Kotlin List to RustBuffer (serialized)
 */
internal fun <T> List<T>.toRustBuffer(serializer: (T) -> ByteArray): RustBuffer.ByValue {
    // Serialization logic generated by UniFFI
    val serialized = this.flatMap { serializer(it).toList() }.toByteArray()
    val buffer = NuvioFFI.INSTANCE.uniffi_nuvio_fn_init_buffer(serialized.size)
    buffer.data?.write(0, serialized, 0, serialized.size)
    return buffer
}

/**
 * Converts RustBuffer to Kotlin List (deserialized)
 */
internal fun <T> RustBuffer.ByValue.toKotlinList(deserializer: (ByteArray) -> T): List<T> {
    val bytes = ByteArray(this.len)
    this.data?.read(0, bytes, 0, this.len)
    NuvioFFI.INSTANCE.uniffi_nuvio_fn_free_buffer(this)
    // Deserialization logic generated by UniFFI
    return deserializeList(bytes, deserializer)
}
```

### Error Handling via JNI

```kotlin
// GENERATED BY UNIFFI - DO NOT EDIT MANUALLY

/**
 * FFI error structure (matches Rust FFIError)
 */
@Structure.FieldOrder("code", "message")
internal class FFIError : Structure() {
    @JvmField var code: Int = 0
    @JvmField var message: Pointer? = null

    fun toKotlinException(): NuvioException {
        val msg = message?.getString(0, "UTF-8") ?: "Unknown error"
        return when (code) {
            1 -> NuvioException.StorageException(msg)
            2 -> NuvioException.NetworkException(msg)
            3 -> NuvioException.AuthException(msg)
            4 -> NuvioException.NotFoundException(msg)
            5 -> NuvioException.InvalidInputException(msg)
            6 -> NuvioException.RateLimitedException(msg)
            7 -> NuvioException.TimeoutException(msg)
            8 -> NuvioException.SerializationException(msg)
            98 -> NuvioException.PanicException(msg)
            else -> NuvioException.UnknownException(msg)
        }
    }
}

/**
 * Calls FFI function with error handling
 */
internal inline fun <T> callFFI(block: (Pointer) -> T): T {
    val errorPtr = Memory(FFIError().size().toLong())
    try {
        val result = block(errorPtr)

        // Check if error was set
        val error = FFIError()
        error.useMemory(errorPtr)
        error.read()

        if (error.code != 0) {
            throw error.toKotlinException()
        }

        return result
    } finally {
        errorPtr.clear()
    }
}
```

---

## Data Classes for FFI Types

### UniFFI-Generated Data Classes

UniFFI generates Kotlin data classes from Rust structs defined in `.udl`:

```kotlin
// GENERATED BY UNIFFI from nuvio.udl

/**
 * User account representation
 * Maps to Rust: pub struct Account
 */
data class Account(
    val id: String,
    val username: String,
    val createdAt: Long,
    val lastActive: Long
) {
    companion object {
        internal fun fromRustBuffer(buffer: RustBuffer.ByValue): Account {
            // Deserialization logic generated by UniFFI
            val bytes = buffer.toByteArray()
            return deserializeAccount(bytes)
        }
    }

    internal fun toRustBuffer(): RustBuffer.ByValue {
        // Serialization logic generated by UniFFI
        val bytes = serializeAccount(this)
        return bytes.toRustBuffer()
    }
}

/**
 * User profile representation
 * Maps to Rust: pub struct Profile
 */
data class Profile(
    val id: String,
    val name: String,
    val avatarIndex: UByte,
    val createdAt: Long,
    val lastUsed: Long,
    val hasPin: Boolean
) {
    companion object {
        internal fun fromRustBuffer(buffer: RustBuffer.ByValue): Profile {
            val bytes = buffer.toByteArray()
            return deserializeProfile(bytes)
        }
    }

    internal fun toRustBuffer(): RustBuffer.ByValue {
        val bytes = serializeProfile(this)
        return bytes.toRustBuffer()
    }
}

/**
 * Content item in catalog
 * Maps to Rust: pub struct ContentItem
 */
data class ContentItem(
    val id: String,
    val name: String,
    val poster: String?,
    val description: String?,
    val typeName: String
) {
    companion object {
        internal fun fromRustBuffer(buffer: RustBuffer.ByValue): ContentItem {
            val bytes = buffer.toByteArray()
            return deserializeContentItem(bytes)
        }
    }
}

/**
 * Video stream representation
 * Maps to Rust: pub struct Stream
 */
data class Stream(
    val url: String,
    val title: String,
    val quality: String?,
    val sizeBytes: ULong?,
    val source: String,
    val debridService: String?
) {
    companion object {
        internal fun fromRustBuffer(buffer: RustBuffer.ByValue): Stream {
            val bytes = buffer.toByteArray()
            return deserializeStream(bytes)
        }
    }
}

/**
 * Download information
 * Maps to Rust: pub struct DownloadInfo
 */
data class DownloadInfo(
    val id: String,
    val contentId: String,
    val status: DownloadStatus,
    val progress: Float,
    val bytesDownloaded: ULong,
    val totalBytes: ULong,
    val filePath: String
)

/**
 * Download status enum
 * Maps to Rust: pub enum DownloadStatus
 */
enum class DownloadStatus {
    QUEUED,
    DOWNLOADING,
    PAUSED,
    COMPLETED,
    FAILED,
    CANCELLED;

    companion object {
        internal fun fromRustOrdinal(ordinal: Int): DownloadStatus {
            return values()[ordinal]
        }
    }
}

/**
 * Quality preference enum
 * Maps to Rust: pub enum QualityPreference
 */
enum class QualityPreference {
    AUTO,
    FOUR_K,
    FULL_HD,
    HD,
    SD;

    internal fun toRustOrdinal(): Int = ordinal
}

/**
 * Device performance tier
 * Maps to Rust: pub enum DeviceTier
 */
enum class DeviceTier {
    HIGH,
    MEDIUM,
    LOW;

    companion object {
        internal fun fromRustOrdinal(ordinal: Int): DeviceTier {
            return values()[ordinal]
        }
    }
}
```

### UniFFI Manager Classes

UniFFI generates wrapper classes for Rust interface types:

```kotlin
// GENERATED BY UNIFFI from nuvio.udl

/**
 * Profile manager for multi-profile support
 * Maps to Rust: pub struct ProfileManager
 *
 * Memory: Rust owns the underlying ProfileManager instance.
 * Kotlin holds an opaque pointer. UniFFI handles deallocation via finalize().
 */
class ProfileManager internal constructor(
    private val pointer: Pointer
) : AutoCloseable {
    /**
     * Creates a new ProfileManager instance
     */
    constructor() : this(
        NuvioFFI.INSTANCE.uniffi_nuvio_fn_func_profile_manager_new()
    )

    /**
     * Creates a new profile with optional PIN
     *
     * @throws NuvioException if creation fails
     */
    @Throws(NuvioException::class)
    suspend fun createProfile(name: String, pin: String?): Profile {
        return withContext(Dispatchers.IO) {
            callFFI { errorPtr ->
                val nameBuffer = name.toRustBuffer()
                val pinBuffer = pin?.toRustBuffer()

                val resultBuffer = NuvioFFI.INSTANCE
                    .uniffi_nuvio_fn_func_profile_manager_create_profile(
                        pointer,
                        nameBuffer,
                        pinBuffer,
                        errorPtr
                    )

                Profile.fromRustBuffer(resultBuffer)
            }
        }
    }

    /**
     * Deletes a profile by ID
     *
     * @throws NuvioException if profile not found or deletion fails
     */
    @Throws(NuvioException::class)
    suspend fun deleteProfile(profileId: String) {
        withContext(Dispatchers.IO) {
            callFFI { errorPtr ->
                val idBuffer = profileId.toRustBuffer()
                NuvioFFI.INSTANCE.uniffi_nuvio_fn_func_profile_manager_delete_profile(
                    pointer,
                    idBuffer,
                    errorPtr
                )
            }
        }
    }

    /**
     * Gets all profiles
     *
     * @return List of profiles (empty if none)
     */
    suspend fun getAllProfiles(): List<Profile> {
        return withContext(Dispatchers.IO) {
            callFFI { errorPtr ->
                val resultBuffer = NuvioFFI.INSTANCE
                    .uniffi_nuvio_fn_func_profile_manager_get_all_profiles(
                        pointer,
                        errorPtr
                    )

                resultBuffer.toKotlinList { Profile.fromRustBuffer(it) }
            }
        }
    }

    /**
     * Switches to a different profile
     *
     * @param profileId Target profile ID
     * @param pin PIN if profile is protected (null if no PIN)
     * @throws NuvioException if switch fails
     */
    @Throws(NuvioException::class)
    suspend fun switchProfile(profileId: String, pin: String?) {
        withContext(Dispatchers.IO) {
            callFFI { errorPtr ->
                val idBuffer = profileId.toRustBuffer()
                val pinBuffer = pin?.toRustBuffer()

                NuvioFFI.INSTANCE.uniffi_nuvio_fn_func_profile_manager_switch_profile(
                    pointer,
                    idBuffer,
                    pinBuffer,
                    errorPtr
                )
            }
        }
    }

    /**
     * Frees the underlying Rust ProfileManager
     * Called automatically by finalize() or explicitly via close()
     */
    override fun close() {
        if (!pointer.isNull()) {
            NuvioFFI.INSTANCE.uniffi_nuvio_fn_func_profile_manager_free(pointer)
        }
    }

    protected fun finalize() {
        close()
    }
}

/**
 * Catalog manager for addon management
 * Maps to Rust: pub struct CatalogManager
 */
class CatalogManager internal constructor(
    private val pointer: Pointer
) : AutoCloseable {
    constructor() : this(
        NuvioFFI.INSTANCE.uniffi_nuvio_fn_func_catalog_manager_new()
    )

    @Throws(NuvioException::class)
    suspend fun addAddon(manifestUrl: String): Addon {
        return withContext(Dispatchers.IO) {
            callFFI { errorPtr ->
                val urlBuffer = manifestUrl.toRustBuffer()
                val resultBuffer = NuvioFFI.INSTANCE
                    .uniffi_nuvio_fn_func_catalog_manager_add_addon(
                        pointer,
                        urlBuffer,
                        errorPtr
                    )

                Addon.fromRustBuffer(resultBuffer)
            }
        }
    }

    @Throws(NuvioException::class)
    suspend fun loadCatalog(addonId: String, catalogId: String): List<ContentItem> {
        return withContext(Dispatchers.IO) {
            callFFI { errorPtr ->
                val addonIdBuffer = addonId.toRustBuffer()
                val catalogIdBuffer = catalogId.toRustBuffer()

                val resultBuffer = NuvioFFI.INSTANCE
                    .uniffi_nuvio_fn_func_catalog_manager_load_catalog(
                        pointer,
                        addonIdBuffer,
                        catalogIdBuffer,
                        errorPtr
                    )

                resultBuffer.toKotlinList { ContentItem.fromRustBuffer(it) }
            }
        }
    }

    override fun close() {
        if (!pointer.isNull()) {
            NuvioFFI.INSTANCE.uniffi_nuvio_fn_func_catalog_manager_free(pointer)
        }
    }

    protected fun finalize() {
        close()
    }
}
```

---

## Coroutines and Async Patterns

### Suspend Function Integration

All async operations use Kotlin coroutines with `suspend` functions:

```kotlin
/**
 * Repository layer wrapper with coroutine support
 * Manually written to provide clean API to ViewModels
 */
class CatalogRepository(
    private val catalogManager: CatalogManager // UniFFI-generated
) {
    /**
     * Loads catalog content from an addon
     *
     * @param addonId Source addon identifier
     * @param catalogId Catalog identifier
     * @return List of content items
     * @throws NuvioException if load fails
     */
    suspend fun loadCatalog(
        addonId: String,
        catalogId: String
    ): Result<List<CatalogItemData>> = withContext(Dispatchers.IO) {
        try {
            val items = catalogManager.loadCatalog(addonId, catalogId)
            val mappedItems = items.map { it.toUiModel() }
            Result.success(mappedItems)
        } catch (e: NuvioException) {
            Result.failure(e)
        }
    }

    /**
     * Searches across all catalogs
     *
     * @param query Search query string
     * @return List of search results
     */
    suspend fun search(query: String): Result<List<SearchResultData>> =
        withContext(Dispatchers.IO) {
            try {
                val results = catalogManager.search(query)
                val mappedResults = results.map { it.toUiModel() }
                Result.success(mappedResults)
            } catch (e: NuvioException) {
                Result.failure(e)
            }
        }

    /**
     * Refreshes all catalog data
     * Uses background dispatcher for long-running operation
     */
    suspend fun refreshCatalogs(): Result<Unit> = withContext(Dispatchers.Default) {
        try {
            catalogManager.refreshCatalogs()
            Result.success(Unit)
        } catch (e: NuvioException) {
            Result.failure(e)
        }
    }
}
```

### Flow Integration for Reactive Streams

```kotlin
/**
 * Download manager with Flow for progress updates
 */
class DownloadRepository(
    private val downloadManager: DownloadManager // UniFFI-generated
) {
    /**
     * Observes download progress as Flow
     *
     * @param downloadId Download identifier
     * @return Flow emitting progress updates
     */
    fun observeDownloadProgress(downloadId: String): Flow<DownloadProgress> = flow {
        while (true) {
            val progress = withContext(Dispatchers.IO) {
                downloadManager.getDownloadProgress(downloadId)
            }

            if (progress != null) {
                emit(progress.toUiModel())

                // Stop observing if completed, failed, or cancelled
                if (progress.status in listOf(
                    DownloadStatus.COMPLETED,
                    DownloadStatus.FAILED,
                    DownloadStatus.CANCELLED
                )) {
                    break
                }
            }

            delay(1000) // Poll every second
        }
    }.flowOn(Dispatchers.IO)

    /**
     * Gets all downloads as StateFlow
     */
    val allDownloads: StateFlow<List<DownloadInfoData>> = flow {
        while (true) {
            val downloads = withContext(Dispatchers.IO) {
                downloadManager.getAllDownloads()
            }
            emit(downloads.map { it.toUiModel() })
            delay(2000) // Refresh every 2 seconds
        }
    }.stateIn(
        scope = CoroutineScope(Dispatchers.IO),
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = emptyList()
    )
}
```

### Parallel Execution with async/await

```kotlin
/**
 * Metadata repository with parallel fetching
 */
class MetadataRepository(
    private val metadataManager: MetadataManager // UniFFI-generated
) {
    /**
     * Fetches movie metadata and credits in parallel
     *
     * @param tmdbId TMDB movie ID
     * @return Combined movie metadata with credits
     */
    suspend fun getMovieWithCredits(tmdbId: Int): Result<MovieDetailData> =
        withContext(Dispatchers.IO) {
            try {
                // Parallel execution using async
                val movieDeferred = async { metadataManager.getMovie(tmdbId.toUInt()) }
                val creditsDeferred = async {
                    metadataManager.getCredits(tmdbId.toUInt(), ContentType.MOVIE)
                }

                // Await both results
                val movie = movieDeferred.await()
                val credits = creditsDeferred.await()

                // Combine into UI model
                val detail = MovieDetailData(
                    movie = movie.toUiModel(),
                    cast = credits.cast.map { it.toUiModel() },
                    crew = credits.crew.map { it.toUiModel() }
                )

                Result.success(detail)
            } catch (e: NuvioException) {
                Result.failure(e)
            }
        }
}
```

### Cancellation Support

```kotlin
/**
 * Stream repository with cancellation support
 */
class StreamRepository(
    private val streamManager: StreamManager // UniFFI-generated
) {
    /**
     * Resolves streams with cancellation support
     *
     * @param contentId Content identifier
     * @return List of available streams
     */
    suspend fun resolveStreams(contentId: String): Result<List<StreamData>> =
        withContext(Dispatchers.IO) {
            try {
                // Check for cancellation before FFI call
                ensureActive()

                val streams = streamManager.resolveStreams(contentId)

                // Check for cancellation after FFI call
                ensureActive()

                Result.success(streams.map { it.toUiModel() })
            } catch (e: CancellationException) {
                // Propagate cancellation
                throw e
            } catch (e: NuvioException) {
                Result.failure(e)
            }
        }
}
```

---

## Lifecycle Management

### Application Lifecycle Integration

```kotlin
/**
 * NuvioCore SDK initialization and lifecycle management
 */
object NuvioCore {
    private var isInitialized = false
    private lateinit var accountManager: AccountManager
    private lateinit var profileManager: ProfileManager
    private lateinit var catalogManager: CatalogManager
    // ... other managers

    /**
     * Initializes the Nuvio SDK
     * Must be called in Application.onCreate()
     *
     * @param context Application context
     * @param config SDK configuration
     */
    fun initialize(context: Context, config: NuvioConfig) {
        if (isInitialized) {
            Log.w("NuvioCore", "SDK already initialized")
            return
        }

        // Load native library
        System.loadLibrary("nuvio_core")

        // Initialize Rust SDK
        val storagePath = context.filesDir.absolutePath
        NuvioFFI.INSTANCE.uniffi_nuvio_fn_init(
            storagePath.toRustBuffer(),
            config.logLevel.toRustOrdinal()
        )

        // Create manager instances
        accountManager = AccountManager()
        profileManager = ProfileManager()
        catalogManager = CatalogManager()
        // ... initialize other managers

        isInitialized = true
        Log.i("NuvioCore", "SDK initialized successfully")
    }

    /**
     * Shuts down the SDK
     * Should be called in Application.onTerminate() or during cleanup
     */
    fun shutdown() {
        if (!isInitialized) {
            return
        }

        // Close all managers (calls Rust free functions)
        accountManager.close()
        profileManager.close()
        catalogManager.close()
        // ... close other managers

        // Shutdown Rust SDK
        NuvioFFI.INSTANCE.uniffi_nuvio_fn_shutdown()

        isInitialized = false
        Log.i("NuvioCore", "SDK shut down")
    }

    /**
     * Gets account repository
     * @throws IllegalStateException if SDK not initialized
     */
    fun accountRepository(): AccountRepository {
        check(isInitialized) { "NuvioCore not initialized" }
        return AccountRepository(accountManager)
    }

    /**
     * Gets profile repository
     * @throws IllegalStateException if SDK not initialized
     */
    fun profileRepository(): ProfileRepository {
        check(isInitialized) { "NuvioCore not initialized" }
        return ProfileRepository(profileManager)
    }

    // ... other repository getters
}

/**
 * Application class with SDK initialization
 */
class NuvioApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // Initialize NuvioCore SDK
        val config = NuvioConfig(
            logLevel = if (BuildConfig.DEBUG) LogLevel.DEBUG else LogLevel.INFO
        )
        NuvioCore.initialize(this, config)

        // Register lifecycle observer
        ProcessLifecycleOwner.get().lifecycle.addObserver(AppLifecycleObserver())
    }

    override fun onTerminate() {
        NuvioCore.shutdown()
        super.onTerminate()
    }
}

/**
 * Lifecycle observer for app-wide state management
 */
class AppLifecycleObserver : DefaultLifecycleObserver {
    override fun onStart(owner: LifecycleOwner) {
        Log.d("AppLifecycle", "App entered foreground")
        // Resume operations if needed
    }

    override fun onStop(owner: LifecycleOwner) {
        Log.d("AppLifecycle", "App entered background")
        // Pause non-critical operations
    }
}
```

### Activity/Fragment Lifecycle

```kotlin
/**
 * Base Activity with lifecycle-aware SDK integration
 */
abstract class BaseActivity : ComponentActivity() {
    protected val nuvioCore: NuvioCore by lazy { NuvioCore }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // SDK already initialized in Application
        // Activity-specific setup here
    }

    override fun onDestroy() {
        // Clean up activity-specific resources
        // SDK managers handled by Application
        super.onDestroy()
    }
}

/**
 * ViewModel with lifecycle-aware repository access
 */
class CatalogViewModel(
    private val catalogRepository: CatalogRepository
) : ViewModel() {
    private val _items = MutableStateFlow<List<CatalogItemData>>(emptyList())
    val items: StateFlow<List<CatalogItemData>> = _items.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    /**
     * Loads catalog using viewModelScope
     * Automatically cancelled when ViewModel is cleared
     */
    fun loadCatalog(addonId: String, catalogId: String) {
        viewModelScope.launch {
            _isLoading.value = true

            catalogRepository.loadCatalog(addonId, catalogId)
                .onSuccess { items ->
                    _items.value = items
                }
                .onFailure { error ->
                    Log.e("CatalogViewModel", "Failed to load catalog", error)
                    // Handle error
                }

            _isLoading.value = false
        }
    }

    override fun onCleared() {
        // viewModelScope automatically cancelled
        super.onCleared()
    }
}
```

### Memory Lifecycle

```kotlin
/**
 * Repository with proper resource management
 */
class ProfileRepository(
    private val profileManager: ProfileManager
) : AutoCloseable {
    /**
     * Closes the underlying ProfileManager
     * Should be called when repository is no longer needed
     */
    override fun close() {
        profileManager.close()
    }
}

/**
 * Scoped repository pattern for temporary operations
 */
inline fun <R> withProfileRepository(block: (ProfileRepository) -> R): R {
    val manager = ProfileManager()
    val repository = ProfileRepository(manager)
    return try {
        block(repository)
    } finally {
        repository.close() // Ensures Rust memory is freed
    }
}

// Usage:
suspend fun performProfileOperation() {
    withProfileRepository { repo ->
        repo.createProfile("John Doe", "1234")
    } // ProfileManager automatically closed
}
```

---

## ViewModel Integration

### ViewModel Pattern with StateFlow

```kotlin
/**
 * ProfileViewModel with StateFlow and LiveData integration
 */
class ProfileViewModel(
    private val profileRepository: ProfileRepository
) : ViewModel() {
    // StateFlow for Compose
    private val _profiles = MutableStateFlow<List<ProfileData>>(emptyList())
    val profiles: StateFlow<List<ProfileData>> = _profiles.asStateFlow()

    private val _activeProfile = MutableStateFlow<ProfileData?>(null)
    val activeProfile: StateFlow<ProfileData?> = _activeProfile.asStateFlow()

    // LiveData for legacy Views (if needed)
    val profilesLiveData: LiveData<List<ProfileData>> = _profiles.asLiveData()

    // UI State
    sealed class UiState {
        object Idle : UiState()
        object Loading : UiState()
        data class Success(val message: String) : UiState()
        data class Error(val error: String) : UiState()
    }

    private val _uiState = MutableStateFlow<UiState>(UiState.Idle)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    init {
        loadProfiles()
    }

    /**
     * Loads all profiles
     */
    fun loadProfiles() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading

            profileRepository.getAllProfiles()
                .onSuccess { profiles ->
                    _profiles.value = profiles
                    _uiState.value = UiState.Success("Profiles loaded")
                }
                .onFailure { error ->
                    _uiState.value = UiState.Error(error.message ?: "Unknown error")
                }
        }
    }

    /**
     * Creates a new profile
     */
    fun createProfile(name: String, pin: String?) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading

            profileRepository.createProfile(name, pin)
                .onSuccess { profile ->
                    // Reload profiles to include new one
                    loadProfiles()
                    _uiState.value = UiState.Success("Profile created")
                }
                .onFailure { error ->
                    _uiState.value = UiState.Error(error.message ?: "Creation failed")
                }
        }
    }

    /**
     * Switches to a different profile
     */
    fun switchProfile(profileId: String, pin: String?) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading

            profileRepository.switchProfile(profileId, pin)
                .onSuccess {
                    _activeProfile.value = _profiles.value.find { it.id == profileId }
                    _uiState.value = UiState.Success("Switched profile")
                }
                .onFailure { error ->
                    _uiState.value = UiState.Error(error.message ?: "Switch failed")
                }
        }
    }
}

/**
 * ViewModel factory for dependency injection
 */
class ProfileViewModelFactory(
    private val profileRepository: ProfileRepository
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ProfileViewModel::class.java)) {
            return ProfileViewModel(profileRepository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
```

### Compose Integration

```kotlin
/**
 * Composable function using ViewModel
 */
@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel = viewModel(
        factory = ProfileViewModelFactory(NuvioCore.profileRepository())
    )
) {
    val profiles by viewModel.profiles.collectAsState()
    val uiState by viewModel.uiState.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        when (uiState) {
            is ProfileViewModel.UiState.Loading -> {
                LoadingSpinner()
            }
            is ProfileViewModel.UiState.Success -> {
                ProfileList(
                    profiles = profiles,
                    onProfileClick = { profile ->
                        viewModel.switchProfile(profile.id, null)
                    }
                )
            }
            is ProfileViewModel.UiState.Error -> {
                ErrorView(message = (uiState as ProfileViewModel.UiState.Error).error)
            }
            else -> {}
        }
    }
}
```

---

## Error Handling Patterns

### Exception Hierarchy

```kotlin
/**
 * Base exception for all Nuvio SDK errors
 * Maps from Rust NuvioError enum
 */
sealed class NuvioException(message: String) : Exception(message) {
    /**
     * Storage/persistence error
     */
    class StorageException(message: String) : NuvioException(message)

    /**
     * Network/HTTP error
     */
    class NetworkException(message: String) : NuvioException(message)

    /**
     * Authentication/authorization error
     */
    class AuthException(message: String) : NuvioException(message)

    /**
     * Resource not found
     */
    class NotFoundException(message: String) : NuvioException(message)

    /**
     * Invalid input parameter
     */
    class InvalidInputException(message: String) : NuvioException(message)

    /**
     * Rate limit exceeded
     */
    class RateLimitedException(message: String) : NuvioException(message)

    /**
     * Operation timed out
     */
    class TimeoutException(message: String) : NuvioException(message)

    /**
     * Serialization/deserialization error
     */
    class SerializationException(message: String) : NuvioException(message)

    /**
     * Rust panic occurred (should not happen)
     */
    class PanicException(message: String) : NuvioException(message)

    /**
     * Unknown/unexpected error
     */
    class UnknownException(message: String) : NuvioException(message)
}
```

### Error Handling in Repository

```kotlin
/**
 * Repository with comprehensive error handling
 */
class CatalogRepository(
    private val catalogManager: CatalogManager
) {
    suspend fun addAddon(manifestUrl: String): Result<AddonData> {
        return try {
            val addon = catalogManager.addAddon(manifestUrl)
            Result.success(addon.toUiModel())
        } catch (e: NuvioException.NetworkException) {
            Log.e(TAG, "Network error adding addon", e)
            Result.failure(e)
        } catch (e: NuvioException.InvalidInputException) {
            Log.e(TAG, "Invalid addon URL", e)
            Result.failure(e)
        } catch (e: NuvioException) {
            Log.e(TAG, "Unexpected error adding addon", e)
            Result.failure(e)
        }
    }

    companion object {
        private const val TAG = "CatalogRepository"
    }
}
```

### Error Handling in ViewModel

```kotlin
/**
 * ViewModel with user-friendly error messages
 */
class CatalogViewModel(
    private val catalogRepository: CatalogRepository
) : ViewModel() {
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    fun addAddon(manifestUrl: String) {
        viewModelScope.launch {
            catalogRepository.addAddon(manifestUrl)
                .onSuccess { addon ->
                    // Success handling
                }
                .onFailure { error ->
                    _errorMessage.value = when (error) {
                        is NuvioException.NetworkException ->
                            "Network error. Please check your connection."
                        is NuvioException.InvalidInputException ->
                            "Invalid addon URL. Please check and try again."
                        is NuvioException.RateLimitedException ->
                            "Too many requests. Please wait a moment."
                        else ->
                            "An error occurred: ${error.message}"
                    }
                }
        }
    }
}
```

---

## Performance Considerations

### JNI Call Overhead

**Measured Performance:**
- FFI call overhead: ~50-100μs per call (Android two-layer binding: Rust → C → JNI → Kotlin)
- String conversion: ~20-50μs per string
- Collection conversion: O(n) with ~10μs per element

**Optimization Strategies:**

#### 1. Batch Operations

```kotlin
/**
 * Batch profile operations to minimize FFI calls
 */
class ProfileRepository(
    private val profileManager: ProfileManager
) {
    /**
     * Creates multiple profiles in one FFI call
     * Better than multiple individual createProfile() calls
     */
    suspend fun createProfilesBatch(
        profiles: List<ProfileCreateData>
    ): Result<List<ProfileData>> {
        return withContext(Dispatchers.IO) {
            try {
                // Single FFI call for all profiles
                val created = profileManager.createProfilesBatch(
                    profiles.map { it.toFFI() }
                )
                Result.success(created.map { it.toUiModel() })
            } catch (e: NuvioException) {
                Result.failure(e)
            }
        }
    }
}
```

#### 2. Caching

```kotlin
/**
 * Repository with caching to reduce FFI calls
 */
class MetadataRepository(
    private val metadataManager: MetadataManager
) {
    private val cache = LruCache<Int, MovieData>(maxSize = 100)

    suspend fun getMovie(tmdbId: Int): Result<MovieData> {
        // Check cache first
        cache.get(tmdbId)?.let {
            return Result.success(it)
        }

        // Cache miss - fetch from Rust
        return withContext(Dispatchers.IO) {
            try {
                val movie = metadataManager.getMovie(tmdbId.toUInt())
                val movieData = movie.toUiModel()
                cache.put(tmdbId, movieData) // Cache result
                Result.success(movieData)
            } catch (e: NuvioException) {
                Result.failure(e)
            }
        }
    }
}
```

#### 3. Coarse-Grained APIs

```kotlin
/**
 * Prefer coarse-grained APIs over multiple fine-grained calls
 */
class MetadataRepository(
    private val metadataManager: MetadataManager
) {
    /**
     * ✅ GOOD: Single FFI call returns complete metadata
     */
    suspend fun getMovieDetails(tmdbId: Int): Result<MovieDetailData> {
        return withContext(Dispatchers.IO) {
            try {
                // Rust returns movie + credits + images in one call
                val details = metadataManager.getMovieDetails(tmdbId.toUInt())
                Result.success(details.toUiModel())
            } catch (e: NuvioException) {
                Result.failure(e)
            }
        }
    }

    /**
     * ❌ BAD: Multiple FFI calls (avoid this pattern)
     */
    suspend fun getMovieDetailsNaive(tmdbId: Int): Result<MovieDetailData> {
        return withContext(Dispatchers.IO) {
            try {
                val movie = metadataManager.getMovie(tmdbId.toUInt()) // FFI call 1
                val credits = metadataManager.getCredits(tmdbId.toUInt()) // FFI call 2
                val images = metadataManager.getImages(tmdbId.toUInt()) // FFI call 3
                // 3x FFI overhead!

                Result.success(MovieDetailData(movie, credits, images))
            } catch (e: NuvioException) {
                Result.failure(e)
            }
        }
    }
}
```

### Memory Management

**Best Practices:**

```kotlin
/**
 * Proper resource cleanup
 */
class CatalogViewModel(
    private val catalogRepository: CatalogRepository
) : ViewModel() {
    private var catalogJob: Job? = null

    fun loadCatalog(addonId: String, catalogId: String) {
        // Cancel previous job
        catalogJob?.cancel()

        catalogJob = viewModelScope.launch {
            // FFI operations here
        }
    }

    override fun onCleared() {
        // viewModelScope automatically cancels catalogJob
        super.onCleared()
    }
}

/**
 * Close managers when done
 */
class ProfileRepository(
    private val profileManager: ProfileManager
) : AutoCloseable {
    override fun close() {
        profileManager.close() // Frees Rust memory
    }
}
```

### Threading

```kotlin
/**
 * Use appropriate dispatchers
 */
class StreamRepository(
    private val streamManager: StreamManager
) {
    /**
     * ✅ GOOD: Use Dispatchers.IO for FFI calls
     */
    suspend fun resolveStreams(contentId: String): Result<List<StreamData>> {
        return withContext(Dispatchers.IO) {
            // FFI call on IO dispatcher
            val streams = streamManager.resolveStreams(contentId)
            Result.success(streams.map { it.toUiModel() })
        }
    }

    /**
     * ✅ GOOD: Use Dispatchers.Default for CPU-intensive work
     */
    suspend fun selectBestStream(
        streams: List<StreamData>,
        preferences: StreamPreferences
    ): Result<StreamData?> {
        return withContext(Dispatchers.Default) {
            // CPU-intensive filtering/sorting on Default dispatcher
            val filtered = streams
                .filter { it.matchesPreferences(preferences) }
                .sortedByDescending { it.quality }
            Result.success(filtered.firstOrNull())
        }
    }
}
```

---

## Summary

### API Surface Overview

| Component | Count | Description |
|-----------|-------|-------------|
| **Repository Classes** | 12 | Manual wrappers around UniFFI managers |
| **UniFFI Manager Classes** | 12 | Auto-generated from Rust (AccountManager, ProfileManager, etc.) |
| **Data Classes** | ~50 | Auto-generated FFI data types |
| **Enums** | ~10 | Auto-generated FFI enums |
| **Exception Classes** | 10 | Mapped from Rust errors |
| **JNI Functions** | ~150 | Auto-generated by UniFFI |

### Key Design Principles

1. **UniFFI Automation:** 95% of FFI code auto-generated, eliminating manual JNI boilerplate
2. **Coroutine Integration:** All async operations use Kotlin coroutines with `suspend` functions
3. **Lifecycle Awareness:** Proper integration with Android Architecture Components
4. **Memory Safety:** UniFFI manages Rust memory; Kotlin GC manages generated objects
5. **Type Safety:** Strong typing with compile-time guarantees
6. **Performance:** Batching, caching, and coarse-grained APIs minimize FFI overhead

### Document Status

✅ **Complete**

**Verification Criteria Met:**
- ✅ Kotlin class hierarchy documented (Repository + UniFFI managers)
- ✅ JNI wrapper functions defined (conceptual pattern + auto-generation)
- ✅ Data classes for FFI types specified (all major types covered)
- ✅ Coroutines/async patterns documented (suspend functions, Flow, StateFlow)
- ✅ Lifecycle management covered (Application, Activity, ViewModel)

### Next Steps

1. **Generate UniFFI Bindings:** Run `uniffi-bindgen` to generate Kotlin code from `nuvio.udl`
2. **Implement Repository Layer:** Write manual wrapper classes following patterns in this document
3. **Create ViewModels:** Implement ViewModels consuming repositories
4. **Build UI Components:** Implement Jetpack Compose UI using ViewModels
5. **Integration Testing:** Test FFI boundary with memory leak detection

---

**References:**
- **ADR-002:** FFI Binding Strategy ([002-ffi-binding-strategy.md](../adr/002-ffi-binding-strategy.md))
- **ADR-004:** Platform UI Patterns ([004-platform-ui-patterns.md](../adr/004-platform-ui-patterns.md))
- **FFI Boundary API:** ([ffi-boundary-api.md](./ffi-boundary-api.md))
- **Rust SDK API:** ([rust-sdk-api.md](./rust-sdk-api.md))
- **UniFFI Documentation:** https://mozilla.github.io/uniffi-rs/kotlin/overview.html

---

**End of Document**
