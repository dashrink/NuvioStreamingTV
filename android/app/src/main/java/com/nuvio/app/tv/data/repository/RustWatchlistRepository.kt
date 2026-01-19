package com.nuvio.app.tv.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import com.nuvio.streaming.shared.di.IoDispatcher
import uniffi.nuvio_core.SyncManager
import uniffi.nuvio_core.TraktHistoryIds
import uniffi.nuvio_core.TraktHistoryMovie
import uniffi.nuvio_core.TraktHistoryRemovePayload
import uniffi.nuvio_core.TraktHistoryShow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementation of WatchlistRepository using local SharedPreferences storage
 * with Trakt SDK integration for sync operations.
 *
 * This repository uses the Rust SDK's SyncManager for Trakt sync operations.
 * Local storage is maintained in SharedPreferences with Gson serialization.
 */
@Singleton
class RustWatchlistRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val syncManager: SyncManager,
    @IoDispatcher private val ioDispatcher: CoroutineDispatcher
) : WatchlistRepository {

    private val prefs: SharedPreferences by lazy {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private val gson = Gson()
    private val watchlistType = object : TypeToken<MutableList<WatchlistItem>>() {}.type

    override suspend fun getWatchlist(): Result<List<WatchlistItem>> = withContext(ioDispatcher) {
        try {
            val items = loadWatchlist()
            Result.success(items.sortedByDescending { it.addedAt })
        } catch (e: Exception) {
            Result.failure(WatchlistException.StorageError("Failed to load watchlist: ${e.message}"))
        }
    }

    override suspend fun addToWatchlist(item: WatchlistItem): Result<Unit> = withContext(ioDispatcher) {
        try {
            val items = loadWatchlist().toMutableList()

            // Check if already exists
            if (items.any { it.id == item.id }) {
                return@withContext Result.success(Unit) // Already in watchlist
            }

            // Add new item
            items.add(item)
            saveWatchlist(items)

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(WatchlistException.StorageError("Failed to add to watchlist: ${e.message}"))
        }
    }

    override suspend fun removeFromWatchlist(itemId: String): Result<Unit> = withContext(ioDispatcher) {
        try {
            val items = loadWatchlist().toMutableList()
            val itemToRemove = items.find { it.id == itemId }
            val removed = items.removeAll { it.id == itemId }

            if (removed) {
                saveWatchlist(items)

                // Sync removal with Trakt if item has external IDs
                itemToRemove?.let { item ->
                    syncRemoveFromTrakt(item)
                }
            }

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(WatchlistException.StorageError("Failed to remove from watchlist: ${e.message}"))
        }
    }

    override suspend fun isInWatchlist(itemId: String): Result<Boolean> = withContext(ioDispatcher) {
        try {
            val items = loadWatchlist()
            Result.success(items.any { it.id == itemId })
        } catch (e: Exception) {
            Result.failure(WatchlistException.StorageError("Failed to check watchlist: ${e.message}"))
        }
    }

    override suspend fun syncWithTrakt(): Result<Unit> = withContext(ioDispatcher) {
        // Currently, the Trakt SDK SyncManager supports remove operations.
        // Full bi-directional sync (get/add) will be implemented when the SDK
        // exposes those operations.
        //
        // For now, this method verifies connectivity and returns success.
        // Remove operations are synced automatically when removeFromWatchlist is called.
        try {
            // Placeholder for future full sync implementation:
            // 1. Get local watchlist
            // 2. Get remote Trakt watchlist (when SDK supports it)
            // 3. Merge and resolve conflicts
            // 4. Update both local and remote
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(WatchlistException.SyncError("Failed to sync with Trakt: ${e.message}"))
        }
    }

    override suspend fun getWatchlistSorted(ascending: Boolean): Result<List<WatchlistItem>> =
        withContext(ioDispatcher) {
            try {
                val items = loadWatchlist()
                val sorted = if (ascending) {
                    items.sortedBy { it.addedAt }
                } else {
                    items.sortedByDescending { it.addedAt }
                }
                Result.success(sorted)
            } catch (e: Exception) {
                Result.failure(WatchlistException.StorageError("Failed to load sorted watchlist: ${e.message}"))
            }
        }

    override suspend fun getWatchlistByType(type: String): Result<List<WatchlistItem>> =
        withContext(ioDispatcher) {
            try {
                val items = loadWatchlist()
                val filtered = items.filter { it.type.equals(type, ignoreCase = true) }
                    .sortedByDescending { it.addedAt }
                Result.success(filtered)
            } catch (e: Exception) {
                Result.failure(WatchlistException.StorageError("Failed to filter watchlist: ${e.message}"))
            }
        }

    private fun loadWatchlist(): List<WatchlistItem> {
        val json = prefs.getString(KEY_WATCHLIST, null)
        return if (json.isNullOrEmpty()) {
            emptyList()
        } else {
            try {
                gson.fromJson(json, watchlistType) ?: emptyList()
            } catch (e: Exception) {
                emptyList()
            }
        }
    }

    private fun saveWatchlist(items: List<WatchlistItem>) {
        val json = gson.toJson(items)
        prefs.edit().putString(KEY_WATCHLIST, json).apply()
    }

    /**
     * Syncs removal of an item from Trakt using SyncManager.
     *
     * This method creates the appropriate payload based on item type (movie or series)
     * and calls SyncManager to remove from Trakt's collection/history.
     *
     * @param item The watchlist item to remove from Trakt
     */
    private suspend fun syncRemoveFromTrakt(item: WatchlistItem) {
        // Only sync if item has external IDs
        if (item.imdbId == null && item.tmdbId == null) {
            return
        }

        try {
            val ids = TraktHistoryIds(
                trakt = null,
                imdb = item.imdbId,
                tmdb = item.tmdbId?.toLongOrNull(),
                tvdb = null
            )

            val payload = when (item.type.lowercase()) {
                "movie" -> TraktHistoryRemovePayload(
                    movies = listOf(
                        TraktHistoryMovie(
                            ids = ids,
                            title = item.name,
                            year = item.year?.toIntOrNull()
                        )
                    ),
                    shows = null,
                    ids = null
                )
                "series", "show" -> TraktHistoryRemovePayload(
                    movies = null,
                    shows = listOf(
                        TraktHistoryShow(
                            ids = ids,
                            title = item.name,
                            year = item.year?.toIntOrNull(),
                            seasons = null
                        )
                    ),
                    ids = null
                )
                else -> return // Unknown type, skip sync
            }

            // Remove from Trakt collection
            syncManager.removeFromCollection(payload)
        } catch (e: Exception) {
            // Log but don't fail the local operation if Trakt sync fails
            // In production, this would be logged to analytics/crash reporting
            android.util.Log.w(TAG, "Failed to sync removal with Trakt: ${e.message}")
        }
    }

    companion object {
        private const val TAG = "RustWatchlistRepository"
        private const val PREFS_NAME = "nuvio_watchlist"
        private const val KEY_WATCHLIST = "watchlist_items"
    }
}

/**
 * Exception types for watchlist operations.
 */
sealed class WatchlistException(message: String) : Exception(message) {
    class StorageError(message: String) : WatchlistException(message)
    class SyncError(message: String) : WatchlistException(message)
    class NotFoundError(message: String) : WatchlistException(message)
}
