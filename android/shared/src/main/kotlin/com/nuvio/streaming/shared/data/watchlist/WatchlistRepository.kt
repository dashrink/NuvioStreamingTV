package com.nuvio.streaming.shared.data.watchlist

import com.nuvio.streaming.shared.di.IoDispatcher
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import uniffi.nuvio_core.SyncManager
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for watchlist operations using the Trakt API.
 *
 * This repository provides watchlist functionality using the Rust SDK's SyncManager.
 * Note: Currently a placeholder. Get/Add operations will be integrated when
 * fully available in the SDK.
 */
@Singleton
class WatchlistRepository @Inject constructor(
    private val syncManager: SyncManager,
    @IoDispatcher private val ioDispatcher: CoroutineDispatcher
) {
    // Placeholder for watchlist sync.
    // The Trakt SDK SyncManager currently exposes remove operations.
    // Get/Add operations will be integrated when available in SDK.

    /**
     * Get the user's watchlist.
     *
     * @return List of watched items (currently empty - placeholder implementation)
     */
    suspend fun getWatchlist(): List<Any> = withContext(ioDispatcher) {
        // TODO: Implement when SyncManager exposes get watchlist operations
        emptyList()
    }
}
