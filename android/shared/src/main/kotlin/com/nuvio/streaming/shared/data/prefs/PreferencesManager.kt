package com.nuvio.streaming.shared.data.prefs

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manager for application preferences using DataStore.
 *
 * This class provides a type-safe, coroutine-based API for reading and writing
 * user preferences. It replaces the legacy SharedPreferences API with the modern
 * DataStore approach, offering better performance, reactive updates via Flow,
 * and stronger type safety.
 *
 * ## Architecture
 *
 * PreferencesManager follows the repository pattern for preferences:
 * - **Type-safe keys**: Strongly typed preference keys prevent type errors
 * - **Reactive updates**: Flow-based API for observing preference changes
 * - **Coroutine-based**: All operations are suspending functions
 * - **Thread-safe**: DataStore handles synchronization internally
 *
 * ## Usage Example
 *
 * ```kotlin
 * @Inject
 * lateinit var preferencesManager: PreferencesManager
 *
 * // Observe theme preference
 * preferencesManager.isDarkModeEnabled
 *     .collect { isDarkMode ->
 *         applyTheme(isDarkMode)
 *     }
 *
 * // Update preference
 * preferencesManager.setDarkModeEnabled(true)
 * ```
 *
 * ## Preference Categories
 *
 * Currently supported preferences:
 * - **Theme**: Dark mode, dynamic colors (Material You)
 * - **Playback**: Auto-play, playback quality
 * - **User**: User ID for session management
 *
 * @property dataStore The underlying Preferences DataStore
 */
@Singleton
class PreferencesManager @Inject constructor(
    private val dataStore: DataStore<Preferences>
) {

    /**
     * Flow emitting the current dark mode preference.
     *
     * Emits `true` if dark mode is enabled, `false` for light mode.
     * Defaults to `false` (light mode) if not set.
     */
    val isDarkModeEnabled: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.DARK_MODE] ?: false
    }

    /**
     * Flow emitting the current dynamic color preference.
     *
     * Dynamic colors (Material You) adapt the app's color scheme to the user's
     * wallpaper. Only available on Android 12+ (API 31).
     *
     * Emits `true` if dynamic colors are enabled, `false` otherwise.
     * Defaults to `true` on supported devices.
     */
    val isDynamicColorEnabled: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.DYNAMIC_COLOR] ?: true
    }

    /**
     * Flow emitting the auto-play preference.
     *
     * When enabled, content will automatically start playing after selection.
     * When disabled, user must explicitly press play.
     *
     * Defaults to `true` (auto-play enabled).
     */
    val isAutoPlayEnabled: Flow<Boolean> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.AUTO_PLAY] ?: true
    }

    /**
     * Flow emitting the preferred playback quality.
     *
     * Quality levels:
     * - 0: Auto (adaptive streaming based on network)
     * - 1: Low (360p)
     * - 2: Medium (720p)
     * - 3: High (1080p)
     * - 4: Ultra (4K)
     *
     * Defaults to 0 (auto quality).
     */
    val playbackQuality: Flow<Int> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.PLAYBACK_QUALITY] ?: 0
    }

    /**
     * Flow emitting the current user ID.
     *
     * This is the unique identifier for the currently logged-in user.
     * Emits `null` if no user is logged in.
     */
    val userId: Flow<String?> = dataStore.data.map { preferences ->
        preferences[PreferencesKeys.USER_ID]
    }

    /**
     * Enable or disable dark mode.
     *
     * @param enabled true to enable dark mode, false for light mode
     */
    suspend fun setDarkModeEnabled(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.DARK_MODE] = enabled
        }
    }

    /**
     * Enable or disable dynamic colors (Material You).
     *
     * @param enabled true to enable dynamic colors, false to use static theme
     */
    suspend fun setDynamicColorEnabled(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.DYNAMIC_COLOR] = enabled
        }
    }

    /**
     * Enable or disable auto-play functionality.
     *
     * @param enabled true to auto-play content, false to require manual play
     */
    suspend fun setAutoPlayEnabled(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.AUTO_PLAY] = enabled
        }
    }

    /**
     * Set the preferred playback quality.
     *
     * @param quality Quality level (0-4): 0=Auto, 1=Low, 2=Medium, 3=High, 4=Ultra
     */
    suspend fun setPlaybackQuality(quality: Int) {
        require(quality in 0..4) { "Quality must be between 0 and 4" }
        dataStore.edit { preferences ->
            preferences[PreferencesKeys.PLAYBACK_QUALITY] = quality
        }
    }

    /**
     * Set the current user ID.
     *
     * @param userId The unique identifier for the logged-in user, or null to clear
     */
    suspend fun setUserId(userId: String?) {
        dataStore.edit { preferences ->
            if (userId != null) {
                preferences[PreferencesKeys.USER_ID] = userId
            } else {
                preferences.remove(PreferencesKeys.USER_ID)
            }
        }
    }

    /**
     * Clear all preferences.
     *
     * This is typically used during logout to reset the app to default state.
     * Use with caution as this will remove all user preferences.
     */
    suspend fun clearAllPreferences() {
        dataStore.edit { preferences ->
            preferences.clear()
        }
    }

    /**
     * Preference keys for type-safe access to DataStore values.
     *
     * These keys define the storage identifiers and types for each preference.
     * Keys are private to prevent external code from bypassing the PreferencesManager API.
     */
    private object PreferencesKeys {
        val DARK_MODE = booleanPreferencesKey("dark_mode")
        val DYNAMIC_COLOR = booleanPreferencesKey("dynamic_color")
        val AUTO_PLAY = booleanPreferencesKey("auto_play")
        val PLAYBACK_QUALITY = intPreferencesKey("playback_quality")
        val USER_ID = stringPreferencesKey("user_id")
    }
}
