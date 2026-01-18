package com.nuvio.streaming.shared.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import androidx.room.Room
import com.google.android.exoplayer2.ExoPlayer
import com.nuvio.streaming.shared.data.db.NuvioDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import javax.inject.Qualifier
import javax.inject.Singleton

/**
 * Hilt dependency injection module for application-level dependencies.
 *
 * This module provides singleton instances of core dependencies that are shared across
 * all modules (app-mobile, tv, and shared). It follows the Hilt multi-module pattern
 * where the shared module provides common dependencies consumed by app modules.
 *
 * ## Provided Dependencies
 *
 * - **Application Context**: Injected Android application context
 * - **Coroutine Dispatchers**: IO and Main dispatchers for async operations
 * - **DataStore**: Type-safe preference storage via Preferences DataStore
 * - **ExoPlayer**: Shared media player instance for video playback
 * - **Room Database**: Local database (placeholder - will be implemented in data layer task)
 *
 * ## Usage Example
 *
 * ```kotlin
 * @HiltViewModel
 * class MyViewModel @Inject constructor(
 *     private val exoPlayer: ExoPlayer,
 *     @IoDispatcher private val ioDispatcher: CoroutineDispatcher,
 *     private val dataStore: DataStore<Preferences>
 * ) : ViewModel() {
 *     // Use injected dependencies
 * }
 * ```
 *
 * @see [Hilt Modules Documentation](https://dagger.dev/hilt/modules)
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    /**
     * Provides the application context.
     *
     * This is automatically provided by Hilt when using @ApplicationContext qualifier.
     * Included here for completeness and to demonstrate explicit provision pattern.
     *
     * @param context Application context injected by Hilt
     * @return Application context
     */
    @Provides
    @Singleton
    fun provideApplicationContext(
        @ApplicationContext context: Context
    ): Context = context

    /**
     * Provides the IO dispatcher for background operations.
     *
     * Use this dispatcher for database operations, network calls, file I/O,
     * and other CPU/IO-intensive tasks that should not block the main thread.
     *
     * @return Dispatchers.IO for background work
     */
    @Provides
    @IoDispatcher
    fun provideIoDispatcher(): CoroutineDispatcher = Dispatchers.IO

    /**
     * Provides the Main dispatcher for UI operations.
     *
     * Use this dispatcher for UI updates and operations that must run on the
     * Android main thread (e.g., updating LiveData, StateFlow, or Compose state).
     *
     * @return Dispatchers.Main for UI thread work
     */
    @Provides
    @MainDispatcher
    fun provideMainDispatcher(): CoroutineDispatcher = Dispatchers.Main

    /**
     * Provides the Default dispatcher for CPU-intensive work.
     *
     * Use this dispatcher for CPU-intensive computations that don't require
     * blocking I/O (e.g., JSON parsing, data transformations, complex calculations).
     *
     * @return Dispatchers.Default for CPU-bound work
     */
    @Provides
    @DefaultDispatcher
    fun provideDefaultDispatcher(): CoroutineDispatcher = Dispatchers.Default

    /**
     * Provides the Preferences DataStore for type-safe preference storage.
     *
     * This DataStore replaces SharedPreferences and provides a coroutine-based API
     * with type safety via Kotlin Preferences API. Stored preferences persist across
     * app restarts and are scoped to the application.
     *
     * Storage location: `/data/data/com.nuvio.streaming/files/datastore/preferences.pb`
     *
     * @param context Application context for creating DataStore
     * @return Singleton DataStore<Preferences> instance
     */
    @Provides
    @Singleton
    fun providePreferencesDataStore(
        @ApplicationContext context: Context
    ): DataStore<Preferences> = context.dataStore

    /**
     * Provides a singleton ExoPlayer instance for media playback.
     *
     * This ExoPlayer instance is shared across the application to enable seamless
     * playback state transitions (e.g., continuing playback when switching between
     * phone and tablet orientations, or across different screens).
     *
     * **Note**: For TV applications with multiple simultaneous playback surfaces,
     * consider creating separate ExoPlayer instances per surface instead of
     * sharing this singleton.
     *
     * @param context Application context for ExoPlayer initialization
     * @return Singleton ExoPlayer instance
     */
    @Provides
    @Singleton
    fun provideExoPlayer(
        @ApplicationContext context: Context
    ): ExoPlayer = ExoPlayer.Builder(context).build()

    /**
     * Provides a singleton instance of the Nuvio Room database.
     *
     * This database is the primary local data store for the application, handling:
     * - Content metadata caching
     * - Watch history and playback positions
     * - Offline content support
     * - User preferences backup
     *
     * The database is built with:
     * - Fallback to destructive migration during development (schema changes drop tables)
     * - Exported schema for version control and migration testing
     * - Thread-safe operations via Room's internal dispatcher
     *
     * **Note**: In production, replace `fallbackToDestructiveMigration()` with proper
     * migration strategies to preserve user data during schema updates.
     *
     * @param context Application context for database creation
     * @return Singleton NuvioDatabase instance
     */
    @Provides
    @Singleton
    fun provideNuvioDatabase(
        @ApplicationContext context: Context
    ): NuvioDatabase {
        return Room.databaseBuilder(
            context,
            NuvioDatabase::class.java,
            NuvioDatabase.DATABASE_NAME
        )
            .fallbackToDestructiveMigration()  // TODO: Replace with proper migrations in production
            .build()
    }
}

/**
 * Extension property to create Preferences DataStore with default name.
 *
 * This uses the DataStore delegation API to create a singleton DataStore instance
 * tied to the application context. The delegate ensures thread-safe access.
 */
private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(
    name = "nuvio_preferences"
)

/**
 * Qualifier annotation for IO dispatcher.
 *
 * Use this qualifier when injecting the IO dispatcher for background operations:
 * ```kotlin
 * @Inject constructor(@IoDispatcher private val ioDispatcher: CoroutineDispatcher)
 * ```
 */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class IoDispatcher

/**
 * Qualifier annotation for Main dispatcher.
 *
 * Use this qualifier when injecting the Main dispatcher for UI operations:
 * ```kotlin
 * @Inject constructor(@MainDispatcher private val mainDispatcher: CoroutineDispatcher)
 * ```
 */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class MainDispatcher

/**
 * Qualifier annotation for Default dispatcher.
 *
 * Use this qualifier when injecting the Default dispatcher for CPU-intensive work:
 * ```kotlin
 * @Inject constructor(@DefaultDispatcher private val defaultDispatcher: CoroutineDispatcher)
 * ```
 */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class DefaultDispatcher
