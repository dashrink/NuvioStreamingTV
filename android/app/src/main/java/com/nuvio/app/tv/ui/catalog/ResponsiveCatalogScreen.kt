package com.nuvio.app.tv.ui.catalog

import android.content.res.Configuration
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
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.nuvio.app.tv.ui.components.FilterChip
import com.nuvio.app.tv.ui.components.PosterCard

/**
 * Responsive catalog browse screen that adapts to TV (6 columns) and mobile (2-3 columns)
 */
@Composable
fun ResponsiveCatalogBrowseScreen(
    onContentClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: CatalogBrowseViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val gridState = rememberLazyGridState()
    val configuration = LocalConfiguration.current

    // Determine grid columns based on screen width and orientation
    val gridColumns = remember(configuration.screenWidthDp, configuration.orientation) {
        when {
            // TV or large tablet in landscape
            configuration.screenWidthDp >= 1280 -> 6
            // Large tablet or TV in portrait
            configuration.screenWidthDp >= 900 -> 4
            // Tablet or large phone in landscape
            configuration.screenWidthDp >= 600 -> 3
            // Phone or small tablet
            else -> 2
        }
    }

    // Determine padding based on platform
    val horizontalPadding = remember(configuration.screenWidthDp) {
        when {
            configuration.screenWidthDp >= 1280 -> 40.dp // TV
            configuration.screenWidthDp >= 600 -> 24.dp  // Tablet
            else -> 16.dp                                 // Phone
        }
    }

    // Detect when scrolled near the end for infinite scroll
    LaunchedEffect(gridState.layoutInfo.visibleItemsInfo.lastOrNull()?.index) {
        val lastVisibleIndex = gridState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
        val totalItems = uiState.items.size

        // Load more when we're near the end (one row away)
        val loadThreshold = gridColumns
        if (lastVisibleIndex >= totalItems - loadThreshold && uiState.hasMore && !uiState.isLoadingMore) {
            viewModel.loadMore()
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = horizontalPadding, vertical = 16.dp)
    ) {
        // Title
        Text(
            text = "Browse ${if (uiState.filterState.contentType == "movie") "Movies" else "Series"}",
            style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.onSurface
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Filter Section
        ResponsiveFilterSection(
            filterState = uiState.filterState,
            availableGenres = uiState.availableGenres,
            onContentTypeChange = { viewModel.setContentType(it) },
            onGenreChange = { viewModel.setGenre(it) },
            onSortChange = { viewModel.setSort(it) },
            onClearFilters = { viewModel.clearFilters() },
            isMobile = configuration.screenWidthDp < 900
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Content Grid
        Box(modifier = Modifier.fillMaxSize()) {
            when {
                uiState.isLoading -> {
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
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(gridColumns),
                        state = gridState,
                        contentPadding = PaddingValues(bottom = 24.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(uiState.items, key = { it.id }) { meta ->
                            PosterCard(
                                meta = meta,
                                onClick = { onContentClick(meta.id) }
                            )
                        }

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
private fun ResponsiveFilterSection(
    filterState: FilterState,
    availableGenres: List<String>,
    onContentTypeChange: (String) -> Unit,
    onGenreChange: (String?) -> Unit,
    onSortChange: (SortOption) -> Unit,
    onClearFilters: () -> Unit,
    isMobile: Boolean,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth()) {
        // Content Type Toggle
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .then(if (isMobile) Modifier.padding(vertical = 4.dp) else Modifier)
        ) {
            if (!isMobile) {
                Text(
                    text = "Type:",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
            FilterChip(
                text = "Movies",
                selected = filterState.contentType == "movie",
                onClick = { onContentTypeChange("movie") },
                modifier = if (isMobile) Modifier.weight(1f) else Modifier
            )
            FilterChip(
                text = "Series",
                selected = filterState.contentType == "series",
                onClick = { onContentTypeChange("series") },
                modifier = if (isMobile) Modifier.weight(1f) else Modifier
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Sort Options (horizontal scroll on mobile)
        if (isMobile) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 4.dp)
            ) {
                items(SortOption.values().toList()) { sortOption ->
                    FilterChip(
                        text = sortOption.displayName,
                        selected = filterState.sort == sortOption,
                        onClick = { onSortChange(sortOption) }
                    )
                }
            }
        } else {
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
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Genre Filter (always horizontally scrollable)
        if (availableGenres.isNotEmpty()) {
            Column {
                if (!isMobile) {
                    Text(
                        text = "Genre:",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(vertical = 4.dp)
                ) {
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

        // Clear filters button
        if (filterState.genre != null || filterState.year != null || filterState.sort != SortOption.TRENDING) {
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = onClearFilters,
                modifier = if (isMobile) Modifier.fillMaxWidth() else Modifier,
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
