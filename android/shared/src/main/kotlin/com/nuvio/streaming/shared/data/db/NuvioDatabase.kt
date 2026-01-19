package com.nuvio.streaming.shared.data.db

import androidx.room.Database
import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters

/**
 * Room database for the Nuvio streaming application.
 *
 * This database serves as the single source of truth for local data caching,
 * offline support, and temporary storage. It follows the Room persistence library
 * pattern with type-safe data access and automatic migration support.
 *
 * ## Architecture
 *
 * The database is designed to support:
 * - **Offline content browsing**: Cached metadata for previously viewed content
 * - **Playback state**: Resume positions and watch history
 * - **User preferences**: Cached user settings synced from backend
 * - **Search history**: Local search query caching
 *
 * ## Database Schema
 *
 * Currently contains a minimal WatchHistoryEntity. Additional entities will be added
 * as the data layer is expanded to include:
 * - Content metadata (movies, shows, episodes)
 * - Downloaded content metadata
 * - Cached API responses
 *
 * ## Usage
 *
 * The database is provided as a singleton via Hilt dependency injection:
 * ```kotlin
 * @Inject
 * lateinit var database: NuvioDatabase
 *
 * // Access DAOs
 * val dao = database.yourDao()
 * ```
 *
 * ## Migration Strategy
 *
 * Room migrations should be added to the database builder when schema changes occur:
 * ```kotlin
 * Room.databaseBuilder(context, NuvioDatabase::class.java, "nuvio_database")
 *     .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
 *     .build()
 * ```
 *
 * @see androidx.room.Database
 * @see androidx.room.RoomDatabase
 */
@Database(
    entities = [WatchHistoryEntity::class],
    version = 1,
    exportSchema = true  // Export schema for version control and migration testing
)
@TypeConverters(DatabaseConverters::class)
abstract class NuvioDatabase : RoomDatabase() {

    // DAOs will be added here as entities are defined
    // Example:
    // abstract fun contentDao(): ContentDao
    // abstract fun watchHistoryDao(): WatchHistoryDao

    companion object {
        /**
         * Database name used when building the Room database instance.
         *
         * This constant ensures consistency across the application when referencing
         * the database file location.
         */
        const val DATABASE_NAME = "nuvio_database"

        /**
         * Current database version.
         *
         * Increment this when making schema changes and provide corresponding
         * migration paths.
         */
        const val DATABASE_VERSION = 1
    }
}

/**
 * Entity for storing watch history entries.
 *
 * Tracks content that the user has watched, including playback position
 * for resume functionality.
 */
@Entity(tableName = "watch_history")
data class WatchHistoryEntity(
    @PrimaryKey
    val contentId: String,
    val contentType: String, // "movie", "episode", etc.
    val title: String,
    val playbackPositionMs: Long = 0L,
    val durationMs: Long = 0L,
    val lastWatchedTimestamp: Long = System.currentTimeMillis(),
    val isCompleted: Boolean = false
)

/**
 * Type converters for Room database.
 *
 * Room requires type converters for non-primitive types that need to be stored
 * in the SQLite database. These converters handle serialization/deserialization
 * of complex types.
 *
 * ## Supported Conversions
 *
 * Currently includes basic converters. Additional converters will be added as needed:
 * - Date/Timestamp conversions (Long <-> Date)
 * - List conversions (String <-> List<T>)
 * - Enum conversions (String <-> Enum)
 * - JSON conversions (String <-> Complex objects)
 */
class DatabaseConverters {
    /**
     * Converts a list of strings to a comma-separated string for storage.
     */
    @TypeConverter
    fun fromStringList(value: List<String>?): String? {
        return value?.joinToString(",")
    }

    /**
     * Converts a comma-separated string back to a list of strings.
     */
    @TypeConverter
    fun toStringList(value: String?): List<String>? {
        return value?.split(",")?.filter { it.isNotEmpty() }
    }
}
