package com.nuvio.app.tv.ui.library

import android.content.res.Configuration
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.nuvio.app.tv.data.repository.WatchlistItem
import com.nuvio.app.tv.ui.theme.OnSurfaceVariant
import com.nuvio.app.tv.ui.theme.SurfaceVariant
import com.nuvio.sdk.core.WatchedItem

@Composable
fun LibraryScreen(
    onContentClick: (String) -> Unit,
    onBack: () -> Unit,
    viewModel: LibraryViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val configuration = LocalConfiguration.current
    val isTv = (configuration.uiMode and Configuration.UI_MODE_TYPE_MASK) == Configuration.UI_MODE_TYPE_TELEVISION

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(if (isTv) 48.dp else 16.dp)
        ) {
            // Header with tabs
            LibraryHeader(
                selectedTab = uiState.selectedTab,
                onTabSelected = viewModel::onTabSelected,
                isTv = isTv
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Filters row
            if (uiState.selectedTab == LibraryTab.WATCHLIST) {
                FilterRow(
                    selectedFilter = uiState.selectedFilter,
                    onFilterSelected = viewModel::onFilterSelected,
                    selectedSort = uiState.selectedSort,
                    onSortSelected = viewModel::onSortSelected,
                    isTv = isTv
                )
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Content
            when {
                uiState.isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
                uiState.error != null -> {
                    ErrorState(
                        error = uiState.error!!,
                        onRetry = viewModel::refresh
                    )
                }
                else -> {
                    when (uiState.selectedTab) {
                        LibraryTab.WATCHLIST -> {
                            if (uiState.watchlist.isEmpty()) {
                                EmptyWatchlistState()
                            } else {
                                WatchlistGrid(
                                    items = uiState.watchlist,
                                    onItemClick = onContentClick,
                                    onRemoveItem = viewModel::removeFromWatchlist,
                                    isTv = isTv
                                )
                            }
                        }
                        LibraryTab.CONTINUE_WATCHING -> {
                            if (uiState.continueWatching.isEmpty()) {
                                EmptyContinueWatchingState()
                            } else {
                                ContinueWatchingList(
                                    items = uiState.continueWatching,
                                    onItemClick = onContentClick,
                                    onRemoveItem = { /* TODO: Clear from history */ },
                                    isTv = isTv
                                )
                            }
                        }
                        LibraryTab.DOWNLOADS -> {
                            EmptyDownloadsState()
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LibraryHeader(
    selectedTab: LibraryTab,
    onTabSelected: (LibraryTab) -> Unit,
    isTv: Boolean
) {
    Column {
        Text(
            text = "My Library",
            style = if (isTv) MaterialTheme.typography.displaySmall else MaterialTheme.typography.headlineMedium,
            color = Color.White,
            fontWeight = FontWeight.Bold
        )

        Spacer(modifier = Modifier.height(16.dp))

        TabRow(
            selectedTabIndex = LibraryTab.values().indexOf(selectedTab),
            containerColor = Color.Transparent,
            contentColor = Color.White,
            indicator = { tabPositions ->
                TabRowDefaults.SecondaryIndicator(
                    Modifier.tabIndicatorOffset(tabPositions[LibraryTab.values().indexOf(selectedTab)]),
                    color = MaterialTheme.colorScheme.primary
                )
            }
        ) {
            LibraryTab.values().forEach { tab ->
                Tab(
                    selected = selectedTab == tab,
                    onClick = { onTabSelected(tab) },
                    text = {
                        Text(
                            text = tab.title,
                            style = if (isTv) MaterialTheme.typography.titleMedium
                                    else MaterialTheme.typography.bodyMedium,
                            fontWeight = if (selectedTab == tab) FontWeight.Bold else FontWeight.Normal
                        )
                    },
                    icon = {
                        Icon(
                            imageVector = tab.icon,
                            contentDescription = tab.title
                        )
                    }
                )
            }
        }
    }
}

@Composable
private fun FilterRow(
    selectedFilter: WatchlistFilter,
    onFilterSelected: (WatchlistFilter) -> Unit,
    selectedSort: WatchlistSort,
    onSortSelected: (WatchlistSort) -> Unit,
    isTv: Boolean
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Type filters
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.weight(1f)
        ) {
            items(WatchlistFilter.values().toList()) { filter ->
                FilterChip(
                    selected = selectedFilter == filter,
                    onClick = { onFilterSelected(filter) },
                    label = { Text(filter.label) },
                    modifier = if (isTv) Modifier.height(40.dp) else Modifier
                )
            }
        }

        // Sort dropdown
        var sortExpanded by remember { mutableStateOf(false) }

        Box {
            TextButton(
                onClick = { sortExpanded = true }
            ) {
                Icon(
                    imageVector = Icons.Default.Sort,
                    contentDescription = "Sort",
                    tint = OnSurfaceVariant
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(selectedSort.label, color = OnSurfaceVariant)
            }

            DropdownMenu(
                expanded = sortExpanded,
                onDismissRequest = { sortExpanded = false }
            ) {
                WatchlistSort.values().forEach { sort ->
                    DropdownMenuItem(
                        text = { Text(sort.label) },
                        onClick = {
                            onSortSelected(sort)
                            sortExpanded = false
                        },
                        leadingIcon = {
                            if (selectedSort == sort) {
                                Icon(
                                    imageVector = Icons.Default.Check,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun WatchlistGrid(
    items: List<WatchlistItem>,
    onItemClick: (String) -> Unit,
    onRemoveItem: (String) -> Unit,
    isTv: Boolean
) {
    val columns = if (isTv) GridCells.Fixed(6) else GridCells.Adaptive(minSize = 120.dp)

    LazyVerticalGrid(
        columns = columns,
        contentPadding = PaddingValues(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(if (isTv) 16.dp else 12.dp),
        horizontalArrangement = Arrangement.spacedBy(if (isTv) 16.dp else 12.dp)
    ) {
        items(items, key = { it.id }) { item ->
            WatchlistItemCard(
                item = item,
                onClick = { onItemClick(item.id) },
                onRemove = { onRemoveItem(item.id) },
                isTv = isTv
            )
        }
    }
}

@Composable
private fun WatchlistItemCard(
    item: WatchlistItem,
    onClick: () -> Unit,
    onRemove: () -> Unit,
    isTv: Boolean
) {
    var isFocused by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .onFocusChanged { isFocused = it.isFocused }
            .clickable { onClick() }
    ) {
        Box(
            modifier = Modifier
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(8.dp))
                .border(
                    width = if (isFocused) 3.dp else 0.dp,
                    color = if (isFocused) MaterialTheme.colorScheme.primary else Color.Transparent,
                    shape = RoundedCornerShape(8.dp)
                )
        ) {
            AsyncImage(
                model = item.posterUrl,
                contentDescription = item.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Type badge
            Box(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(4.dp)
                    .background(
                        color = Color.Black.copy(alpha = 0.7f),
                        shape = RoundedCornerShape(4.dp)
                    )
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            ) {
                Text(
                    text = if (item.type == "movie") "Movie" else "Series",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White
                )
            }

            // More options (on focus for TV)
            AnimatedVisibility(
                visible = isFocused,
                enter = fadeIn(),
                exit = fadeOut(),
                modifier = Modifier.align(Alignment.TopEnd)
            ) {
                Box {
                    IconButton(
                        onClick = { showMenu = true },
                        modifier = Modifier
                            .padding(4.dp)
                            .size(32.dp)
                            .background(
                                color = Color.Black.copy(alpha = 0.7f),
                                shape = CircleShape
                            )
                    ) {
                        Icon(
                            imageVector = Icons.Default.MoreVert,
                            contentDescription = "Options",
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }

                    DropdownMenu(
                        expanded = showMenu,
                        onDismissRequest = { showMenu = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("Remove from Watchlist") },
                            onClick = {
                                onRemove()
                                showMenu = false
                            },
                            leadingIcon = {
                                Icon(
                                    imageVector = Icons.Default.Delete,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.error
                                )
                            }
                        )
                    }
                }
            }

            // Rating badge
            item.rating?.let { rating ->
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(4.dp)
                        .background(
                            color = Color.Black.copy(alpha = 0.7f),
                            shape = RoundedCornerShape(4.dp)
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Star,
                            contentDescription = null,
                            tint = Color(0xFFFFD700),
                            modifier = Modifier.size(12.dp)
                        )
                        Text(
                            text = String.format("%.1f", rating),
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = item.name,
            style = if (isTv) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.bodySmall,
            color = if (isFocused) Color.White else Color.White.copy(alpha = 0.8f),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            fontWeight = if (isFocused) FontWeight.Bold else FontWeight.Normal
        )

        item.year?.let { year ->
            Text(
                text = year,
                style = MaterialTheme.typography.labelSmall,
                color = OnSurfaceVariant.copy(alpha = 0.7f)
            )
        }
    }
}

@Composable
private fun ContinueWatchingList(
    items: List<WatchedItem>,
    onItemClick: (String) -> Unit,
    onRemoveItem: (String) -> Unit,
    isTv: Boolean
) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(if (isTv) 16.dp else 12.dp),
        contentPadding = PaddingValues(bottom = 32.dp)
    ) {
        items(items, key = { it.id }) { item ->
            ContinueWatchingCard(
                item = item,
                onClick = { onItemClick(item.id) },
                onRemove = { onRemoveItem(item.id) },
                isTv = isTv
            )
        }
    }
}

@Composable
private fun ContinueWatchingCard(
    item: WatchedItem,
    onClick: () -> Unit,
    onRemove: () -> Unit,
    isTv: Boolean
) {
    var isFocused by remember { mutableStateOf(false) }
    val progress = if (item.duration > 0) (item.progress / item.duration).toFloat() else 0f

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .onFocusChanged { isFocused = it.isFocused }
            .clickable { onClick() }
            .background(
                if (isFocused) SurfaceVariant.copy(alpha = 0.3f) else Color.Transparent,
                RoundedCornerShape(8.dp)
            )
            .border(
                width = if (isFocused) 2.dp else 0.dp,
                color = if (isFocused) MaterialTheme.colorScheme.primary else Color.Transparent,
                shape = RoundedCornerShape(8.dp)
            )
            .padding(if (isTv) 16.dp else 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Poster
        Box(
            modifier = Modifier
                .width(if (isTv) 120.dp else 80.dp)
                .aspectRatio(16f / 9f)
                .clip(RoundedCornerShape(4.dp))
        ) {
            AsyncImage(
                model = item.poster,
                contentDescription = item.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Play icon overlay
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.PlayArrow,
                    contentDescription = "Play",
                    tint = Color.White,
                    modifier = Modifier.size(if (isTv) 32.dp else 24.dp)
                )
            }

            // Progress bar
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .height(4.dp),
                color = MaterialTheme.colorScheme.primary,
                trackColor = Color.White.copy(alpha = 0.3f)
            )
        }

        Spacer(modifier = Modifier.width(16.dp))

        // Info
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.title,
                style = if (isTv) MaterialTheme.typography.titleMedium
                        else MaterialTheme.typography.bodyMedium,
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(4.dp))

            val remainingMinutes = ((item.duration - item.progress) / 60).toInt()
            Text(
                text = "$remainingMinutes min remaining",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceVariant
            )
        }

        // Remove button (visible on focus for TV)
        if (isFocused || !isTv) {
            IconButton(onClick = onRemove) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Remove",
                    tint = OnSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun EmptyWatchlistState() {
    EmptyState(
        icon = Icons.Default.BookmarkBorder,
        title = "Your Watchlist is Empty",
        message = "Add movies and shows you want to watch later"
    )
}

@Composable
private fun EmptyContinueWatchingState() {
    EmptyState(
        icon = Icons.Default.PlayCircleOutline,
        title = "Nothing to Continue",
        message = "Start watching something to see it here"
    )
}

@Composable
private fun EmptyDownloadsState() {
    EmptyState(
        icon = Icons.Default.DownloadForOffline,
        title = "No Downloads",
        message = "Download movies and shows to watch offline"
    )
}

@Composable
private fun EmptyState(
    icon: ImageVector,
    title: String,
    message: String
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = OnSurfaceVariant.copy(alpha = 0.5f),
                modifier = Modifier.size(64.dp)
            )
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                color = Color.White
            )
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurfaceVariant.copy(alpha = 0.7f),
                textAlign = TextAlign.Center
            )
        }
    }
}

@Composable
private fun ErrorState(
    error: String,
    onRetry: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Error,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.size(64.dp)
            )
            Text(
                text = "Something went wrong",
                style = MaterialTheme.typography.titleLarge,
                color = Color.White
            )
            Text(
                text = error,
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurfaceVariant.copy(alpha = 0.7f),
                textAlign = TextAlign.Center
            )
            Button(onClick = onRetry) {
                Text("Try Again")
            }
        }
    }
}

enum class LibraryTab(val title: String, val icon: ImageVector) {
    WATCHLIST("Watchlist", Icons.Default.Bookmark),
    CONTINUE_WATCHING("Continue Watching", Icons.Default.History),
    DOWNLOADS("Downloads", Icons.Default.Download)
}

enum class WatchlistFilter(val label: String) {
    ALL("All"),
    MOVIES("Movies"),
    SERIES("TV Shows")
}

enum class WatchlistSort(val label: String) {
    DATE_ADDED("Date Added"),
    NAME("Name"),
    RATING("Rating")
}
