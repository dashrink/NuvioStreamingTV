package com.nuvio.app.tv.ui.details

import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.nuvio.app.tv.ui.components.*
import com.nuvio.app.tv.ui.theme.HeroGradient

@Composable
fun DetailsScreen(
    id: String,
    onPlayClick: (String) -> Unit,
    onBack: () -> Unit,
    viewModel: DetailsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val configuration = LocalConfiguration.current
    val isTv = configuration.uiMode and Configuration.UI_MODE_TYPE_MASK == Configuration.UI_MODE_TYPE_TELEVISION

    LaunchedEffect(id) {
        viewModel.loadDetails(id)
    }

    Box(modifier = Modifier.fillMaxSize()) {
        when {
            uiState.isLoading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center)
                )
            }
            uiState.error != null -> {
                ErrorView(
                    error = uiState.error ?: "Unknown error",
                    onRetry = { viewModel.loadDetails(id) },
                    onBack = onBack,
                    modifier = Modifier.align(Alignment.Center)
                )
            }
            uiState.meta != null -> {
                if (isTv) {
                    TvDetailsContent(
                        uiState = uiState,
                        onPlayClick = {
                            uiState.streams.firstOrNull()?.url?.let { url ->
                                onPlayClick(url)
                            }
                        },
                        onWatchlistClick = { viewModel.toggleWatchlist() },
                        onRateClick = { /* TODO: Show rating dialog */ },
                        onShareClick = { shareContent(context, uiState.meta!!) },
                        onBack = onBack
                    )
                } else {
                    MobileDetailsContent(
                        uiState = uiState,
                        onPlayClick = {
                            uiState.streams.firstOrNull()?.url?.let { url ->
                                onPlayClick(url)
                            }
                        },
                        onWatchlistClick = { viewModel.toggleWatchlist() },
                        onRateClick = { /* TODO: Show rating dialog */ },
                        onShareClick = { shareContent(context, uiState.meta!!) },
                        onBack = onBack
                    )
                }
            }
        }
    }
}

@Composable
fun TvDetailsContent(
    uiState: DetailsUiState,
    onPlayClick: () -> Unit,
    onWatchlistClick: () -> Unit,
    onRateClick: () -> Unit,
    onShareClick: () -> Unit,
    onBack: () -> Unit
) {
    val meta = uiState.meta ?: return

    Box(modifier = Modifier.fillMaxSize()) {
        // Background image with gradient
        AsyncImage(
            model = meta.backgroundUrl ?: meta.posterUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )

        // Gradient overlay
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = HeroGradient
                    )
                )
        )

        // Content
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(48.dp)
        ) {
            item {
                // Back button
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.Default.ArrowBack,
                        contentDescription = "Back",
                        tint = Color.White
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))
            }

            item {
                // Metadata info
                TvMetadataInfo(meta = meta)

                Spacer(modifier = Modifier.height(32.dp))
            }

            item {
                // Action buttons
                TvActionButtons(
                    onPlayClick = onPlayClick,
                    onWatchlistClick = onWatchlistClick,
                    onRateClick = onRateClick,
                    onShareClick = onShareClick,
                    isInWatchlist = uiState.isInWatchlist
                )

                Spacer(modifier = Modifier.height(48.dp))
            }

            item {
                // Cast and Crew
                CastCrewSection(
                    cast = meta.cast,
                    director = meta.director,
                    writer = meta.writer
                )
            }
        }
    }
}

@Composable
fun MobileDetailsContent(
    uiState: DetailsUiState,
    onPlayClick: () -> Unit,
    onWatchlistClick: () -> Unit,
    onRateClick: () -> Unit,
    onShareClick: () -> Unit,
    onBack: () -> Unit
) {
    val meta = uiState.meta ?: return

    Box(modifier = Modifier.fillMaxSize()) {
        // Background image with gradient
        AsyncImage(
            model = meta.backgroundUrl ?: meta.posterUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .height(400.dp)
        )

        // Gradient overlay on background
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(400.dp)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color(0x99000000),
                            MaterialTheme.colorScheme.background
                        )
                    )
                )
        )

        // Content
        LazyColumn(
            modifier = Modifier.fillMaxSize()
        ) {
            item {
                // Spacer for background image
                Spacer(modifier = Modifier.height(300.dp))
            }

            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.background)
                        .padding(24.dp)
                ) {
                    // Metadata info
                    MetadataInfo(meta = meta)

                    Spacer(modifier = Modifier.height(24.dp))

                    // Action buttons
                    ActionButtons(
                        onPlayClick = onPlayClick,
                        onWatchlistClick = onWatchlistClick,
                        onRateClick = onRateClick,
                        onShareClick = onShareClick,
                        isInWatchlist = uiState.isInWatchlist
                    )

                    Spacer(modifier = Modifier.height(32.dp))

                    // Cast and Crew
                    CastCrewSection(
                        cast = meta.cast,
                        director = meta.director,
                        writer = meta.writer
                    )

                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }

        // Back button overlay
        IconButton(
            onClick = onBack,
            modifier = Modifier
                .padding(16.dp)
                .background(
                    color = Color.Black.copy(alpha = 0.5f),
                    shape = RoundedCornerShape(50)
                )
        ) {
            Icon(
                imageVector = Icons.Default.ArrowBack,
                contentDescription = "Back",
                tint = Color.White
            )
        }
    }
}

@Composable
fun ErrorView(
    error: String,
    onRetry: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Error",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.error
        )

        Text(
            text = error,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface
        )

        Row(
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Button(onClick = onRetry) {
                Text("Retry")
            }

            OutlinedButton(onClick = onBack) {
                Text("Go Back")
            }
        }
    }
}

private fun shareContent(context: Context, meta: com.nuvio.app.tv.data.repository.Meta) {
    val shareText = buildString {
        append("Check out ${meta.name}")
        meta.year?.let { append(" ($it)") }
        append("\n\n")
        meta.description?.let { append(it) }
        meta.imdbId?.let { append("\n\nhttps://www.imdb.com/title/$it") }
    }

    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, shareText)
        putExtra(Intent.EXTRA_SUBJECT, meta.name)
    }

    context.startActivity(Intent.createChooser(intent, "Share ${meta.name}"))
}
