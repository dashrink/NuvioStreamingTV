package com.nuvio.streaming.shared.data.watchlist

import com.nuvio.streaming.shared.di.IoDispatcher
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import uniffi.nuvio_core.Trakt
import uniffi.nuvio_core.WatchedItem
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WatchlistRepository @Inject constructor(
    private val trakt: Trakt,
    @IoDispatcher private val ioDispatcher: CoroutineDispatcher
) {
    // Placeholder for watchlist sync.
    // The Trakt SDK SyncManager currently exposes remove operations.
    // Get/Add operations will be integrated when available in SDK.
    suspend fun getWatchlist(): List<WatchedItem> = withContext(ioDispatcher) {
        emptyList()
    }
}
