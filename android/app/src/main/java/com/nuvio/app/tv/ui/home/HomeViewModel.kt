package com.nuvio.app.tv.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nuvio.app.tv.data.repository.CatalogRepository
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
    val error: String? = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: CatalogRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadHomeData()
    }

    fun loadHomeData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            repository.getHomeCatalogs().fold(
                onSuccess = { catalogs ->
                    val allItemIds = catalogs.flatMap { it.itemIds }.distinct()
                    val metaMap = mutableMapOf<String, Meta>()
                    
                    // Fetch all metas in parallel
                    allItemIds.forEach { id ->
                        repository.getMetadata(id).onSuccess { meta ->
                            metaMap[id] = meta
                        }
                    }
                    
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        catalogs = catalogs,
                        metaCache = metaMap
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
}
