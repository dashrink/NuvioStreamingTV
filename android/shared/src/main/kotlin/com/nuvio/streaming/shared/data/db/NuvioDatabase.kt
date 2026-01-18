package com.nuvio.streaming.shared.data.db

import androidx.room.Database
import androidx.room.RoomDatabase
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
 * Currently, this is a minimal setup with no entities defined. Entities will be added
 * as the data layer is expanded to include:
 * - Content metadata (movies, shows, episodes)
 * - User watch history
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
    entities = [],  // Entities will be added in future phases (e.g., ContentEntity, WatchHistoryEntity)
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
 * Type converters for Room database.
 *
 * Room requires type converters for non-primitive types that need to be stored
 * in the SQLite database. These converters handle serialization/deserialization
 * of complex types.
 *
 * ## Supported Conversions
 *
 * Currently, this is a placeholder for future type converters. Common converters
 * that may be added include:
 * - Date/Timestamp conversions (Long <-> Date)
 * - List conversions (String <-> List<T>)
 * - Enum conversions (String <-> Enum)
 * - JSON conversions (String <-> Complex objects)
 *
 * ## Usage Example
 *
 * ```kotlin
 * @TypeConverter
 * fun fromTimestamp(value: Long?): Date? {
 *     return value?.let { Date(it) }
 * }
 *
 * @TypeConverter
 * fun dateToTimestamp(date: Date?): Long? {
 *     return date?.time
 * }
 * ```
 */
class DatabaseConverters {
    // Type converters will be added here as needed
    // Example for future implementation:
    // @TypeConverter
    // fun fromStringList(value: String): List<String> = value.split(",")
    //
    // @TypeConverter
    // fun toStringList(list: List<String>): String = list.joinToString(",")
}
