package com.nuvio.streaming.shared.data.search

import com.nuvio.streaming.shared.di.IoDispatcher
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import uniffi.nuvio_core.Trakt
import uniffi.nuvio_core.TraktSearchResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SearchRepository @Inject constructor(
    private val trakt: Trakt,
    @IoDispatcher private val ioDispatcher: CoroutineDispatcher
) {

    suspend fun search(query: String, type: String = "movie"): List<TraktSearchResult> = withContext(ioDispatcher) {
        try {
            trakt.search().searchText(type, query)
        } catch (e: Exception) {
            // Log error in production
            emptyList()
        }
    }
}
