package com.nuvio.app.tv.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nuvio.app.tv.data.repository.ProfileRepository
import com.nuvio.app.tv.data.repository.WatchlistItem
import com.nuvio.app.tv.data.repository.WatchlistRepository
import uniffi.nuvio_core.WatchedItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LibraryUiState(
    val selectedTab: LibraryTab = LibraryTab.WATCHLIST,
    val watchlist: List<WatchlistItem> = emptyList(),
    val continueWatching: List<WatchedItem> = emptyList(),
    val selectedFilter: WatchlistFilter = WatchlistFilter.ALL,
    val selectedSort: WatchlistSort = WatchlistSort.DATE_ADDED,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class LibraryViewModel @Inject constructor(
    private val watchlistRepository: WatchlistRepository,
    private val profileRepository: ProfileRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(LibraryUiState())
    val uiState: StateFlow<LibraryUiState> = _uiState.asStateFlow()

    init {
        loadLibraryData()
    }

    private fun loadLibraryData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // Load watchlist
                val watchlistResult = watchlistRepository.getWatchlist()
                val watchlist = watchlistResult.getOrNull() ?: emptyList()

                // Load continue watching from active profile
                val activeProfile = profileRepository.getActiveProfile().getOrNull()
                val continueWatching = activeProfile?.let { profile ->
                    profileRepository.getWatchedHistory(profile.id).getOrNull()
                } ?: emptyList()

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        watchlist = applyFiltersAndSort(watchlist),
                        continueWatching = continueWatching.sortedByDescending { item -> item.lastWatchedAt }
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.localizedMessage ?: "Failed to load library"
                    )
                }
            }
        }
    }

    fun onTabSelected(tab: LibraryTab) {
        _uiState.update { it.copy(selectedTab = tab) }

        // Reload data for the selected tab if needed
        when (tab) {
            LibraryTab.WATCHLIST -> loadWatchlist()
            LibraryTab.CONTINUE_WATCHING -> loadContinueWatching()
            LibraryTab.DOWNLOADS -> { /* Downloads not implemented yet */ }
        }
    }

    fun onFilterSelected(filter: WatchlistFilter) {
        _uiState.update { it.copy(selectedFilter = filter) }
        reloadWatchlistWithFilters()
    }

    fun onSortSelected(sort: WatchlistSort) {
        _uiState.update { it.copy(selectedSort = sort) }
        reloadWatchlistWithFilters()
    }

    private fun loadWatchlist() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            watchlistRepository.getWatchlist().fold(
                onSuccess = { items ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            watchlist = applyFiltersAndSort(items)
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.localizedMessage
                        )
                    }
                }
            )
        }
    }

    private fun loadContinueWatching() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                val activeProfile = profileRepository.getActiveProfile().getOrNull()
                val history = activeProfile?.let { profile ->
                    profileRepository.getWatchedHistory(profile.id).getOrNull()
                } ?: emptyList()

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        continueWatching = history
                            .filter { item -> item.progress > 0 && item.progress < item.duration * 0.95 }
                            .sortedByDescending { item -> item.lastWatchedAt }
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.localizedMessage
                    )
                }
            }
        }
    }

    private fun reloadWatchlistWithFilters() {
        viewModelScope.launch {
            val filter = _uiState.value.selectedFilter

            val result = when (filter) {
                WatchlistFilter.ALL -> watchlistRepository.getWatchlist()
                WatchlistFilter.MOVIES -> watchlistRepository.getWatchlistByType("movie")
                WatchlistFilter.SERIES -> watchlistRepository.getWatchlistByType("series")
            }

            result.fold(
                onSuccess = { items ->
                    _uiState.update {
                        it.copy(watchlist = applySort(items))
                    }
                },
                onFailure = { /* Keep current list on error */ }
            )
        }
    }

    private fun applyFiltersAndSort(items: List<WatchlistItem>): List<WatchlistItem> {
        val filtered = when (_uiState.value.selectedFilter) {
            WatchlistFilter.ALL -> items
            WatchlistFilter.MOVIES -> items.filter { it.type.equals("movie", ignoreCase = true) }
            WatchlistFilter.SERIES -> items.filter {
                it.type.equals("series", ignoreCase = true) || it.type.equals("show", ignoreCase = true)
            }
        }
        return applySort(filtered)
    }

    private fun applySort(items: List<WatchlistItem>): List<WatchlistItem> {
        return when (_uiState.value.selectedSort) {
            WatchlistSort.DATE_ADDED -> items.sortedByDescending { it.addedAt }
            WatchlistSort.NAME -> items.sortedBy { it.name.lowercase() }
            WatchlistSort.RATING -> items.sortedByDescending { it.rating ?: 0.0 }
        }
    }

    fun addToWatchlist(item: WatchlistItem) {
        viewModelScope.launch {
            watchlistRepository.addToWatchlist(item).fold(
                onSuccess = {
                    loadWatchlist()
                },
                onFailure = { error ->
                    _uiState.update { it.copy(error = error.localizedMessage) }
                }
            )
        }
    }

    fun removeFromWatchlist(itemId: String) {
        viewModelScope.launch {
            watchlistRepository.removeFromWatchlist(itemId).fold(
                onSuccess = {
                    // Update local state immediately for responsiveness
                    _uiState.update { state ->
                        state.copy(
                            watchlist = state.watchlist.filter { it.id != itemId }
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update { it.copy(error = error.localizedMessage) }
                }
            )
        }
    }

    fun refresh() {
        loadLibraryData()
    }

    fun syncWithTrakt() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            watchlistRepository.syncWithTrakt().fold(
                onSuccess = {
                    loadWatchlist()
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = "Sync failed: ${error.localizedMessage}"
                        )
                    }
                }
            )
        }
    }
}
