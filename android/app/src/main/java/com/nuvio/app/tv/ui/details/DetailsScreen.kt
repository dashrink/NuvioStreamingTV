package com.nuvio.app.tv.ui.details

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.runtime.rememberCoroutineScope
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.launch
import com.nuvio.app.tv.data.repository.CatalogRepository
import com.nuvio.app.tv.data.repository.Meta

@Composable
fun DetailsScreen(
    id: String,
    onPlayClick: (String) -> Unit,
    onBack: () -> Unit,
    viewModel: DetailsViewModel = hiltViewModel()
) {
    /*
    var meta by remember { mutableStateOf<Meta?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(id) {
        viewModel.getMeta(id).fold(
            onSuccess = { 
                meta = it
                isLoading = false
            },
            onFailure = { 
                error = it.message
                isLoading = false
            }
        )
    }

    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        if (isLoading) {
            CircularProgressIndicator()
        } else if (error != null) {
            Text(text = error ?: "Unknown error", color = MaterialTheme.colorScheme.error)
        } else {
            meta?.let {
                ContentDetailSheet(
                    meta = it,
                    onPlayClick = {
                        scope.launch {
                            isLoading = true // Show loading while fetching streams
                            viewModel.getStreams(it.id, it.type).fold(
                                onSuccess = { streams ->
                                    isLoading = false
                                    if (streams.isNotEmpty()) {
                                        // Auto-play first stream for now
                                        // TODO: Show stream selection dialog
                                        streams.first().url?.let { url -> onPlayClick(url) }
                                    } else {
                                        // TODO: Show "No streams found" toast/error
                                        error = "No streams found"
                                    }
                                },
                                onFailure = { e ->
                                    isLoading = false
                                    error = "Failed to fetch streams: ${e.message}"
                                }
                            )
                        }
                    },
                    onDismiss = onBack,
                    modifier = Modifier.align(Alignment.BottomCenter)
                )
            }
        }
    }
    */
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("Details for $id")
    }
}
