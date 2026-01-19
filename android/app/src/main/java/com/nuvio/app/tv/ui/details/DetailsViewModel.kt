package com.nuvio.app.tv.ui.details

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nuvio.app.tv.data.repository.CatalogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import com.nuvio.app.tv.data.repository.Meta
import com.nuvio.app.tv.data.repository.Stream
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DetailsUiState(
    val isLoading: Boolean = true,
    val meta: Meta? = null,
    val streams: List<Stream> = emptyList(),
    val error: String? = null,
    val isInWatchlist: Boolean = false,
    val userRating: Int? = null
)

@HiltViewModel
class DetailsViewModel @Inject constructor(
    private val repository: CatalogRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DetailsUiState())
    val uiState: StateFlow<DetailsUiState> = _uiState.asStateFlow()

    fun loadDetails(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val metaResult = repository.getMetadata(id)
            metaResult.fold(
                onSuccess = { meta ->
                    _uiState.value = _uiState.value.copy(
                        meta = meta,
                        isLoading = false
                    )

                    // Load streams in background
                    loadStreams(id, meta.type)
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to load content details"
                    )
                }
            )
        }
    }

    private fun loadStreams(id: String, type: String) {
        viewModelScope.launch {
            val streamsResult = repository.getStreams(id, type)
            streamsResult.fold(
                onSuccess = { streams ->
                    _uiState.value = _uiState.value.copy(streams = streams)
                },
                onFailure = { error ->
                    // Streams failure is not critical, just log it
                    error.printStackTrace()
                }
            )
        }
    }

    fun toggleWatchlist() {
        _uiState.value = _uiState.value.copy(
            isInWatchlist = !_uiState.value.isInWatchlist
        )
        // TODO: Persist to ProfileRepository via profile preferences
        // The Rust SDK ProfileManager stores preferences in Profile.preferences
        // Need to update profile with watchlist items in preferences field
    }

    fun rateContent(rating: Int) {
        _uiState.value = _uiState.value.copy(userRating = rating)
        // TODO: Submit rating to ProfileRepository via profile preferences
        // The Rust SDK ProfileManager stores preferences in Profile.preferences
        // Need to update profile with ratings in preferences field
    }

    suspend fun getMeta(id: String): Result<Meta> {
        return repository.getMetadata(id)
    }

    suspend fun getStreams(id: String, type: String): Result<List<Stream>> {
        return repository.getStreams(id, type)
    }
}
