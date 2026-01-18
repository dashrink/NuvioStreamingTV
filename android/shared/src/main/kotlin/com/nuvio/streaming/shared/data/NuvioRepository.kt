package com.nuvio.streaming.shared.data

import com.nuvio.streaming.shared.data.db.NuvioDatabase
import com.nuvio.streaming.shared.data.prefs.PreferencesManager
import com.nuvio.streaming.shared.di.IoDispatcher
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Central repository for accessing and managing application data.
 *
 * This repository serves as the single source of truth for the application's data layer,
 * coordinating between multiple data sources including:
 * - **Room Database**: Local persistent storage for content metadata and cache
 * - **DataStore Preferences**: User preferences and settings
 * - **Rust SDK**: Native backend integration for streaming operations
 * - **Remote API**: Network-based data fetching (to be implemented)
 *
 * ## Architecture Pattern
 *
 * The repository pattern provides:
 * - **Abstraction**: UI layer doesn't know about data source details
 * - **Centralization**: Single point of access for all data operations
 * - **Testability**: Easy to mock for unit testing
 * - **Flexibility**: Can switch data sources without affecting UI
 *
 * ## Data Flow
 *
 * ```
 * UI Layer (ViewModels)
 *        ↓
 * NuvioRepository
 *        ↓
 * ┌──────┴──────┬──────────────┬─────────────┐
 * │             │              │             │
 * Room DB   DataStore    Rust SDK    Remote API
 * ```
 *
 * ## Usage Example
 *
 * ```kotlin
 * @HiltViewModel
 * class ContentViewModel @Inject constructor(
 *     private val repository: NuvioRepository
 * ) : ViewModel() {
 *
 *     val isDarkMode = repository.isDarkModeEnabled
 *
 *     fun toggleDarkMode() {
 *         viewModelScope.launch {
 *             repository.setDarkModeEnabled(!isDarkMode.first())
 *         }
 *     }
 * }
 * ```
 *
 * ## Thread Safety
 *
 * All suspend functions are executed on the IO dispatcher to ensure they don't block
 * the main thread. Flow-based APIs handle their own threading internally.
 *
 * @property database Room database for local data persistence
 * @property preferencesManager Manager for user preferences via DataStore
 * @property ioDispatcher Coroutine dispatcher for IO operations
 */
@Singleton
class NuvioRepository @Inject constructor(
    private val database: NuvioDatabase,
    private val preferencesManager: PreferencesManager,
    @IoDispatcher private val ioDispatcher: CoroutineDispatcher
) {

    // ========================================================================
    // Preferences
    // ========================================================================

    /**
     * Flow emitting the current dark mode preference.
     *
     * @return Flow<Boolean> true if dark mode is enabled
     */
    val isDarkModeEnabled: Flow<Boolean> = preferencesManager.isDarkModeEnabled

    /**
     * Flow emitting the dynamic color preference.
     *
     * @return Flow<Boolean> true if Material You dynamic colors are enabled
     */
    val isDynamicColorEnabled: Flow<Boolean> = preferencesManager.isDynamicColorEnabled

    /**
     * Flow emitting the auto-play preference.
     *
     * @return Flow<Boolean> true if auto-play is enabled
     */
    val isAutoPlayEnabled: Flow<Boolean> = preferencesManager.isAutoPlayEnabled

    /**
     * Flow emitting the preferred playback quality.
     *
     * @return Flow<Int> Quality level (0=Auto, 1=Low, 2=Medium, 3=High, 4=Ultra)
     */
    val playbackQuality: Flow<Int> = preferencesManager.playbackQuality

    /**
     * Flow emitting the current user ID.
     *
     * @return Flow<String?> User ID if logged in, null otherwise
     */
    val userId: Flow<String?> = preferencesManager.userId

    /**
     * Enable or disable dark mode.
     *
     * @param enabled true to enable dark mode, false for light mode
     */
    suspend fun setDarkModeEnabled(enabled: Boolean) {
        withContext(ioDispatcher) {
            preferencesManager.setDarkModeEnabled(enabled)
        }
    }

    /**
     * Enable or disable dynamic colors (Material You).
     *
     * @param enabled true to enable dynamic colors, false to use static theme
     */
    suspend fun setDynamicColorEnabled(enabled: Boolean) {
        withContext(ioDispatcher) {
            preferencesManager.setDynamicColorEnabled(enabled)
        }
    }

    /**
     * Enable or disable auto-play functionality.
     *
     * @param enabled true to auto-play content, false to require manual play
     */
    suspend fun setAutoPlayEnabled(enabled: Boolean) {
        withContext(ioDispatcher) {
            preferencesManager.setAutoPlayEnabled(enabled)
        }
    }

    /**
     * Set the preferred playback quality.
     *
     * @param quality Quality level (0-4): 0=Auto, 1=Low, 2=Medium, 3=High, 4=Ultra
     * @throws IllegalArgumentException if quality is not in range 0-4
     */
    suspend fun setPlaybackQuality(quality: Int) {
        withContext(ioDispatcher) {
            preferencesManager.setPlaybackQuality(quality)
        }
    }

    /**
     * Set the current user ID.
     *
     * @param userId The unique identifier for the logged-in user, or null to clear
     */
    suspend fun setUserId(userId: String?) {
        withContext(ioDispatcher) {
            preferencesManager.setUserId(userId)
        }
    }

    /**
     * Clear all user data and preferences.
     *
     * This is typically called during logout to reset the app to a clean state.
     * Clears:
     * - All user preferences
     * - Cached user data (future implementation)
     * - Session tokens (future implementation)
     *
     * Does NOT clear:
     * - Downloaded content
     * - App settings (language, region)
     */
    suspend fun clearUserData() {
        withContext(ioDispatcher) {
            preferencesManager.clearAllPreferences()
            // Future: Clear user-specific database tables
            // database.clearUserData()
        }
    }

    // ========================================================================
    // Database Operations
    // ========================================================================

    // Database operations will be added here as DAOs are implemented
    // Example future implementation:
    //
    // suspend fun getContentById(id: String): Content? {
    //     return withContext(ioDispatcher) {
    //         database.contentDao().getById(id)
    //     }
    // }
    //
    // fun observeWatchHistory(): Flow<List<WatchHistoryItem>> {
    //     return database.watchHistoryDao().observeAll()
    // }

    // ========================================================================
    // Rust SDK Operations
    // ========================================================================

    // Rust SDK integration will be added here for streaming operations
    // Example future implementation:
    //
    // suspend fun fetchStreamingSources(contentId: String): Result<List<Stream>> {
    //     return withContext(ioDispatcher) {
    //         try {
    //             val meta = Meta(id = contentId, ...)
    //             val streams = RustBridge.getStreams(meta)
    //             Result.success(streams)
    //         } catch (e: Exception) {
    //             Result.failure(e)
    //         }
    //     }
    // }

    // ========================================================================
    // Remote API Operations
    // ========================================================================

    // Remote API calls will be added here for backend communication
    // Example future implementation:
    //
    // suspend fun fetchCatalogs(): Result<List<Catalog>> {
    //     return withContext(ioDispatcher) {
    //         try {
    //             val response = apiService.getCatalogs()
    //             database.catalogDao().insertAll(response)
    //             Result.success(response)
    //         } catch (e: Exception) {
    //             Result.failure(e)
    //         }
    //     }
    // }
}
