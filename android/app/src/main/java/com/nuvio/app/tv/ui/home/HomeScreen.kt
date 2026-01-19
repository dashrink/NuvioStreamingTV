package com.nuvio.app.tv.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun HomeScreen(
    onContentClick: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        if (uiState.isLoading && uiState.catalogs.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            }
        } else if (uiState.error != null) {
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(text = "Error: ${uiState.error}", color = Color.White)
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = { viewModel.loadHomeData() }) {
                    Text("Retry")
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 32.dp)
            ) {
                // Hero Section
                val heroItems = uiState.catalogs.firstOrNull()?.itemIds?.mapNotNull { uiState.metaCache[it] } ?: emptyList()
                if (heroItems.isNotEmpty()) {
                    item {
                        HeroCarousel(
                            items = heroItems,
                            onPlayClick = { /* Navigate to player */ },
                            onInfoClick = { onContentClick(it.id) }
                        )
                    }
                }

                // Continue Watching Section
                if (uiState.continueWatching.isNotEmpty()) {
                    item {
                        ContentRow(
                            title = "Continue Watching",
                            items = uiState.continueWatching,
                            onItemClick = { onContentClick(it.id) }
                        )
                    }
                }

                // Watchlist Section
                if (uiState.watchlist.isNotEmpty()) {
                    item {
                        ContentRow(
                            title = "My Watchlist",
                            items = uiState.watchlist,
                            onItemClick = { onContentClick(it.id) }
                        )
                    }
                }

                // Category Rows from Catalogs
                items(uiState.catalogs) { catalog ->
                    val catalogItems = catalog.itemIds.mapNotNull { uiState.metaCache[it] }
                    if (catalogItems.isNotEmpty()) {
                        ContentRow(
                            title = catalog.name,
                            items = catalogItems,
                            onItemClick = { onContentClick(it.id) }
                        )
                    }
                }
            }
        }
    }
}
