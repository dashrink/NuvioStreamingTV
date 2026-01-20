package com.nuvio.app.tv.ui.search

import android.app.Activity
import android.content.Intent
import android.content.res.Configuration
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.nuvio.app.tv.data.repository.Meta
import com.nuvio.app.tv.ui.theme.OnSurfaceVariant
import com.nuvio.app.tv.ui.theme.SurfaceVariant

@Composable
fun SearchScreen(
    onContentClick: (String) -> Unit,
    onBack: () -> Unit,
    viewModel: SearchViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val configuration = LocalConfiguration.current
    val isTv = (configuration.uiMode and Configuration.UI_MODE_TYPE_MASK) == Configuration.UI_MODE_TYPE_TELEVISION

    // Voice search launcher
    val voiceSearchLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val matches = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            matches?.firstOrNull()?.let { voiceQuery ->
                viewModel.onQueryChange(voiceQuery)
            }
        }
    }

    val startVoiceSearch = {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Search for movies and TV shows")
        }
        voiceSearchLauncher.launch(intent)
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(if (isTv) 48.dp else 16.dp)
        ) {
            // Search Header
            SearchHeader(
                query = uiState.query,
                onQueryChange = viewModel::onQueryChange,
                onVoiceSearch = startVoiceSearch,
                onClear = { viewModel.onQueryChange("") },
                isTv = isTv
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Filter Chips
            FilterChipsRow(
                selectedType = uiState.selectedType,
                onTypeChange = viewModel::onTypeChange,
                selectedGenre = uiState.selectedGenre,
                onGenreChange = viewModel::onGenreChange,
                isTv = isTv
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Content
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
                    ErrorState(
                        error = uiState.error!!,
                        onRetry = { viewModel.retry() }
                    )
                }
                uiState.query.isEmpty() -> {
                    EmptySearchState(
                        recentSearches = uiState.recentSearches,
                        onRecentSearchClick = { viewModel.onQueryChange(it) },
                        onClearHistory = { viewModel.clearSearchHistory() },
                        isTv = isTv
                    )
                }
                uiState.results.isEmpty() -> {
                    NoResultsState(query = uiState.query)
                }
                else -> {
                    SearchResults(
                        results = uiState.results,
                        onContentClick = onContentClick,
                        isTv = isTv
                    )
                }
            }
        }
    }
}

@Composable
private fun SearchHeader(
    query: String,
    onQueryChange: (String) -> Unit,
    onVoiceSearch: () -> Unit,
    onClear: () -> Unit,
    isTv: Boolean
) {
    var isFocused by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }

    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Search Field
        BasicTextField(
            value = query,
            onValueChange = onQueryChange,
            textStyle = TextStyle(
                color = Color.White,
                fontSize = if (isTv) MaterialTheme.typography.titleLarge.fontSize
                          else MaterialTheme.typography.bodyLarge.fontSize
            ),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { /* Search is automatic */ }),
            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
            singleLine = true,
            modifier = Modifier
                .weight(1f)
                .focusRequester(focusRequester)
                .onFocusChanged { isFocused = it.isFocused },
            decorationBox = { innerTextField ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            color = if (isFocused) SurfaceVariant.copy(alpha = 0.8f)
                                    else SurfaceVariant.copy(alpha = 0.5f),
                            shape = RoundedCornerShape(if (isTv) 12.dp else 8.dp)
                        )
                        .border(
                            width = if (isFocused) 2.dp else 0.dp,
                            color = if (isFocused) MaterialTheme.colorScheme.primary else Color.Transparent,
                            shape = RoundedCornerShape(if (isTv) 12.dp else 8.dp)
                        )
                        .padding(
                            horizontal = if (isTv) 24.dp else 16.dp,
                            vertical = if (isTv) 16.dp else 12.dp
                        ),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = if (isFocused) MaterialTheme.colorScheme.primary else OnSurfaceVariant,
                        modifier = Modifier.size(if (isTv) 28.dp else 24.dp)
                    )
                    Box(
                        modifier = Modifier
                            .padding(start = 12.dp)
                            .weight(1f)
                    ) {
                        if (query.isEmpty()) {
                            Text(
                                text = "Search movies, shows...",
                                style = if (isTv) MaterialTheme.typography.titleLarge
                                        else MaterialTheme.typography.bodyLarge,
                                color = OnSurfaceVariant.copy(alpha = 0.5f)
                            )
                        }
                        innerTextField()
                    }
                    if (query.isNotEmpty()) {
                        IconButton(onClick = onClear) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Clear",
                                tint = OnSurfaceVariant
                            )
                        }
                    }
                }
            }
        )

        // Voice Search Button (primarily for TV)
        if (isTv) {
            IconButton(
                onClick = onVoiceSearch,
                modifier = Modifier
                    .size(56.dp)
                    .background(
                        color = MaterialTheme.colorScheme.primary,
                        shape = CircleShape
                    )
            ) {
                Icon(
                    imageVector = Icons.Default.Mic,
                    contentDescription = "Voice Search",
                    tint = Color.White,
                    modifier = Modifier.size(28.dp)
                )
            }
        }
    }
}

@Composable
private fun FilterChipsRow(
    selectedType: String?,
    onTypeChange: (String?) -> Unit,
    selectedGenre: String?,
    onGenreChange: (String?) -> Unit,
    isTv: Boolean
) {
    val types = listOf("movie" to "Movies", "series" to "TV Shows")
    val genres = listOf(
        "action" to "Action",
        "comedy" to "Comedy",
        "drama" to "Drama",
        "horror" to "Horror",
        "sci-fi" to "Sci-Fi",
        "thriller" to "Thriller"
    )

    Column(
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Type filters
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item {
                FilterChip(
                    selected = selectedType == null,
                    onClick = { onTypeChange(null) },
                    label = { Text("All") },
                    modifier = if (isTv) Modifier.height(40.dp) else Modifier
                )
            }
            items(types) { (type, label) ->
                FilterChip(
                    selected = selectedType == type,
                    onClick = { onTypeChange(if (selectedType == type) null else type) },
                    label = { Text(label) },
                    modifier = if (isTv) Modifier.height(40.dp) else Modifier
                )
            }
        }

        // Genre filters
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(genres) { (genre, label) ->
                FilterChip(
                    selected = selectedGenre == genre,
                    onClick = { onGenreChange(if (selectedGenre == genre) null else genre) },
                    label = { Text(label) },
                    modifier = if (isTv) Modifier.height(40.dp) else Modifier
                )
            }
        }
    }
}

@Composable
private fun SearchResults(
    results: List<Meta>,
    onContentClick: (String) -> Unit,
    isTv: Boolean
) {
    val columns = if (isTv) GridCells.Fixed(6) else GridCells.Adaptive(minSize = 120.dp)
    val itemSpacing = if (isTv) 16.dp else 12.dp

    LazyVerticalGrid(
        columns = columns,
        contentPadding = PaddingValues(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(itemSpacing),
        horizontalArrangement = Arrangement.spacedBy(itemSpacing)
    ) {
        items(results) { meta ->
            SearchResultCard(
                meta = meta,
                onClick = { onContentClick(meta.id) },
                isTv = isTv
            )
        }
    }
}

@Composable
private fun SearchResultCard(
    meta: Meta,
    onClick: () -> Unit,
    isTv: Boolean
) {
    var isFocused by remember { mutableStateOf(false) }

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
                model = meta.posterUrl,
                contentDescription = meta.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Rating badge
            meta.rating?.let { rating ->
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
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
            text = meta.name,
            style = if (isTv) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.bodySmall,
            color = if (isFocused) Color.White else Color.White.copy(alpha = 0.8f),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            fontWeight = if (isFocused) FontWeight.Bold else FontWeight.Normal
        )

        meta.year?.let { year ->
            Text(
                text = year.toString(),
                style = MaterialTheme.typography.labelSmall,
                color = OnSurfaceVariant.copy(alpha = 0.7f)
            )
        }
    }
}

@Composable
private fun EmptySearchState(
    recentSearches: List<String>,
    onRecentSearchClick: (String) -> Unit,
    onClearHistory: () -> Unit,
    isTv: Boolean
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize()
    ) {
        if (recentSearches.isNotEmpty()) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Recent Searches",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                    TextButton(onClick = onClearHistory) {
                        Text("Clear All", color = OnSurfaceVariant)
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            items(recentSearches) { search ->
                RecentSearchItem(
                    query = search,
                    onClick = { onRecentSearchClick(search) },
                    isTv = isTv
                )
            }
        } else {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 48.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Search,
                            contentDescription = null,
                            tint = OnSurfaceVariant.copy(alpha = 0.5f),
                            modifier = Modifier.size(64.dp)
                        )
                        Text(
                            text = "Start typing to search",
                            style = MaterialTheme.typography.titleMedium,
                            color = OnSurfaceVariant.copy(alpha = 0.7f)
                        )
                        Text(
                            text = "Find movies, TV shows, and more",
                            style = MaterialTheme.typography.bodyMedium,
                            color = OnSurfaceVariant.copy(alpha = 0.5f)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun RecentSearchItem(
    query: String,
    onClick: () -> Unit,
    isTv: Boolean
) {
    var isFocused by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .onFocusChanged { isFocused = it.isFocused }
            .clickable { onClick() }
            .background(
                if (isFocused) SurfaceVariant.copy(alpha = 0.3f) else Color.Transparent,
                RoundedCornerShape(8.dp)
            )
            .padding(
                horizontal = if (isTv) 16.dp else 12.dp,
                vertical = if (isTv) 12.dp else 8.dp
            ),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.History,
            contentDescription = null,
            tint = OnSurfaceVariant
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = query,
            style = MaterialTheme.typography.bodyLarge,
            color = Color.White
        )
    }
}

@Composable
private fun NoResultsState(query: String) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Icon(
                imageVector = Icons.Default.SearchOff,
                contentDescription = null,
                tint = OnSurfaceVariant.copy(alpha = 0.5f),
                modifier = Modifier.size(64.dp)
            )
            Text(
                text = "No results found",
                style = MaterialTheme.typography.titleLarge,
                color = Color.White
            )
            Text(
                text = "No results for \"$query\"",
                style = MaterialTheme.typography.bodyMedium,
                color = OnSurfaceVariant.copy(alpha = 0.7f)
            )
            Text(
                text = "Try different keywords or check your filters",
                style = MaterialTheme.typography.bodySmall,
                color = OnSurfaceVariant.copy(alpha = 0.5f)
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
