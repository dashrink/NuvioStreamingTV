package com.nuvio.app.tv.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nuvio.app.tv.data.repository.CatalogRepository
import com.nuvio.app.tv.data.repository.ProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.nuvio.app.tv.data.repository.Catalog
import com.nuvio.app.tv.data.repository.Meta
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = false,
    val catalogs: List<Catalog> = emptyList(),
    val metaCache: Map<String, Meta> = emptyList<Pair<String, Meta>>().toMap(),
    val continueWatching: List<Meta> = emptyList(),
    val watchlist: List<Meta> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val catalogRepository: CatalogRepository,
    private val profileRepository: ProfileRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadHomeData()
    }

    fun loadHomeData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            catalogRepository.getHomeCatalogs().fold(
                onSuccess = { catalogs ->
                    val allItemIds = catalogs.flatMap { it.itemIds }.distinct()
                    val metaMap = mutableMapOf<String, Meta>()

                    // Fetch all metas in parallel
                    allItemIds.forEach { id ->
                        catalogRepository.getMetadata(id).onSuccess { meta ->
                            metaMap[id] = meta
                        }
                    }

                    // Load continue watching from profile's watch history
                    val continueWatchingList = loadContinueWatching(metaMap)

                    // Simulate watchlist (next 8 items)
                    // TODO: Replace with real watchlist from profile preferences
                    val watchlistItems = allItemIds.drop(5).take(8).mapNotNull { metaMap[it] }

                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        catalogs = catalogs,
                        metaCache = metaMap,
                        continueWatching = continueWatchingList,
                        watchlist = watchlistItems
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.localizedMessage ?: "Unknown error"
                    )
                }
            )
        }
    }

    private suspend fun loadContinueWatching(metaMap: Map<String, Meta>): List<Meta> {
        // Get active profile and watch history
        val activeProfile = profileRepository.getActiveProfile().getOrNull()
        if (activeProfile != null) {
            val watchHistory = profileRepository.getWatchedHistory(activeProfile.id).getOrNull()
            if (!watchHistory.isNullOrEmpty()) {
                // Convert watch history to Meta objects, sorted by last watched
                return watchHistory
                    .sortedByDescending { it.lastWatchedAt }
                    .take(10)
                    .mapNotNull { watchedItem ->
                        metaMap[watchedItem.id] ?: catalogRepository.getMetadata(watchedItem.id).getOrNull()
                    }
            }
        }

        // Fallback to first 5 items if no watch history
        return metaMap.values.take(5)
    }
}
