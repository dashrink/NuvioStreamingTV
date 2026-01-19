package com.nuvio.app.tv.data.repository

/**
 * Repository interface for watchlist management operations.
 * Provides access to user's watchlist with local storage and optional Trakt sync.
 */
interface WatchlistRepository {
    /**
     * Gets all items in the watchlist.
     * @return Result containing list of watchlist items
     */
    suspend fun getWatchlist(): Result<List<WatchlistItem>>

    /**
     * Adds an item to the watchlist.
     * @param item The item to add
     * @return Result indicating success or error
     */
    suspend fun addToWatchlist(item: WatchlistItem): Result<Unit>

    /**
     * Removes an item from the watchlist.
     * @param itemId The ID of the item to remove
     * @return Result indicating success or error
     */
    suspend fun removeFromWatchlist(itemId: String): Result<Unit>

    /**
     * Checks if an item is in the watchlist.
     * @param itemId The ID to check
     * @return Result containing true if in watchlist
     */
    suspend fun isInWatchlist(itemId: String): Result<Boolean>

    /**
     * Syncs watchlist with Trakt (if authenticated).
     * @return Result indicating sync success or error
     */
    suspend fun syncWithTrakt(): Result<Unit>

    /**
     * Gets watchlist items sorted by date added.
     * @param ascending True for oldest first, false for newest first
     * @return Result containing sorted watchlist items
     */
    suspend fun getWatchlistSorted(ascending: Boolean = false): Result<List<WatchlistItem>>

    /**
     * Gets watchlist items filtered by type.
     * @param type "movie" or "series"
     * @return Result containing filtered watchlist items
     */
    suspend fun getWatchlistByType(type: String): Result<List<WatchlistItem>>
}

/**
 * Represents an item in the user's watchlist.
 */
data class WatchlistItem(
    val id: String,
    val type: String, // "movie" or "series"
    val name: String,
    val posterUrl: String?,
    val year: String?,
    val rating: Double?,
    val addedAt: Long = System.currentTimeMillis(),
    val imdbId: String? = null,
    val tmdbId: String? = null
)
