package com.nuvio.app.tv.ui.details

import androidx.lifecycle.ViewModel
import com.nuvio.app.tv.data.repository.CatalogRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import com.nuvio.app.tv.data.repository.Meta
import com.nuvio.app.tv.data.repository.Stream
import com.nuvio.app.tv.data.repository.Catalog
import javax.inject.Inject

@HiltViewModel
class DetailsViewModel @Inject constructor(
    private val repository: CatalogRepository
) : ViewModel() {
    suspend fun getMeta(id: String): Result<Meta> {
        return repository.getMetadata(id)
    }

    suspend fun getStreams(id: String, type: String): Result<List<Stream>> {
        return repository.getStreams(id, type)
    }
}
