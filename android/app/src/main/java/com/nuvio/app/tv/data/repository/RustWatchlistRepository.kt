package com.nuvio.app.tv.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import com.nuvio.streaming.shared.di.IoDispatcher
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementation of WatchlistRepository using local SharedPreferences storage
 * with optional Trakt SDK integration for sync.
 *
 * Note: Full Trakt sync will be enabled when the SDK exposes add/get watchlist operations.
 */
@Singleton
class RustWatchlistRepository @Inject constructor(
    @ApplicationContext private val context: Context,
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
            val removed = items.removeAll { it.id == itemId }

            if (removed) {
                saveWatchlist(items)
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
        // TODO: Implement when Trakt SDK exposes full watchlist sync operations
        // For now, this is a no-op that returns success
        // The actual implementation would:
        // 1. Get local watchlist
        // 2. Get remote Trakt watchlist
        // 3. Merge and resolve conflicts
        // 4. Update both local and remote
        Result.success(Unit)
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

    companion object {
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
