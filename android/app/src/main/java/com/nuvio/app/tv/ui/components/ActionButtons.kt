package com.nuvio.app.tv.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun ActionButtons(
    onPlayClick: () -> Unit,
    onWatchlistClick: () -> Unit,
    onRateClick: () -> Unit,
    onShareClick: () -> Unit,
    isInWatchlist: Boolean = false,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Play button - primary action
        Button(
            onClick = onPlayClick,
            modifier = Modifier.height(56.dp)
        ) {
            Icon(
                imageVector = Icons.Default.PlayArrow,
                contentDescription = "Play"
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Watch Now")
        }

        // Watchlist button
        OutlinedButton(
            onClick = onWatchlistClick,
            modifier = Modifier.height(56.dp)
        ) {
            Icon(
                imageVector = if (isInWatchlist) Icons.Default.Check else Icons.Default.Add,
                contentDescription = if (isInWatchlist) "In Watchlist" else "Add to Watchlist"
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(if (isInWatchlist) "In Watchlist" else "Watchlist")
        }

        // Rate button
        IconButton(onClick = onRateClick) {
            Icon(
                imageVector = Icons.Default.Star,
                contentDescription = "Rate",
                tint = MaterialTheme.colorScheme.primary
            )
        }

        // Share button
        IconButton(onClick = onShareClick) {
            Icon(
                imageVector = Icons.Default.Share,
                contentDescription = "Share",
                tint = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}

@Composable
fun TvActionButtons(
    onPlayClick: () -> Unit,
    onWatchlistClick: () -> Unit,
    onRateClick: () -> Unit,
    onShareClick: () -> Unit,
    isInWatchlist: Boolean = false,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(24.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Play button - primary action with larger size for TV
        Button(
            onClick = onPlayClick,
            modifier = Modifier.height(64.dp)
        ) {
            Icon(
                imageVector = Icons.Default.PlayArrow,
                contentDescription = "Play",
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "Watch Now",
                style = MaterialTheme.typography.titleMedium
            )
        }

        // Watchlist button
        OutlinedButton(
            onClick = onWatchlistClick,
            modifier = Modifier.height(64.dp)
        ) {
            Icon(
                imageVector = if (isInWatchlist) Icons.Default.Check else Icons.Default.Add,
                contentDescription = if (isInWatchlist) "In Watchlist" else "Add to Watchlist",
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = if (isInWatchlist) "In Watchlist" else "Watchlist",
                style = MaterialTheme.typography.titleMedium
            )
        }

        // Rate button
        OutlinedButton(
            onClick = onRateClick,
            modifier = Modifier.height(64.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Star,
                contentDescription = "Rate",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "Rate",
                style = MaterialTheme.typography.titleMedium
            )
        }

        // Share button
        OutlinedButton(
            onClick = onShareClick,
            modifier = Modifier.height(64.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Share,
                contentDescription = "Share",
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "Share",
                style = MaterialTheme.typography.titleMedium
            )
        }
    }
}
