package com.nuvio.app.tv.ui.catalog

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.nuvio.app.tv.data.repository.Meta
import com.nuvio.app.tv.ui.components.FilterChip
import com.nuvio.app.tv.ui.components.PosterCard
import kotlinx.coroutines.launch

/**
 * Catalog browse screen for Android TV with 6-column grid layout
 */
@Composable
fun CatalogBrowseScreen(
    onContentClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: CatalogBrowseViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val gridState = rememberLazyGridState()
    val coroutineScope = rememberCoroutineScope()

    // Detect when scrolled near the end for infinite scroll
    LaunchedEffect(gridState.layoutInfo.visibleItemsInfo.lastOrNull()?.index) {
        val lastVisibleIndex = gridState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
        val totalItems = uiState.items.size

        // Load more when we're 6 items (1 row) from the end
        if (lastVisibleIndex >= totalItems - 6 && uiState.hasMore && !uiState.isLoadingMore) {
            viewModel.loadMore()
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 40.dp, vertical = 24.dp)
    ) {
        // Title
        Text(
            text = "Browse ${if (uiState.filterState.contentType == "movie") "Movies" else "Series"}",
            style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.onSurface
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Filter Section
        FilterSection(
            filterState = uiState.filterState,
            availableGenres = uiState.availableGenres,
            onContentTypeChange = { viewModel.setContentType(it) },
            onGenreChange = { viewModel.setGenre(it) },
            onSortChange = { viewModel.setSort(it) },
            onClearFilters = { viewModel.clearFilters() }
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Content Grid
        Box(modifier = Modifier.fillMaxSize()) {
            when {
                uiState.isLoading -> {
                    // Loading state
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }

                uiState.error != null -> {
                    // Error state
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = uiState.error ?: "Unknown error",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.error,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.retry() }) {
                            Text("Retry")
                        }
                    }
                }

                uiState.items.isEmpty() -> {
                    // Empty state
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No items found",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }

                else -> {
                    // Content grid with 6 columns for TV
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(6),
                        state = gridState,
                        contentPadding = PaddingValues(bottom = 24.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(uiState.items, key = { it.id }) { meta ->
                            PosterCard(
                                meta = meta,
                                onClick = { onContentClick(meta.id) }
                            )
                        }

                        // Loading indicator at the bottom when loading more
                        if (uiState.isLoadingMore) {
                            item {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(
                                        modifier = Modifier.size(24.dp),
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FilterSection(
    filterState: FilterState,
    availableGenres: List<String>,
    onContentTypeChange: (String) -> Unit,
    onGenreChange: (String?) -> Unit,
    onSortChange: (SortOption) -> Unit,
    onClearFilters: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        // Content Type Toggle
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Type:",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurface
            )
            FilterChip(
                text = "Movies",
                selected = filterState.contentType == "movie",
                onClick = { onContentTypeChange("movie") }
            )
            FilterChip(
                text = "Series",
                selected = filterState.contentType == "series",
                onClick = { onContentTypeChange("series") }
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Sort Options
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Sort:",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurface
            )
            SortOption.values().forEach { sortOption ->
                FilterChip(
                    text = sortOption.displayName,
                    selected = filterState.sort == sortOption,
                    onClick = { onSortChange(sortOption) }
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Genre Filter (horizontally scrollable)
        if (availableGenres.isNotEmpty()) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Genre:",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.width(60.dp)
                )
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(end = 40.dp)
                ) {
                    // All genres option
                    item {
                        FilterChip(
                            text = "All",
                            selected = filterState.genre == null,
                            onClick = { onGenreChange(null) }
                        )
                    }

                    items(availableGenres) { genre ->
                        FilterChip(
                            text = genre.replaceFirstChar { it.uppercase() },
                            selected = filterState.genre == genre,
                            onClick = { onGenreChange(genre) }
                        )
                    }
                }
            }
        }

        // Clear filters button (only show if filters are applied)
        if (filterState.genre != null || filterState.year != null || filterState.sort != SortOption.TRENDING) {
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = onClearFilters,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = MaterialTheme.colorScheme.onSurfaceVariant
                )
            ) {
                Text("Clear Filters")
            }
        }
    }
}
